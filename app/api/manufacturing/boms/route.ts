import { NextResponse } from "next/server";
import { z } from "zod";
import { storage } from "@server/storage";
import { getSessionUserWithRecord } from "@app/api/_utils/session";

const bomComponentSchema = z.object({
  itemId: z.string(),
  sequence: z.number().int(),
  qtyPer: z.number().positive(),
  uom: z.enum(["EA", "FT", "YD", "ROLL"]),
  scrapFactor: z.number().min(0).max(100).default(0),
  isOptional: z.boolean().default(false),
  isPurchased: z.boolean().default(false),
  leadTimeOffset: z.number().int().default(0),
  issueMethod: z.enum(["MANUAL", "BACKFLUSH", "PREISSUE"]).default("BACKFLUSH"),
  notes: z.string().optional(),
  referenceDesignator: z.string().optional(),
});

const createBOMSchema = z.object({
  itemId: z.string(),
  bomNumber: z.string().min(1),
  version: z.number().int().default(1),
  description: z.string().optional(),
  baseQty: z.number().positive().default(1),
  baseUom: z.enum(["EA", "FT", "YD", "ROLL"]).default("EA"),
  effectiveFrom: z.string().optional(),
  effectiveTo: z.string().optional(),
  notes: z.string().optional(),
  components: z.array(bomComponentSchema).min(1),
});

export async function GET(req: Request) {
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const itemId = searchParams.get("itemId");

  let boms = await storage.getBOMsByTenant(session.user.tenantId);

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
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validatedData = createBOMSchema.parse(body);

    const bom = await storage.createBOM({
      tenantId: session.user.tenantId,
      itemId: validatedData.itemId,
      bomNumber: validatedData.bomNumber,
      version: validatedData.version,
      description: validatedData.description,
      baseQty: validatedData.baseQty,
      baseUom: validatedData.baseUom,
      effectiveFrom: validatedData.effectiveFrom
        ? new Date(validatedData.effectiveFrom)
        : new Date(),
      effectiveTo: validatedData.effectiveTo
        ? new Date(validatedData.effectiveTo)
        : null,
      notes: validatedData.notes,
      createdByUserId: session.user.id,
      components: {
        create: validatedData.components.map((comp) => ({
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

    await storage.createAuditEvent({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "CREATE",
      entityType: "BillOfMaterial",
      entityId: bom.id,
      details: `Created BOM ${bom.bomNumber} v${bom.version}`,
      ipAddress: null,
    });

    return NextResponse.json({ bom }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error creating BOM:", error);
    return NextResponse.json(
      { error: "Failed to create BOM" },
      { status: 500 }
    );
  }
}
