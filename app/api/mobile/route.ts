import { NextResponse } from "next/server";
import { requireAuth, handleApiError, validateBody, createAuditLog } from "@app/api/_utils/middleware";
import { MobileWarehouseService } from "@server/voice-mobile-warehouse";
import { z } from "zod";

export const dynamic = "force-dynamic";

const RegisterDeviceSchema = z.object({
  deviceId: z.string(),
  name: z.string(),
  type: z.enum(["HANDHELD", "TABLET", "PHONE", "WEARABLE"]),
  platform: z.enum(["IOS", "ANDROID", "WINDOWS"]),
  capabilities: z.array(z.string()),
  appVersion: z.string(),
});

const ScanSchema = z.object({
  scans: z.array(z.object({
    scanType: z.enum(["BARCODE", "QR", "RFID", "NFC"]),
    rawData: z.string(),
    deviceId: z.string(),
    timestamp: z.string(),
  })),
});

const PickConfirmSchema = z.object({
  pickId: z.string(),
  lineId: z.string(),
  deviceId: z.string(),
  quantityPicked: z.number().min(0),
  scannedBarcode: z.string(),
  lotNumber: z.string().optional(),
  serialNumber: z.string().optional(),
  location: z.string(),
});

const PutawayConfirmSchema = z.object({
  taskId: z.string(),
  deviceId: z.string(),
  quantity: z.number().min(0),
  location: z.string(),
  scannedLocationBarcode: z.string(),
  scannedItemBarcode: z.string(),
});

const CycleCountSchema = z.object({
  deviceId: z.string(),
  locationBarcode: z.string(),
  counts: z.array(z.object({
    itemBarcode: z.string(),
    quantity: z.number().min(0),
    lotNumber: z.string().optional(),
  })),
});

/**
 * Mobile Warehouse API
 *
 * GET /api/mobile/devices - Get registered devices
 * GET /api/mobile/pick-list - Get pick list for user
 * GET /api/mobile/putaway - Get putaway tasks
 * POST /api/mobile/device - Register device
 * POST /api/mobile/scan - Process barcode scans
 * POST /api/mobile/pick - Confirm pick
 * POST /api/mobile/putaway - Confirm putaway
 * POST /api/mobile/count - Perform cycle count
 * POST /api/mobile/sync - Sync offline transactions
 */

export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view") || "devices";
    const deviceId = searchParams.get("deviceId") || "";

    const service = new MobileWarehouseService(context.user.tenantId);

    if (view === "pick-list") {
      const pickList = await service.getMobilePickList({
        userId: context.user.id,
        deviceId,
        limit: parseInt(searchParams.get("limit") || "10"),
      });
      return NextResponse.json({ pickList });
    }

    if (view === "putaway") {
      const tasks = await service.getMobilePutawayTasks({
        userId: context.user.id,
        deviceId,
      });
      return NextResponse.json({ tasks });
    }

    if (view === "offline") {
      const pending = await service.getOfflinePending(deviceId);
      return NextResponse.json({ pending });
    }

    const devices = await service.getDevices();
    return NextResponse.json({ devices });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") || "device";

    const service = new MobileWarehouseService(context.user.tenantId);

    if (action === "device") {
      const body = await validateBody(req, RegisterDeviceSchema);
      if (body instanceof NextResponse) return body;

      const device = await service.registerDevice({
        deviceId: body.deviceId,
        name: body.name,
        type: body.type,
        platform: body.platform,
        capabilities: body.capabilities,
        appVersion: body.appVersion,
      });

      await createAuditLog(
        context,
        "REGISTER",
        "MobileDevice",
        device.id,
        `Registered ${body.type} device: ${body.name}`
      );

      return NextResponse.json({
        success: true,
        device,
      });
    }

    if (action === "scan") {
      const body = await validateBody(req, ScanSchema);
      if (body instanceof NextResponse) return body;

      const results = await service.processScans(
        body.scans.map((s) => ({
          ...s,
          timestamp: new Date(s.timestamp),
        }))
      );

      return NextResponse.json({
        success: true,
        results,
      });
    }

    if (action === "pick") {
      const body = await validateBody(req, PickConfirmSchema);
      if (body instanceof NextResponse) return body;

      const result = await service.confirmMobilePick({
        ...body,
        userId: context.user.id,
      });

      if (result.success) {
        await createAuditLog(
          context,
          "PICK",
          "MobilePick",
          body.pickId,
          `Picked ${body.quantityPicked} units from ${body.location}`
        );
      }

      return NextResponse.json(result);
    }

    if (action === "putaway") {
      const body = await validateBody(req, PutawayConfirmSchema);
      if (body instanceof NextResponse) return body;

      const result = await service.confirmMobilePutaway({
        ...body,
        userId: context.user.id,
      });

      if (result.success) {
        await createAuditLog(
          context,
          "PUTAWAY",
          "MobilePutaway",
          body.taskId,
          `Put away ${body.quantity} units to ${body.location}`
        );
      }

      return NextResponse.json(result);
    }

    if (action === "count") {
      const body = await validateBody(req, CycleCountSchema);
      if (body instanceof NextResponse) return body;

      const result = await service.performMobileCycleCount({
        ...body,
        userId: context.user.id,
      });

      await createAuditLog(
        context,
        "COUNT",
        "MobileCycleCount",
        body.locationBarcode,
        `Cycle count at ${body.locationBarcode}: ${body.counts.length} items`
      );

      return NextResponse.json(result);
    }

    if (action === "sync") {
      const body = await req.json();
      const result = await service.syncOfflineTransactions(body.deviceId);

      return NextResponse.json({
        success: true,
        ...result,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return handleApiError(error);
  }
}
