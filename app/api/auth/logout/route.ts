import { NextResponse } from "next/server";
import { audit } from "@server/audit";
import { clearSessionCookie, getSessionUserWithRecord } from "@app/api/_utils/session";

export async function POST() {
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await audit(
    session.user.tenantId,
    session.user.id,
    "LOGOUT",
    "Session",
    null,
    "User logged out",
  );

  clearSessionCookie();
  return NextResponse.json({ success: true });
}
