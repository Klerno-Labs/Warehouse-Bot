import { NextResponse } from "next/server";
import { storage } from "@server/storage";
import { requireAuth, validateBody, handleApiError, createAuditLog } from "@app/api/_utils/middleware";
import { createBOMSchema } from "@shared/manufacturing";

export async function GET(req: Request) {
  const context = await requireAuth();
  if (context instanceof NextResponse) return context;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const itemId = searchParams.get("itemId");

  let boms = await storage.getBOMsByTenant(context.user.tenantId);

  // Apply filters
  if (status) {
    boms = boms.filter((bom) => bom.status === status);
  }

  if (itemId) {
    boms = boms.filter((bom) => bom.itemId === itemId);
  }

  return NextResponse.json({ boms });
}

export async function POST(req: Request) {
  const context = await requireAuth();
  if (context instanceof NextResponse) return context;

  try {
    const data = await validateBody(req, createBOMSchema);
    if (data instanceof NextResponse) return data;

    const bom = await storage.createBOM({
      tenantId: context.user.tenantId,
      itemId: data.itemId,
      bomNumber: data.bomNumber,
      version: data.version,
      description: data.description,
      baseQty: data.baseQty,
      baseUom: data.baseUom,
      effectiveFrom: data.effectiveFrom
        ? new Date(data.effectiveFrom)
        : new Date(),
      effectiveTo: data.effectiveTo
        ? new Date(data.effectiveTo)
        : null,
      notes: data.notes,
      createdByUserId: context.user.id,
      components: {
        create: data.components.map((comp) => ({
          itemId: comp.itemId,
          sequence: comp.sequence,
          qtyPer: comp.qtyPer,
          uom: comp.uom,
          scrapFactor: comp.scrapFactor,
          isOptional: comp.isOptional,
          isPurchased: comp.isPurchased,
          leadTimeOffset: comp.leadTimeOffset,
          issueMethod: comp.issueMethod,
          notes: comp.notes,
          referenceDesignator: comp.referenceDesignator,
        })),
      },
    });

    await createAuditLog(
      context,
      "CREATE",
      "BillOfMaterial",
      bom.id,
      `Created BOM ${bom.bomNumber} v${bom.version}`
    );

    return NextResponse.json({ bom }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
