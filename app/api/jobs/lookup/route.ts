import { NextResponse } from "next/server";
import { requireAuth } from "@app/api/_utils/middleware";
import { storage } from "@server/storage";

export async function GET(request: Request) {
  const context = await requireAuth();
  if (context instanceof NextResponse) return context;

  const tenantId = context.user.tenantId;
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      { error: "Job code is required" },
      { status: 400 }
    );
  }

  try {
    // Look up production order by order number
    const orders = await storage.getProductionOrdersByTenant(tenantId);
    const job = orders.find(o => o.orderNumber === code);

    if (!job) {
      return NextResponse.json(
        { error: "Job not found", message: `No job found with code: ${code}` },
        { status: 404 }
      );
    }

    // Get additional details
    const [item, customer] = await Promise.all([
      job.itemId ? storage.getItemById(job.itemId) : null,
      job.customerId ? storage.getCustomerById(job.customerId) : null,
    ]);

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        orderNumber: job.orderNumber,
        itemName: item?.name || job.itemName,
        itemSKU: item?.sku,
        qtyOrdered: job.qtyOrdered,
        qtyCompleted: job.qtyCompleted,
        priority: job.priority,
        dueDate: job.scheduledEnd,
        customerName: customer?.name,
        status: job.status,
      },
    });
  } catch (error) {
    console.error("Job lookup error:", error);
    return NextResponse.json(
      { error: "Failed to lookup job" },
      { status: 500 }
    );
  }
}
