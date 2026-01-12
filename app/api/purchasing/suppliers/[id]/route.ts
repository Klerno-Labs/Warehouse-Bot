import { NextResponse } from "next/server";
import { z } from "zod";
import { storage } from "@server/storage";
import { getSessionUserWithRecord } from "@app/api/_utils/session";

const updateSupplierSchema = z.object({
  code: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
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
  isActive: z.boolean().optional(),
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

  const supplier = await storage.getSupplierById(params.id);
  if (!supplier || supplier.tenantId !== session.user.tenantId) {
    return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
  }

  return NextResponse.json({ supplier });
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
    const existing = await storage.getSupplierById(params.id);
    if (!existing || existing.tenantId !== session.user.tenantId) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    const body = await req.json();
    const validatedData = updateSupplierSchema.parse(body);

    const supplier = await storage.updateSupplier(params.id, {
      ...validatedData,
      email: validatedData.email === "" ? null : validatedData.email,
    });

    await storage.createAuditEvent({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "UPDATE",
      entityType: "Supplier",
      entityId: supplier.id,
      details: `Updated supplier: ${supplier.name}`,
      ipAddress: null,
    });

    return NextResponse.json({ supplier });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Error updating supplier:", error);
    return NextResponse.json(
      { error: "Failed to update supplier" },
      { status: 500 }
    );
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
    const supplier = await storage.getSupplierById(params.id);
    if (!supplier || supplier.tenantId !== session.user.tenantId) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    await storage.deleteSupplier(params.id);

    await storage.createAuditEvent({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "DELETE",
      entityType: "Supplier",
      entityId: params.id,
      details: `Deleted supplier: ${supplier.name}`,
      ipAddress: null,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting supplier:", error);
    return NextResponse.json(
      { error: "Failed to delete supplier" },
      { status: 500 }
    );
  }
}
