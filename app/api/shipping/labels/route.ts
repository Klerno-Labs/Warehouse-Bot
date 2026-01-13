import { NextResponse } from "next/server";
import { requireAuth, requireRole, handleApiError, validateBody, createAuditLog } from "@app/api/_utils/middleware";
import { ShippingCarrierService } from "@server/shipping-carriers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const AddressSchema = z.object({
  name: z.string(),
  company: z.string().optional(),
  street1: z.string(),
  street2: z.string().optional(),
  city: z.string(),
  state: z.string(),
  postalCode: z.string(),
  country: z.string().default("US"),
  phone: z.string().optional(),
  email: z.string().optional(),
});

const CreateLabelSchema = z.object({
  carrier: z.enum(["UPS", "FEDEX", "USPS", "DHL"]),
  serviceCode: z.string(),
  origin: AddressSchema,
  destination: AddressSchema,
  packages: z.array(z.object({
    weight: z.number().positive(),
    weightUnit: z.enum(["lb", "oz", "kg", "g"]).default("lb"),
    length: z.number().positive(),
    width: z.number().positive(),
    height: z.number().positive(),
    dimensionUnit: z.enum(["in", "cm"]).default("in"),
  })),
  orderId: z.string().optional(),
  shipmentId: z.string().optional(),
  reference: z.string().optional(),
  labelFormat: z.enum(["PDF", "ZPL", "PNG"]).default("PDF"),
});

const BatchLabelsSchema = z.object({
  shipments: z.array(CreateLabelSchema),
});

/**
 * Shipping Labels API
 *
 * POST /api/shipping/labels - Create shipping label
 * POST /api/shipping/labels/batch - Create batch of labels
 * GET /api/shipping/labels/:trackingNumber - Get label by tracking number
 */

export async function POST(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin", "Supervisor", "Inventory", "Operator"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const body = await validateBody(req, CreateLabelSchema);
    if (body instanceof NextResponse) return body;

    const service = new ShippingCarrierService(context.user.tenantId);

    const label = await service.createLabel({
      carrier: body.carrier,
      serviceCode: body.serviceCode,
      origin: body.origin,
      destination: body.destination,
      packages: body.packages,
      reference: body.reference,
      labelFormat: body.labelFormat,
    });

    await createAuditLog(
      context,
      "CREATE",
      "ShippingLabel",
      label.trackingNumber,
      `Created ${body.carrier} label for ${body.destination.city}, ${body.destination.state}`
    );

    return NextResponse.json({
      label,
      message: `Label created: ${label.trackingNumber}`,
    }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin", "Supervisor", "Inventory"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const body = await validateBody(req, BatchLabelsSchema);
    if (body instanceof NextResponse) return body;

    const service = new ShippingCarrierService(context.user.tenantId);

    const results = await service.createBatchLabels(body.shipments);

    await createAuditLog(
      context,
      "CREATE_BATCH",
      "ShippingLabel",
      `batch-${Date.now()}`,
      `Created batch of ${results.labels.length} labels`
    );

    return NextResponse.json({
      labels: results.labels,
      errors: results.errors,
      successCount: results.labels.length,
      errorCount: results.errors.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
