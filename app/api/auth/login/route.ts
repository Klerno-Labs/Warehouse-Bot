import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { loginSchema } from "@shared/validation";
import { storage } from "@server/storage";
import { audit } from "@server/audit";
import { setSessionCookie } from "@app/api/_utils/session";
import { z } from "zod";

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

export async function POST(req: Request) {
  try {
    const payload = loginSchema.parse(await req.json());
    const user = await storage.getUserByEmail(payload.email);
    if (!user || !bcrypt.compareSync(payload.password, user.password)) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    if (!user.isActive) {
      return NextResponse.json({ error: "Account is deactivated" }, { status: 403 });
    }

    setSessionCookie(user.id);
    const sessionUser = await storage.getSessionUser(user.id);
    const sites = await storage.getSitesForUser(user.id);

    await audit(
      user.tenantId,
      user.id,
      "LOGIN",
      "Session",
      null,
      "User logged in successfully",
    );

    return NextResponse.json({ user: sessionUser, sites });
  } catch (error) {
    console.error("Login error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.issues }, { status: 400 });
    }
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Internal server error", details: errorMessage }, { status: 500 });
  }
}
