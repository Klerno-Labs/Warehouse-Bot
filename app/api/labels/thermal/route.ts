import { NextRequest, NextResponse } from "next/server";
import { getSessionUserWithRecord } from "@app/api/_utils/session";
import { 
  labelService, 
  LabelPrintService,
  PRINTER_PRESETS,
  type ItemLabel,
  type LocationLabel,
  type ShippingLabel,
  type QRLabelData,
} from "@server/label-service";
import { z } from "zod";

// Label type schemas
const ItemLabelSchema = z.object({
  type: z.literal("item"),
  data: z.object({
    sku: z.string(),
    name: z.string(),
    description: z.string().optional(),
    barcode: z.string(),
    barcodeType: z.enum(["CODE128", "CODE39", "EAN13", "QR"]).optional(),
    location: z.string().optional(),
    uom: z.string().optional(),
    lotNumber: z.string().optional(),
    expiryDate: z.string().optional(),
  }),
  copies: z.number().min(1).max(100).default(1),
});

const LocationLabelSchema = z.object({
  type: z.literal("location"),
  data: z.object({
    locationCode: z.string(),
    zone: z.string().optional(),
    aisle: z.string().optional(),
    rack: z.string().optional(),
    level: z.string().optional(),
    barcode: z.string(),
  }),
  copies: z.number().min(1).max(100).default(1),
});

const ShippingLabelSchema = z.object({
  type: z.literal("shipping"),
  data: z.object({
    shipmentNumber: z.string(),
    orderNumber: z.string(),
    carrier: z.string(),
    trackingNumber: z.string(),
    shipTo: z.object({
      name: z.string(),
      address1: z.string(),
      address2: z.string().optional(),
      city: z.string(),
      state: z.string(),
      zip: z.string(),
      country: z.string().optional(),
    }),
    weight: z.number().optional(),
    packageCount: z.string().optional(),
  }),
  copies: z.number().min(1).max(100).default(1),
});

const QRLabelSchema = z.object({
  type: z.literal("qr"),
  data: z.object({
    content: z.string(),
    title: z.string().optional(),
    subtitle: z.string().optional(),
  }),
  copies: z.number().min(1).max(100).default(1),
});

const BatchLabelSchema = z.object({
  type: z.literal("batch"),
  labels: z.array(z.object({
    sku: z.string(),
    name: z.string(),
    barcode: z.string(),
    description: z.string().optional(),
    location: z.string().optional(),
    uom: z.string().optional(),
  })),
  copies: z.number().min(1).max(10).default(1),
});

const LabelRequestSchema = z.object({
  format: z.enum(["tspl", "zpl"]).default("tspl"),
  printer: z.string().optional(),
}).and(
  z.discriminatedUnion("type", [
    ItemLabelSchema,
    LocationLabelSchema,
    ShippingLabelSchema,
    QRLabelSchema,
    BatchLabelSchema,
  ])
);

/**
 * POST /api/labels/thermal
 * Generate thermal label commands (TSPL/ZPL) for direct printer output
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionUserWithRecord();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = LabelRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { format, printer, type } = parsed.data;
    const copies = 'copies' in parsed.data ? parsed.data.copies ?? 1 : 1;

    // Get printer preset name (defaults to TSC_TDP244)
    const printerPresetKey = printer && printer in PRINTER_PRESETS ? printer : "TSC_TDP244";
    const service = new LabelPrintService(printerPresetKey as keyof typeof PRINTER_PRESETS);

    let commands: string;

    switch (type) {
      case "item": {
        const itemData = parsed.data.data as ItemLabel;
        commands = service.generateItemLabel(itemData, format, copies);
        break;
      }
      case "location": {
        const locationData = parsed.data.data as LocationLabel;
        commands = service.generateLocationLabel(locationData, format, copies);
        break;
      }
      case "shipping": {
        const shippingData = parsed.data.data as ShippingLabel;
        commands = service.generateShippingLabel(shippingData, format, copies);
        break;
      }
      case "qr": {
        const qrData = parsed.data.data as QRLabelData;
        commands = service.generateQRLabel(qrData, copies);
        break;
      }
      case "batch": {
        const items = parsed.data.labels.map(item => ({
          ...item,
          barcode: item.barcode || item.sku,
        }));
        commands = service.generateBatchItemLabels(items as ItemLabel[], format);
        break;
      }
      default:
        return NextResponse.json({ error: "Unknown label type" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      format,
      commands,
      printInstructions: format === "tspl" 
        ? "Send commands to TSC printer via USB or network (port 9100)"
        : "Send commands to Zebra printer via USB or network (port 9100)",
    });
  } catch (error) {
    console.error("Thermal label generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate thermal label" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/labels/thermal
 * Get available thermal printer presets
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionUserWithRecord();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const presets = Object.entries(PRINTER_PRESETS).map(([name, config]) => ({
      name,
      type: config.type,
      dpi: config.dpi,
      labelSize: `${config.widthMm}mm x ${config.heightMm}mm`,
    }));

    return NextResponse.json({
      presets,
      defaultPreset: "TSC_TDP244",
      supportedFormats: ["tspl", "zpl"],
    });
  } catch (error) {
    console.error("Error fetching thermal presets:", error);
    return NextResponse.json(
      { error: "Failed to fetch presets" },
      { status: 500 }
    );
  }
}
