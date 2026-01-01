import { NextResponse } from "next/server";
import { prisma } from "@server/prisma";
import { getSessionUser } from "@app/api/_utils/session";

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const locations = await prisma.location.findMany({
    orderBy: { code: "asc" },
  });

  return NextResponse.json({ locations });
}
