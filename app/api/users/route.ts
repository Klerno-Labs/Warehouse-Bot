import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { storage } from "@server/storage";
import { audit } from "@server/audit";
import { getSessionUserWithRecord } from "@app/api/_utils/session";

export async function GET(req: NextRequest) {
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["Admin", "Supervisor", "Executive", "SuperAdmin"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const withoutBadge = searchParams.get('withoutBadge') === 'true';

  let users;
  if (withoutBadge) {
    // Get users without active badges (for badge assignment UI)
    const allUsers = await storage.getUsersByTenant(session.user.tenantId);
    const usersWithBadges = await storage.prisma.badge.findMany({
      where: {
        tenantId: session.user.tenantId,
        isActive: true,
      },
      select: {
        userId: true,
      },
    });
    const userIdsWithBadges = new Set(usersWithBadges.map(b => b.userId));
    users = allUsers.filter(u => !userIdsWithBadges.has(u.id));
  } else {
    users = await storage.getUsersByTenant(session.user.tenantId);
  }

  const sanitized = users.map(({ password, ...u }) => u);
  return NextResponse.json({ users: sanitized });
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
    assignedDepartments: [],
    assignedWorkcells: [],
    customRoleId: null,
    isSuperAdmin: false,
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
