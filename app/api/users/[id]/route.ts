import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { storage } from "@server/storage";
import { audit } from "@server/audit";
import { getSessionUserWithRecord } from "@app/api/_utils/session";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "Admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const targetUser = await storage.getUser(params.id);
  if (!targetUser || targetUser.tenantId !== session.user.tenantId) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const updates = await req.json();
  delete updates.id;
  delete updates.tenantId;
  if (updates.password) {
    updates.password = await bcrypt.hash(updates.password, 10);
  }

  const updated = await storage.updateUser(params.id, updates);

  await audit(
    session.user.tenantId,
    session.user.id,
    "UPDATE",
    "User",
    params.id,
    `Updated user ${targetUser.email}`,
  );

  if (!updated) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const { password: _, ...sanitized } = updated;
  return NextResponse.json(sanitized);
}
