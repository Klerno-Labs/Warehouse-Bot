import { NextResponse } from "next/server";
import { requireAuth, handleApiError, validateBody, createAuditLog } from "@app/api/_utils/middleware";
import { TransferService } from "@server/transfer-wave-planning";
import { z } from "zod";

export const dynamic = "force-dynamic";

const CreateTransferSchema = z.object({
  sourceWarehouseId: z.string(),
  destinationWarehouseId: z.string(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  requestedDeliveryDate: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(z.object({
    itemId: z.string(),
    itemSku: z.string(),
    quantity: z.number().min(1),
    lotNumber: z.string().optional(),
    serialNumbers: z.array(z.string()).optional(),
  })),
});

const ShipTransferSchema = z.object({
  transferId: z.string(),
  carrierId: z.string(),
  trackingNumber: z.string().optional(),
  estimatedArrival: z.string().optional(),
  containerDetails: z.object({
    containerId: z.string().optional(),
    sealNumber: z.string().optional(),
    temperature: z.number().optional(),
  }).optional(),
});

const ReceiveTransferSchema = z.object({
  transferId: z.string(),
  lines: z.array(z.object({
    lineId: z.string(),
    quantityReceived: z.number().min(0),
    quantityDamaged: z.number().min(0).default(0),
    destinationLocationId: z.string(),
    notes: z.string().optional(),
  })),
});

/**
 * Transfer Management API
 *
 * GET /api/transfers - Get transfer orders
 * GET /api/transfers?view=in-transit - Get in-transit inventory
 * GET /api/transfers?id=xxx - Get specific transfer
 * POST /api/transfers - Create transfer order
 * POST /api/transfers?action=approve - Approve transfer
 * POST /api/transfers?action=ship - Ship transfer
 * POST /api/transfers?action=receive - Receive transfer
 */

export async function GET(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view");
    const id = searchParams.get("id");
    const status = searchParams.get("status");
    const sourceWarehouseId = searchParams.get("sourceWarehouseId");
    const destinationWarehouseId = searchParams.get("destinationWarehouseId");

    const service = new TransferService(context.user.tenantId);

    if (id) {
      const transfer = await service.getTransferOrder(id);
      return NextResponse.json({ transfer });
    }

    if (view === "in-transit") {
      const inventory = await service.getInTransitInventory({
        sourceWarehouseId: sourceWarehouseId || undefined,
        destinationWarehouseId: destinationWarehouseId || undefined,
      });
      return NextResponse.json({ inventory });
    }

    if (view === "dashboard") {
      const dashboard = await service.getTransferDashboard();
      return NextResponse.json({ dashboard });
    }

    const transfers = await service.getTransferOrders({
      status: status as any || undefined,
      sourceWarehouseId: sourceWarehouseId || undefined,
      destinationWarehouseId: destinationWarehouseId || undefined,
    });
    return NextResponse.json({ transfers });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    const service = new TransferService(context.user.tenantId);

    if (action === "approve") {
      const body = await req.json();
      const transfer = await service.approveTransfer(body.transferId, context.user.id);

      await createAuditLog(
        context,
        "APPROVE",
        "TransferOrder",
        body.transferId,
        `Approved transfer ${transfer.transferNumber}`
      );

      return NextResponse.json({ success: true, transfer });
    }

    if (action === "ship") {
      const body = await validateBody(req, ShipTransferSchema);
      if (body instanceof NextResponse) return body;

      const transfer = await service.shipTransfer({
        ...body,
        shippedBy: context.user.id,
        estimatedArrival: body.estimatedArrival ? new Date(body.estimatedArrival) : undefined,
      });

      await createAuditLog(
        context,
        "SHIP",
        "TransferOrder",
        body.transferId,
        `Shipped transfer with tracking ${body.trackingNumber || "N/A"}`
      );

      return NextResponse.json({ success: true, transfer });
    }

    if (action === "receive") {
      const body = await validateBody(req, ReceiveTransferSchema);
      if (body instanceof NextResponse) return body;

      const transfer = await service.receiveTransfer({
        ...body,
        receivedBy: context.user.id,
      });

      await createAuditLog(
        context,
        "RECEIVE",
        "TransferOrder",
        body.transferId,
        `Received transfer order`
      );

      return NextResponse.json({ success: true, transfer });
    }

    if (action === "cancel") {
      const body = await req.json();
      const transfer = await service.cancelTransfer(body.transferId, body.reason);

      await createAuditLog(
        context,
        "CANCEL",
        "TransferOrder",
        body.transferId,
        `Cancelled transfer: ${body.reason}`
      );

      return NextResponse.json({ success: true, transfer });
    }

    // Create new transfer
    const body = await validateBody(req, CreateTransferSchema);
    if (body instanceof NextResponse) return body;

    const transfer = await service.createTransferOrder({
      ...body,
      requestedDeliveryDate: body.requestedDeliveryDate ? new Date(body.requestedDeliveryDate) : undefined,
      createdBy: context.user.id,
    });

    await createAuditLog(
      context,
      "CREATE",
      "TransferOrder",
      transfer.id,
      `Created transfer ${transfer.transferNumber} from ${body.sourceWarehouseId} to ${body.destinationWarehouseId}`
    );

    return NextResponse.json({
      success: true,
      transfer,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
