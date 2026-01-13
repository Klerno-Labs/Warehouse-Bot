import { NextResponse } from "next/server";
import { requireAuth, requireRole, handleApiError, validateBody } from "@app/api/_utils/middleware";
import { ShippingCarrierService, AddressValidationService } from "@server/shipping-carriers";
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

const GetRatesSchema = z.object({
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
  carriers: z.array(z.enum(["UPS", "FEDEX", "USPS", "DHL"])).optional(),
});

/**
 * Shipping Rates API
 *
 * POST /api/shipping/rates - Get shipping rates from multiple carriers
 */

export async function POST(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const roleCheck = requireRole(context, ["Admin", "Supervisor", "Inventory", "Operator"]);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const body = await validateBody(req, GetRatesSchema);
    if (body instanceof NextResponse) return body;

    const service = new ShippingCarrierService(context.user.tenantId);

    const rates = await service.getRates({
      origin: body.origin,
      destination: body.destination,
      packages: body.packages,
      carriers: body.carriers,
    });

    // Sort by price (cheapest first)
    const sortedRates = rates.sort((a, b) => a.totalPrice - b.totalPrice);

    return NextResponse.json({
      rates: sortedRates,
      cheapest: sortedRates[0] || null,
      fastest: rates.reduce((f, r) =>
        (r.estimatedDays < f.estimatedDays) ? r : f, rates[0]) || null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
