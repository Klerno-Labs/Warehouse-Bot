import { NextResponse } from "next/server";
import { audit } from "@server/audit";
import { clearSessionCookie } from "@app/api/_utils/session";
import { requireAuth } from "@app/api/_utils/middleware";

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
  const context = await requireAuth();
  if (context instanceof NextResponse) return context;

  await audit(
    context.user.tenantId,
    context.user.id,
    "LOGOUT",
    "Session",
    null,
    "User logged out",
  );

  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
