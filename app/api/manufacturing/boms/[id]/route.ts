import { NextResponse } from "next/server";
import { z } from "zod";
import { storage } from "@server/storage";
import { getSessionUserWithRecord } from "@app/api/_utils/session";

const updateBOMSchema = z.object({
  description: z.string().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "INACTIVE", "SUPERSEDED"]).optional(),
  effectiveFrom: z.string().optional(),
  effectiveTo: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bom = await storage.getBOMById(params.id);
  if (!bom || bom.tenantId !== session.user.tenantId) {
    return NextResponse.json({ error: "BOM not found" }, { status: 404 });
  }

  return NextResponse.json({ bom });
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const existing = await storage.getBOMById(params.id);
    if (!existing || existing.tenantId !== session.user.tenantId) {
      return NextResponse.json({ error: "BOM not found" }, { status: 404 });
    }

    // Cannot edit ACTIVE or SUPERSEDED BOMs
    if (existing.status === "ACTIVE" || existing.status === "SUPERSEDED") {
      return NextResponse.json(
        { error: "Cannot edit ACTIVE or SUPERSEDED BOMs. Create a new version instead." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const validatedData = updateBOMSchema.parse(body);

    const updateData: any = {};

    if (validatedData.description !== undefined) {
      updateData.description = validatedData.description;
    }

    if (validatedData.status) {
      updateData.status = validatedData.status;
      if (validatedData.status === "ACTIVE") {
        updateData.approvedByUserId = session.user.id;
        updateData.approvedAt = new Date();
      }
    }

    if (validatedData.effectiveFrom) {
      updateData.effectiveFrom = new Date(validatedData.effectiveFrom);
    }

    if (validatedData.effectiveTo) {
      updateData.effectiveTo = new Date(validatedData.effectiveTo);
    }

    if (validatedData.notes !== undefined) {
      updateData.notes = validatedData.notes;
    }

    const bom = await storage.updateBOM(params.id, updateData);

    await storage.createAuditEvent({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "UPDATE",
      entityType: "BillOfMaterial",
      entityId: bom.id,
      details: `Updated BOM ${bom.bomNumber} v${bom.version}`,
      ipAddress: null,
    });

    return NextResponse.json({ bom });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error updating BOM:", error);
    return NextResponse.json({ error: "Failed to update BOM" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const bom = await storage.getBOMById(params.id);
    if (!bom || bom.tenantId !== session.user.tenantId) {
      return NextResponse.json({ error: "BOM not found" }, { status: 404 });
    }

    // Only allow deletion of DRAFT BOMs
    if (bom.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Can only delete DRAFT BOMs" },
        { status: 400 }
      );
    }

    // Check if BOM has production orders
    if (bom._count && bom._count.productionOrders > 0) {
      return NextResponse.json(
        { error: "Cannot delete BOM with existing production orders" },
        { status: 400 }
      );
    }

    await storage.deleteBOM(params.id);

    await storage.createAuditEvent({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "DELETE",
      entityType: "BillOfMaterial",
      entityId: params.id,
      details: `Deleted BOM ${bom.bomNumber} v${bom.version}`,
      ipAddress: null,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting BOM:", error);
    return NextResponse.json({ error: "Failed to delete BOM" }, { status: 500 });
  }
}
