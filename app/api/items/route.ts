import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@server/prisma";
import { getSessionUser } from "@app/api/_utils/session";

const conversionSchema = z.object({
  fromUomId: z.string().min(1),
  toUomId: z.string().min(1),
  factor: z.number().positive(),
});

const itemSchema = z.object({
  sku: z.string().min(1).optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  photoUrl: z.string().url().optional(),
  specs: z.any().optional(),
  baseUomId: z.string().min(1),
  defaultLocationId: z.string().min(1).optional(),
  conversions: z.array(conversionSchema).optional(),
});

function generatePublicCode() {
  return crypto.randomBytes(6).toString("base64url");
}

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const items = await prisma.item.findMany({
    orderBy: { name: "asc" },
    include: {
      baseUom: true,
      defaultLocation: true,
    },
  });

  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (session.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const payload = itemSchema.parse(await req.json());
    if (payload.sku) {
      const existing = await prisma.item.findUnique({ where: { sku: payload.sku } });
      if (existing) {
        return NextResponse.json({ error: "SKU already exists" }, { status: 409 });
      }
    }

    const publicCode = generatePublicCode();
    const item = await prisma.item.create({
      data: {
        publicCode,
        sku: payload.sku || null,
        name: payload.name,
        description: payload.description || null,
        photoUrl: payload.photoUrl || null,
        specs: payload.specs ?? undefined,
        baseUomId: payload.baseUomId,
        defaultLocationId: payload.defaultLocationId || null,
      },
    });

    if (payload.conversions?.length) {
      await prisma.itemUomConversion.createMany({
        data: payload.conversions.map((conversion) => ({
          itemId: item.id,
          fromUomId: conversion.fromUomId,
          toUomId: conversion.toUomId,
          factor: conversion.factor,
        })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create item" }, { status: 500 });
  }
}
