import { NextRequest, NextResponse } from "next/server";
import { getSessionUserWithRecord } from "@app/api/_utils/session";
import { 
  ScannerService,
  createAMLScanner,
  createScannerFromPreset,
  SCANNER_PRESETS,
  AML_SCANNER_PRESETS,
} from "@server/scanner-service";
import { z } from "zod";

const ParseBarcodeSchema = z.object({
  barcode: z.string().min(1),
  scannerPreset: z.string().optional(),
});

const BatchParseSchema = z.object({
  barcodes: z.array(z.string().min(1)),
  scannerPreset: z.string().optional(),
});

/**
 * POST /api/scanner/parse
 * Parse a barcode and identify its type and data
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUserWithRecord();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    // Check if batch parse
    const batchParsed = BatchParseSchema.safeParse(body);
    if (batchParsed.success) {
      const { barcodes, scannerPreset } = batchParsed.data;
      const scanner = scannerPreset 
        ? createScannerFromPreset(scannerPreset)
        : createAMLScanner();

      const results = barcodes.map(barcode => {
        const scanEvent = scanner.processScan(barcode);
        const parsed = scanner.parseScanData(scanEvent.cleanData);
        return {
          raw: barcode,
          clean: scanEvent.cleanData,
          symbology: scanEvent.symbology,
          type: parsed.type,
          identifier: parsed.identifier,
          gs1Data: parsed.gs1Data,
        };
      });

      return NextResponse.json({
        success: true,
        count: results.length,
        results,
      });
    }

    // Single barcode parse
    const parsed = ParseBarcodeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { barcode, scannerPreset } = parsed.data;
    const scanner = scannerPreset 
      ? createScannerFromPreset(scannerPreset)
      : createAMLScanner();

    const scanEvent = scanner.processScan(barcode);
    const parsedData = scanner.parseScanData(scanEvent.cleanData);

    return NextResponse.json({
      success: true,
      raw: barcode,
      clean: scanEvent.cleanData,
      symbology: scanEvent.symbology,
      type: parsedData.type,
      identifier: parsedData.identifier,
      gs1Data: parsedData.gs1Data,
    });
  } catch (error) {
    console.error("Scanner parse error:", error);
    return NextResponse.json(
      { error: "Failed to parse barcode" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/scanner/presets
 * Get available scanner presets
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionUserWithRecord();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const amlPresets = Object.entries(AML_SCANNER_PRESETS).map(([name, config]) => ({
      name,
      type: config.type,
      connectionMode: config.connectionMode,
      symbologies: config.enabledSymbologies,
      dbaCompatible: true,
    }));

    const otherPresets = Object.entries(SCANNER_PRESETS)
      .filter(([name]) => !name.startsWith('AML_'))
      .map(([name, config]) => ({
        name,
        type: config.type,
        connectionMode: config.connectionMode,
        symbologies: config.enabledSymbologies,
        dbaCompatible: false,
      }));

    return NextResponse.json({
      amlPresets,
      otherPresets,
      defaultPreset: "AML_M7225",
      supportedTypes: ["ITEM", "JOB", "LOCATION", "LOT", "SERIAL", "PO", "SHIPMENT"],
    });
  } catch (error) {
    console.error("Error fetching scanner presets:", error);
    return NextResponse.json(
      { error: "Failed to fetch presets" },
      { status: 500 }
    );
  }
}
