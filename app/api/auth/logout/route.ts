import { NextResponse } from "next/server";
import { audit } from "@server/audit";
import { clearSessionCookie, getSessionUserWithRecord } from "@app/api/_utils/session";

// Handle CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
    },
  });
}

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

  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
