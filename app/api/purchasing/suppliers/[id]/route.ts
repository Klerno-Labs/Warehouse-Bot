import { NextResponse } from "next/server";
import { z } from "zod";
import { storage } from "@server/storage";
import { requireAuth, requireTenantResource, handleApiError, validateBody, createAuditLog } from "@app/api/_utils/middleware";

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
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const rawSupplier = await storage.getSupplierById(params.id);
    const supplier = await requireTenantResource(context, rawSupplier, "Supplier");
    if (supplier instanceof NextResponse) return supplier;

    return NextResponse.json({ supplier });
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

    const existing = await storage.getSupplierById(params.id);
    const validatedExisting = await requireTenantResource(context, existing, "Supplier");
    if (validatedExisting instanceof NextResponse) return validatedExisting;

    const validatedData = await validateBody(req, updateSupplierSchema);
    if (validatedData instanceof NextResponse) return validatedData;

    const supplier = await storage.updateSupplier(params.id, {
      ...validatedData,
      email: validatedData.email === "" ? null : validatedData.email,
    });

    await createAuditLog(
      context,
      "UPDATE",
      "Supplier",
      supplier.id,
      `Updated supplier: ${supplier.name}`
    );

    return NextResponse.json({ supplier });
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

    const rawSupplier = await storage.getSupplierById(params.id);
    const supplier = await requireTenantResource(context, rawSupplier, "Supplier");
    if (supplier instanceof NextResponse) return supplier;

    await storage.deleteSupplier(params.id);

    await createAuditLog(
      context,
      "DELETE",
      "Supplier",
      params.id,
      `Deleted supplier: ${supplier.name}`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
