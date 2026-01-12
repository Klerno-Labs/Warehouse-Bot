import { NextResponse } from "next/server";
import { requireAuth, requireRole, handleApiError, validateBody, createAuditLog } from "@app/api/_utils/middleware";
import { EDIService } from "@server/edi-service";
import { z } from "zod";

export const dynamic = "force-dynamic";

const CreatePartnerSchema = z.object({
  name: z.string(),
  isaId: z.string(),
  gsId: z.string(),
  qualifierId: z.string().default("ZZ"),
  testMode: z.boolean().default(true),
  supportedDocuments: z.array(z.enum(["850", "856", "810", "997"])),
  ftpConfig: z.object({
    host: z.string(),
    port: z.number().default(21),
    username: z.string(),
    password: z.string(),
    directory: z.string().default("/"),
    useSFTP: z.boolean().default(true),
  }).optional(),
  as2Config: z.object({
    as2Id: z.string(),
    partnerAs2Id: z.string(),
    url: z.string(),
    certificate: z.string(),
  }).optional(),
});

const UpdatePartnerSchema = CreatePartnerSchema.partial().extend({
  id: z.string(),
});

/**
 * EDI Trading Partners API
 *
 * GET /api/edi/trading-partners - List trading partners
 * POST /api/edi/trading-partners - Create trading partner
 * PUT /api/edi/trading-partners - Update trading partner
 * DELETE /api/edi/trading-partners?id=xxx - Delete trading partner
 */

export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    const service = new EDIService(context.user.tenantId);

    if (id) {
      const partner = await service.getTradingPartner(id);
      if (!partner) {
        return NextResponse.json({ error: "Trading partner not found" }, { status: 404 });
      }
      return NextResponse.json({ partner });
    }

    const partners = await service.getTradingPartners();
    return NextResponse.json({ partners });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const body = await validateBody(req, CreatePartnerSchema);
    if (body instanceof NextResponse) return body;

    const service = new EDIService(context.user.tenantId);
    const partner = await service.createTradingPartner(body);

    await createAuditLog(
      context,
      "CREATE",
      "TradingPartner",
      partner.id,
      `Created trading partner ${body.name}`
    );

    return NextResponse.json({ partner }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const body = await validateBody(req, UpdatePartnerSchema);
    if (body instanceof NextResponse) return body;

    const service = new EDIService(context.user.tenantId);
    const partner = await service.updateTradingPartner(body.id, body);

    await createAuditLog(
      context,
      "UPDATE",
      "TradingPartner",
      body.id,
      `Updated trading partner`
    );

    return NextResponse.json({ partner });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const service = new EDIService(context.user.tenantId);
    await service.deleteTradingPartner(id);

    await createAuditLog(
      context,
      "DELETE",
      "TradingPartner",
      id,
      `Deleted trading partner`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
