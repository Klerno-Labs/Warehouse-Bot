import { NextResponse } from "next/server";
import { z } from "zod";
import { storage } from "@server/storage";
import { getSessionUserWithRecord } from "@app/api/_utils/session";

const createSupplierSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  contactName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  paymentTerms: z.string().optional(),
  leadTimeDays: z.number().int().optional(),
  notes: z.string().optional(),
});

export async function GET(req: Request) {
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.toLowerCase() || "";
  const activeOnly = searchParams.get("activeOnly") === "true";

  let suppliers = await storage.getSuppliersByTenant(session.user.tenantId);

  // Apply filters
  if (search) {
    suppliers = suppliers.filter(
      (supplier) =>
        supplier.code.toLowerCase().includes(search) ||
        supplier.name.toLowerCase().includes(search) ||
        supplier.contactName?.toLowerCase().includes(search)
    );
  }

  if (activeOnly) {
    suppliers = suppliers.filter((supplier) => supplier.isActive);
  }

  return NextResponse.json({ suppliers });
}

export async function POST(req: Request) {
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validatedData = createSupplierSchema.parse(body);

    const supplier = await storage.createSupplier({
      tenantId: session.user.tenantId,
      ...validatedData,
      email: validatedData.email || null,
    });

    await storage.createAuditEvent({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "CREATE",
      entityType: "Supplier",
      entityId: supplier.id,
      details: `Created supplier: ${supplier.name}`,
      ipAddress: null,
    });

    return NextResponse.json({ supplier }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Error creating supplier:", error);
    return NextResponse.json(
      { error: "Failed to create supplier" },
      { status: 500 }
    );
  }
}
