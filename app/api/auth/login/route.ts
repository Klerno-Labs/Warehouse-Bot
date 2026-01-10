import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { loginSchema } from "@shared/validation";
import { storage } from "@server/storage";
import { audit } from "@server/audit";
import { setSessionCookie } from "@app/api/_utils/session";
import { logger } from "@server/logger";
import { z } from "zod";

// Get allowed origin from environment or use same-origin by default
function getAllowedOrigin(requestOrigin: string | null): string {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [];
  // In development, allow localhost origins
  if (process.env.NODE_ENV === "development") {
    allowedOrigins.push("http://localhost:3000", "http://127.0.0.1:3000");
  }
  // Only return the origin if it's in the allowed list
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }
  // Default to same-origin (no CORS header)
  return "";
}

// Handle CORS preflight requests
export async function OPTIONS(req: Request) {
  const origin = req.headers.get("origin");
  const allowedOrigin = getAllowedOrigin(origin);

  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };

  // Only add CORS headers if origin is allowed
  if (allowedOrigin) {
    headers["Access-Control-Allow-Origin"] = allowedOrigin;
    headers["Access-Control-Allow-Credentials"] = "true";
  }

  return new NextResponse(null, { status: 200, headers });
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
    logger.error("Login error", error as Error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 });
    }
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Internal server error", details: errorMessage }, { status: 500 });
  }
}
