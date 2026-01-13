import { NextResponse } from "next/server";
import { storage } from "@server/storage";
import { requireAuth, validateBody, handleApiError, createAuditLog } from "@app/api/_utils/middleware";
import { createSupplierSchema } from "@shared/purchasing";

export async function GET(req: Request) {
  const context = await requireAuth();
  if (context instanceof NextResponse) return context;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.toLowerCase() || "";
  const activeOnly = searchParams.get("activeOnly") === "true";

  let suppliers = await storage.getSuppliersByTenant(context.user.tenantId);

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
  const context = await requireAuth();
  if (context instanceof NextResponse) return context;

  try {
    const data = await validateBody(req, createSupplierSchema);
    if (data instanceof NextResponse) return data;

    const supplier = await storage.createSupplier({
      tenantId: context.user.tenantId,
      ...data,
      email: data.email || null,
    });

    await createAuditLog(
      context,
      "CREATE",
      "Supplier",
      supplier.id,
      `Created supplier: ${supplier.name}`
    );

    return NextResponse.json({ supplier }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
