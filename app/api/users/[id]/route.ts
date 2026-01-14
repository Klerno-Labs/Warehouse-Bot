import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { storage } from "@server/storage";
import { audit } from "@server/audit";
import { requireAuth, requireRole, requireTenantResource, handleApiError } from "@app/api/_utils/middleware";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const targetUser = await storage.getUser(id);
    const userCheck = await requireTenantResource(context, targetUser, "User");
    if (userCheck instanceof NextResponse) return userCheck;

    const updates = await req.json();
    delete updates.id;
    delete updates.tenantId;
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    const updated = await storage.updateUser(id, updates);

    await audit(
      context.user.tenantId,
      context.user.id,
      "UPDATE",
      "User",
      id,
      `Updated user ${targetUser.email}`,
    );

    if (!updated) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const { password: _, ...sanitized } = updated;
    return NextResponse.json(sanitized);
  } catch (error) {
    return handleApiError(error);
  }
}
