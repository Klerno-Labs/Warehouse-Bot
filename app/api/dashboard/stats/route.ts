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
  const jobs = await storage.getJobsByTenant(tenantId);
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

  // Get low stock items (items with balance below reorderPointBase)
  const lowStockItems = items.filter((item) => {
    if (!item.reorderPointBase) return false;
    const itemBalance = balances
      .filter((b) => b.itemId === item.id)
      .reduce((sum, b) => sum + b.qtyBase, 0);
    return itemBalance <= item.reorderPointBase;
  });

  // Recent activity (from audit log)
  const recentActivity = auditEvents.map((event) => ({
    id: event.id,
    action: event.details || event.action,
    user: "System", // Could enhance to look up user name
    time: formatTimeAgo(event.timestamp),
    type: event.action === "CREATE" ? "success" : event.action === "ALERT" ? "warning" : "info",
  }));

  // Calculate job stats
  const activeJobs = jobs.filter((j) => j.status === "PENDING" || j.status === "IN_PROGRESS").length;
  const completedTodayJobs = jobs.filter(
    (j) => j.status === "COMPLETED" && j.completedAt && new Date(j.completedAt) >= today
  ).length;

  // Calculate last 7 days transaction trends
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    date.setHours(0, 0, 0, 0);
    return date;
  });

  const transactionsByDay = last7Days.map((date) => {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    const dayEvents = events.filter((e) => {
      const eventDate = new Date(e.createdAt);
      return eventDate >= date && eventDate < nextDay;
    });

    const receives = dayEvents.filter((e) => e.eventType === "RECEIVE").length;
    const moves = dayEvents.filter((e) => e.eventType === "MOVE").length;
    const adjustments = dayEvents.filter((e) => e.eventType === "ADJUST").length;

    return {
      date: date.toISOString().split("T")[0],
      label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      receives,
      moves,
      adjustments,
      total: dayEvents.length,
    };
  });

  return NextResponse.json({
    stats: {
      activeJobs,
      inventoryItems: totalItems,
      pendingOrders: 0, // Placeholder until Purchasing module is built
      completedToday: todayEvents.length,
      completedTodayJobs,
      lowStockCount: lowStockItems.length,
      totalBalanceQty: Math.round(totalBalanceQty),
    },
    recentActivity,
    lowStockItems: lowStockItems.slice(0, 10).map((item) => {
      const itemBalance = balances
        .filter((b) => b.itemId === item.id)
        .reduce((sum, b) => sum + b.qtyBase, 0);
      return {
        id: item.id,
        sku: item.sku,
        name: item.name,
        currentStock: itemBalance,
        reorderPoint: item.reorderPointBase,
      };
    }),
    alerts: lowStockItems.slice(0, 5).map((item) => ({
      title: "Low Stock Alert",
      description: `${item.name} is below reorder threshold`,
      severity: "warning",
    })),
    transactionsByDay,
  });
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}
