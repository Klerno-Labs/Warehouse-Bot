import { NextResponse } from "next/server";
import { storage } from "@server/storage";
import { requireAuth, requireRole, requireTenantResource, handleApiError, validateBody, createAuditLog } from "@app/api/_utils/middleware";
import { updateItemSchema } from "@shared/inventory";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin", "Supervisor", "Inventory"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const item = await storage.getItemById(params.id);
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const tenantCheck = await requireTenantResource(context, item);
    if (tenantCheck instanceof NextResponse) return tenantCheck;

    const payload = await validateBody(req, updateItemSchema);
    if (payload instanceof NextResponse) return payload;

    if (payload.sku) {
      const existing = await storage.getItemBySku(context.user.tenantId, payload.sku);
      if (existing && existing.id !== item.id) {
        return NextResponse.json({ error: "SKU already exists" }, { status: 409 });
      }
    }

    const updated = await storage.updateItem(item.id, payload);

    // Audit log for cost updates
    if (payload.costBase !== undefined || payload.avgCostBase !== undefined || payload.lastCostBase !== undefined) {
      await createAuditLog(
        context,
        "UPDATE",
        "Item",
        item.id,
        `Updated costs for ${item.sku}: standard=${payload.costBase}, avg=${payload.avgCostBase}, last=${payload.lastCostBase}`
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
