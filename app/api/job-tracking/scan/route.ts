import { NextResponse } from "next/server";
import { z } from "zod";
import { storage } from "@server/storage";
import { prisma } from "@server/prisma";
import { requireAuth, handleApiError, validateBody } from "@app/api/_utils/middleware";

const scanSchema = z.object({
  qrCode: z.string().min(1),
  scanType: z.enum(["START", "PAUSE", "RESUME", "COMPLETE", "SKIP"]),
  department: z.enum([
    "PICKING",
    "ASSEMBLY",
    "PLEATING",
    "OVEN",
    "LASER",
    "QC",
    "PACKAGING",
    "SHIPPING",
  ]),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const validatedData = await validateBody(req, scanSchema);
    if (validatedData instanceof NextResponse) return validatedData;

    // Find production order by order number (QR code)
    const productionOrder = await prisma.productionOrder.findFirst({
      where: {
        tenantId: context.user.tenantId,
        orderNumber: validatedData.qrCode,
      },
      include: {
        item: true,
      },
    });

    if (!productionOrder) {
      return NextResponse.json(
        { error: `Job ${validatedData.qrCode} not found` },
        { status: 404 }
      );
    }

    // Find or create job operation for this department
    let operation = await prisma.jobOperation.findFirst({
      where: {
        productionOrderId: productionOrder.id,
        department: validatedData.department,
        status: {
          in: ["PENDING", "IN_PROGRESS", "PAUSED"],
        },
      },
      orderBy: {
        sequence: "asc",
      },
    });

    const now = new Date();

    // Handle different scan types
    switch (validatedData.scanType) {
      case "START":
        if (!operation) {
          // Create new operation if none exists
          const maxSeq = await prisma.jobOperation.findFirst({
            where: { productionOrderId: productionOrder.id },
            orderBy: { sequence: "desc" },
            select: { sequence: true },
          });

          operation = await prisma.jobOperation.create({
            data: {
              productionOrderId: productionOrder.id,
              sequence: (maxSeq?.sequence || 0) + 1,
              department: validatedData.department,
              operationName: validatedData.department.replace("_", " "),
              status: "IN_PROGRESS",
              assignedTo: context.user.name,
              actualStart: now,
            },
          });
        } else if (operation.status === "PENDING") {
          // Start pending operation
          operation = await prisma.jobOperation.update({
            where: { id: operation.id },
            data: {
              status: "IN_PROGRESS",
              assignedTo: context.user.name,
              actualStart: now,
            },
          });
        } else {
          return NextResponse.json(
            { error: "Operation already in progress" },
            { status: 400 }
          );
        }
        break;

      case "PAUSE":
        if (!operation || operation.status !== "IN_PROGRESS") {
          return NextResponse.json(
            { error: "No active operation to pause" },
            { status: 400 }
          );
        }

        operation = await prisma.jobOperation.update({
          where: { id: operation.id },
          data: { status: "PAUSED" },
        });
        break;

      case "RESUME":
        if (!operation || operation.status !== "PAUSED") {
          return NextResponse.json(
            { error: "No paused operation to resume" },
            { status: 400 }
          );
        }

        operation = await prisma.jobOperation.update({
          where: { id: operation.id },
          data: { status: "IN_PROGRESS" },
        });
        break;

      case "COMPLETE":
        if (!operation) {
          return NextResponse.json(
            { error: "No operation found to complete" },
            { status: 404 }
          );
        }

        operation = await prisma.jobOperation.update({
          where: { id: operation.id },
          data: {
            status: "COMPLETED",
            actualEnd: now,
          },
        });

        // Check if all operations are complete
        const allOps = await prisma.jobOperation.findMany({
          where: { productionOrderId: productionOrder.id },
        });

        const allComplete = allOps.every((op) => op.status === "COMPLETED" || op.status === "SKIPPED");

        if (allComplete && productionOrder.status !== "COMPLETED") {
          // Update production order status
          await prisma.productionOrder.update({
            where: { id: productionOrder.id },
            data: {
              status: "COMPLETED",
              actualEnd: now,
            },
          });
        }
        break;

      case "SKIP":
        if (!operation) {
          return NextResponse.json(
            { error: "No operation found to skip" },
            { status: 404 }
          );
        }

        operation = await prisma.jobOperation.update({
          where: { id: operation.id },
          data: { status: "SKIPPED" },
        });
        break;
    }

    // Create scan event
    const scanEvent = await prisma.operationScanEvent.create({
      data: {
        jobOperationId: operation.id,
        productionOrderId: productionOrder.id,
        scanType: validatedData.scanType,
        scannedBy: context.user.name,
        scannedAt: now,
        department: validatedData.department,
        notes: validatedData.notes,
      },
    });

    // Create audit log
    await storage.createAuditEvent({
      tenantId: context.user.tenantId,
      userId: context.user.id,
      action: "UPDATE",
      entityType: "JobOperation",
      entityId: operation.id,
      details: `${validatedData.scanType} operation for ${productionOrder.orderNumber} in ${validatedData.department}`,
      ipAddress: null,
    });

    return NextResponse.json({
      success: true,
      message: `Job ${productionOrder.orderNumber} - ${validatedData.scanType.toLowerCase()} in ${validatedData.department}`,
      operation,
      scanEvent,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
