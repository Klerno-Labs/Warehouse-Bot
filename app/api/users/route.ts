import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { storage } from "@server/storage";
import { audit } from "@server/audit";
import { getSessionUserWithRecord } from "@app/api/_utils/session";

export async function GET() {
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["Admin", "Supervisor"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await storage.getUsersByTenant(session.user.tenantId);
  const sanitized = users.map(({ password, ...u }) => u);
  return NextResponse.json(sanitized);
}

export async function POST(req: Request) {
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "Admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { email, password, firstName, lastName, role, siteIds } = await req.json();
  const existing = await storage.getUserByEmail(email);
  if (existing) {
    return NextResponse.json({ error: "Email already exists" }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await storage.createUser({
    tenantId: session.user.tenantId,
    email,
    password: hashedPassword,
    firstName,
    lastName,
    role: role || "Viewer",
    siteIds: siteIds || [],
    isActive: true,
  });

  await audit(
    session.user.tenantId,
    session.user.id,
    "CREATE",
    "User",
    newUser.id,
    `Created user ${newUser.email}`,
  );

  const { password: _, ...sanitized } = newUser;
  return NextResponse.json(sanitized, { status: 201 });
}
