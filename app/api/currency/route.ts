import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, handleApiError, validateBody } from "@app/api/_utils/middleware";
import { CurrencyService, CurrencyUtils, CURRENCIES, CurrencyCode } from "@server/currency";

/**
 * Currency API
 *
 * Provides currency conversion, exchange rates, and formatting
 *
 * GET /api/currency
 * - List all supported currencies
 *
 * GET /api/currency/rates?from=USD&to=EUR,GBP,CAD
 * - Get exchange rates
 *
 * POST /api/currency/convert
 * - Convert amount between currencies
 */

const convertSchema = z.object({
  amount: z.number().positive(),
  from: z.string(),
  to: z.string(),
  format: z.boolean().optional(), // Return formatted string instead of number
  locale: z.string().optional(),
});

// Get supported currencies
export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const toParam = searchParams.get("to"); // Can be comma-separated list

    // If no params, return list of all currencies
    if (!from || !toParam) {
      const currencies = CurrencyService.getSupportedCurrencies();
      return NextResponse.json({
        currencies: currencies.map((c) => ({
          code: c.code,
          name: c.name,
          symbol: c.symbol,
          decimals: c.decimals,
        })),
        cacheSize: CurrencyService.getCacheSize(),
      });
    }

    // Get exchange rates
    if (!CurrencyUtils.isValid(from)) {
      return NextResponse.json({ error: "Invalid source currency" }, { status: 400 });
    }

    const toCurrencies = toParam.split(",").map((c) => c.trim());
    const invalidCurrencies = toCurrencies.filter((c) => !CurrencyUtils.isValid(c));

    if (invalidCurrencies.length > 0) {
      return NextResponse.json(
        { error: `Invalid target currencies: ${invalidCurrencies.join(", ")}` },
        { status: 400 }
      );
    }

    // Fetch rates
    const rates: Record<string, number> = {};
    for (const to of toCurrencies) {
      rates[to] = await CurrencyService.getExchangeRate(from as CurrencyCode, to as CurrencyCode);
    }

    return NextResponse.json({
      base: from,
      rates,
      date: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// Convert amount between currencies
export async function POST(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const validatedData = await validateBody(req, convertSchema);
    if (validatedData instanceof NextResponse) return validatedData;

    const { amount, from, to, format, locale } = validatedData;

    // Validate currency codes
    if (!CurrencyUtils.isValid(from)) {
      return NextResponse.json({ error: "Invalid source currency" }, { status: 400 });
    }

    if (!CurrencyUtils.isValid(to)) {
      return NextResponse.json({ error: "Invalid target currency" }, { status: 400 });
    }

    const converted = await CurrencyService.convert(
      amount,
      from as CurrencyCode,
      to as CurrencyCode
    );

    if (format) {
      const formatted = CurrencyService.format(converted, to as CurrencyCode, locale);
      return NextResponse.json({
        amount,
        from,
        to,
        result: converted,
        formatted,
        rate: await CurrencyService.getExchangeRate(from as CurrencyCode, to as CurrencyCode),
      });
    }

    return NextResponse.json({
      amount,
      from,
      to,
      result: converted,
      rate: await CurrencyService.getExchangeRate(from as CurrencyCode, to as CurrencyCode),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// Clear exchange rate cache (admin only)
export async function DELETE(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    if (context.user.role !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    CurrencyService.clearCache();

    return NextResponse.json({
      success: true,
      message: "Exchange rate cache cleared",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
