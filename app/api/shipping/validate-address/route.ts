import { NextResponse } from "next/server";
import { requireAuth, handleApiError, validateBody } from "@app/api/_utils/middleware";
import { AddressValidationService } from "@server/shipping-carriers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const AddressSchema = z.object({
  name: z.string().optional(),
  company: z.string().optional(),
  street1: z.string(),
  street2: z.string().optional(),
  city: z.string(),
  state: z.string(),
  postalCode: z.string(),
  country: z.string().default("US"),
});

/**
 * Address Validation API
 *
 * POST /api/shipping/validate-address - Validate and standardize address
 */

export async function POST(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const body = await validateBody(req, AddressSchema);
    if (body instanceof NextResponse) return body;

    const service = new AddressValidationService();
    const result = await service.validateAddress(body);

    return NextResponse.json({
      valid: result.isValid,
      original: body,
      standardized: result.standardizedAddress,
      suggestions: result.suggestions,
      warnings: result.warnings,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
