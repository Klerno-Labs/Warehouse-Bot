import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { storage } from "@server/storage";
import { audit } from "@server/audit";
import { requireAuth, requireRole, handleApiError } from "@app/api/_utils/middleware";

export async function GET() {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin", "Supervisor"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const users = await storage.getUsersByTenant(context.user.tenantId);
    const sanitized = users.map(({ password, ...u }) => u);
    return NextResponse.json(sanitized);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const { email, password, firstName, lastName, role, siteIds } = await req.json();
    const existing = await storage.getUserByEmail(email);
    if (existing) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await storage.createUser({
      tenantId: context.user.tenantId,
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: role || "Viewer",
      siteIds: siteIds || [],
      isActive: true,
    });

    await audit(
      context.user.tenantId,
      context.user.id,
      "CREATE",
      "User",
      newUser.id,
      `Created user ${newUser.email}`,
    );

    const { password: _, ...sanitized } = newUser;
    return NextResponse.json(sanitized, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
