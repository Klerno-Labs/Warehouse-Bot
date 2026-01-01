import { NextResponse } from "next/server";
import { storage } from "@server/storage";
import { getSessionUserWithRecord } from "@app/api/_utils/session";

export async function GET() {
  const session = await getSessionUserWithRecord();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tenantId, siteIds } = session.user;
  const primarySiteId = siteIds[0];

  // Get inventory stats
  const items = await storage.getItemsByTenant(tenantId);
  const balances = primarySiteId
    ? await storage.getInventoryBalancesBySite(primarySiteId)
    : [];
  const events = await storage.getInventoryEventsByTenant(tenantId);
  const auditEvents = await storage.getAuditEvents(tenantId, 10);

  // Calculate stats
  const totalItems = items.length;
  const totalBalanceQty = balances.reduce((sum, b) => sum + b.qtyBase, 0);
  
  // Get today's events
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEvents = events.filter(
    (e) => new Date(e.createdAt) >= today
  );

  // Get low stock items (items with balance below minQtyBase)
  const lowStockItems = items.filter((item) => {
    if (!item.minQtyBase) return false;
    const itemBalance = balances
      .filter((b) => b.itemId === item.id)
      .reduce((sum, b) => sum + b.qtyBase, 0);
    return itemBalance < item.minQtyBase;
  });

  // Recent activity (from audit log)
  const recentActivity = auditEvents.map((event) => ({
    id: event.id,
    action: event.details || event.action,
    user: "System", // Could enhance to look up user name
    time: formatTimeAgo(event.timestamp),
    type: event.action === "CREATE" ? "success" : event.action === "ALERT" ? "warning" : "info",
  }));

  return NextResponse.json({
    stats: {
      activeJobs: 0, // Placeholder until Jobs module is built
      inventoryItems: totalItems,
      pendingOrders: 0, // Placeholder until Purchasing module is built
      completedToday: todayEvents.length,
      lowStockCount: lowStockItems.length,
      totalBalanceQty: Math.round(totalBalanceQty),
    },
    recentActivity,
    alerts: lowStockItems.slice(0, 5).map((item) => ({
      title: "Low Stock Alert",
      description: `${item.name} is below minimum threshold`,
      severity: "warning",
    })),
  });
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}
