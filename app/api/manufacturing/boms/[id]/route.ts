import { NextResponse } from "next/server";
import { z } from "zod";
import { storage } from "@server/storage";
import { requireAuth, requireTenantResource, handleApiError, validateBody, createAuditLog } from "@app/api/_utils/middleware";

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
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const rawBom = await storage.getBOMById(params.id);
    const bom = await requireTenantResource(context, rawBom, "BOM");
    if (bom instanceof NextResponse) return bom;

    return NextResponse.json({ bom });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const existing = await storage.getBOMById(params.id);
    const validatedExisting = await requireTenantResource(context, existing, "BOM");
    if (validatedExisting instanceof NextResponse) return validatedExisting;

    // Cannot edit ACTIVE or SUPERSEDED BOMs
    if (validatedExisting.status === "ACTIVE" || validatedExisting.status === "SUPERSEDED") {
      return NextResponse.json(
        { error: "Cannot edit ACTIVE or SUPERSEDED BOMs. Create a new version instead." },
        { status: 400 }
      );
    }

    const validatedData = await validateBody(req, updateBOMSchema);
    if (validatedData instanceof NextResponse) return validatedData;

    const updateData: any = {};

    if (validatedData.description !== undefined) {
      updateData.description = validatedData.description;
    }

    if (validatedData.status) {
      updateData.status = validatedData.status;
      if (validatedData.status === "ACTIVE") {
        updateData.approvedByUserId = context.user.id;
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

    await createAuditLog(
      context,
      "UPDATE",
      "BillOfMaterial",
      bom.id,
      `Updated BOM ${bom.bomNumber} v${bom.version}`
    );

    return NextResponse.json({ bom });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const rawBom = await storage.getBOMById(params.id);
    const bom = await requireTenantResource(context, rawBom, "BOM");
    if (bom instanceof NextResponse) return bom;

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

    await createAuditLog(
      context,
      "DELETE",
      "BillOfMaterial",
      params.id,
      `Deleted BOM ${bom.bomNumber} v${bom.version}`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
