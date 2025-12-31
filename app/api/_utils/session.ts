import { cookies } from "next/headers";
import crypto from "crypto";
import { storage } from "@server/storage";
import type { SessionUser } from "@shared/schema";

const COOKIE_NAME = "wb_session";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

type SessionPayload = {
  userId: string;
  exp: number;
};

function sign(payload: SessionPayload, secret: string) {
  const json = JSON.stringify(payload);
  const data = Buffer.from(json).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${signature}`;
}

function verify(token: string, secret: string): SessionPayload | null {
  const [data, signature] = token.split(".");
  if (!data || !signature) return null;
  const expected = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  const json = Buffer.from(data, "base64url").toString("utf-8");
  const payload = JSON.parse(json) as SessionPayload;
  if (!payload.userId || Date.now() > payload.exp) return null;
  return payload;
}

function getSecret() {
  return process.env.SESSION_SECRET || "warehouse-core-dev-secret";
}

export function setSessionCookie(userId: string) {
  const payload: SessionPayload = { userId, exp: Date.now() + SESSION_TTL_MS };
  const token = sign(payload, getSecret());
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_MS / 1000,
    path: "/",
  });
}

export function clearSessionCookie() {
  cookies().set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verify(token, getSecret());
  if (!payload) return null;
  return storage.getSessionUser(payload.userId);
}

export async function getSessionUserWithRecord() {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verify(token, getSecret());
  if (!payload) return null;
  const user = await storage.getUser(payload.userId);
  if (!user) return null;
  const sessionUser = await storage.getSessionUser(payload.userId);
  if (!sessionUser) return null;
  return { user, sessionUser };
}
