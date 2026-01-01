import { NextResponse } from "next/server";
import { prisma } from "@server/prisma";
import { getSessionUser } from "@app/api/_utils/session";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const item = await prisma.item.findUnique({
    where: { id: params.id },
    include: {
      baseUom: true,
      defaultLocation: true,
      conversions: {
        include: {
          fromUom: true,
          toUom: true,
        },
      },
      balances: {
        include: {
          location: true,
        },
      },
    },
  });

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  return NextResponse.json({ item });
}
