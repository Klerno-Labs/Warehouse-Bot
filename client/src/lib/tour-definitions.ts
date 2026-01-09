/**
 * Interactive tour definitions for key pages
 * These tours help new users understand how to use the application
 */

import { TourStep } from "@/components/onboarding/interactive-tour";

export const TOURS: Record<string, TourStep[]> = {
  dashboard: [
    {
      target: "[data-tour='suggested-actions']",
      title: "What Should I Do Next?",
      description:
        "This AI-powered widget analyzes your operations and recommends the most important tasks. It's your personal assistant telling you what needs attention.",
      placement: "bottom",
    },
    {
      target: "[data-tour='metrics']",
      title: "Key Metrics at a Glance",
      description:
        "Monitor your inventory health, stock value, and items at risk. Click any metric to dive deeper into the details.",
      placement: "bottom",
    },
    {
      target: "[data-tour='quick-tasks']",
      title: "Quick Actions",
      description:
        "Access common tasks instantly. You can even use keyboard shortcuts (shown on hover) to navigate faster.",
      placement: "top",
    },
    {
      target: "[data-tour='alerts']",
      title: "Items Needing Attention",
      description:
        "Out of stock and low stock items are highlighted here. Click to see the full list and take action.",
      placement: "left",
    },
  ],

  inventory: [
    {
      target: "[data-tour='search']",
      title: "Search Your Inventory",
      description:
        "Find items quickly by SKU, name, or category. Use filters to narrow down to specific items like low stock or out of stock.",
      placement: "bottom",
    },
    {
      target: "[data-tour='filters']",
      title: "Smart Filters",
      description:
        "Filter by status, category, location, or custom criteria. Save your frequently used filters for quick access.",
      placement: "bottom",
    },
    {
      target: "[data-tour='actions']",
      title: "Inventory Actions",
      description:
        "Perform transactions like Receive, Move, Adjust, or Issue inventory. Always use reason codes when adjusting counts.",
      placement: "left",
    },
    {
      target: "[data-tour='item-row']",
      title: "Item Details",
      description:
        "Click any item to see full details, current balances by location, transaction history, and more.",
      placement: "top",
    },
  ],

  cycleCount: [
    {
      target: "[data-tour='create-count']",
      title: "Create Cycle Count",
      description:
        "Start a new cycle count to verify inventory accuracy. You can create manual counts or use AI recommendations.",
      placement: "bottom",
    },
    {
      target: "[data-tour='ai-analyzer']",
      title: "AI-Powered Recommendations",
      description:
        "Let AI decide which items need counting based on value, activity, variance history, and time since last count.",
      placement: "bottom",
    },
    {
      target: "[data-tour='count-list']",
      title: "Active Cycle Counts",
      description:
        "View all pending, in-progress, and completed cycle counts. Click to enter counted quantities and review variances.",
      placement: "top",
    },
  ],

  aiCycleCount: [
    {
      target: "[data-tour='strategy']",
      title: "Choose Counting Strategy",
      description:
        "ABC focuses on high-value items, High Risk on problem items, Random gives statistical sampling, and All ranks everything.",
      placement: "bottom",
    },
    {
      target: "[data-tour='max-items']",
      title: "Set Item Count",
      description:
        "Choose how many items to count based on available time. The system shows estimated duration to help you plan.",
      placement: "bottom",
    },
    {
      target: "[data-tour='analyze-button']",
      title: "Run AI Analysis",
      description:
        "Click to analyze your entire inventory and get intelligent recommendations on what to count.",
      placement: "bottom",
    },
    {
      target: "[data-tour='recommendations']",
      title: "Review Recommendations",
      description:
        "Each item shows priority score, risk factors, and why it was selected. Select items you want to include in your count.",
      placement: "top",
    },
  ],

  inventoryAssistant: [
    {
      target: "[data-tour='item-selector']",
      title: "Select Item",
      description:
        "Choose the item with the discrepancy. The assistant will analyze recent transactions to find the cause.",
      placement: "bottom",
    },
    {
      target: "[data-tour='quantities']",
      title: "Enter Quantities",
      description:
        "Expected is what the system shows, Actual is what you physically counted. The variance will be calculated automatically.",
      placement: "bottom",
    },
    {
      target: "[data-tour='analyze']",
      title: "Analyze Discrepancy",
      description:
        "AI will examine production usage, shipments, receipts, transfers, and more to identify the likely cause.",
      placement: "bottom",
    },
    {
      target: "[data-tour='causes']",
      title: "Possible Causes",
      description:
        "Review ranked causes with evidence from actual transactions. Each cause shows likelihood and specific data to investigate.",
      placement: "top",
    },
    {
      target: "[data-tour='next-steps']",
      title: "Recommended Actions",
      description:
        "Follow these steps to resolve the issue. Fix the root cause, not just the symptom, to prevent future problems.",
      placement: "top",
    },
  ],

  purchaseOrders: [
    {
      target: "[data-tour='new-po']",
      title: "Create Purchase Order",
      description:
        "Start a new PO to order items from suppliers. You can create from scratch or use templates for frequent orders.",
      placement: "bottom",
    },
    {
      target: "[data-tour='supplier']",
      title: "Select Supplier",
      description:
        "Choose your supplier and their pricing will be pre-filled. You can review vendor scorecards before placing large orders.",
      placement: "bottom",
    },
    {
      target: "[data-tour='line-items']",
      title: "Add Items",
      description:
        "Add items with quantities and prices. The system will check current stock levels and suggest order quantities.",
      placement: "top",
    },
    {
      target: "[data-tour='status']",
      title: "Order Status",
      description:
        "Track your PO from draft through approval, sent to supplier, and eventually received. Get alerts for overdue orders.",
      placement: "left",
    },
  ],

  productionOrders: [
    {
      target: "[data-tour='new-production']",
      title: "Create Production Order",
      description:
        "Plan manufacturing jobs for finished goods. The system will show required components from the BOM.",
      placement: "bottom",
    },
    {
      target: "[data-tour='bom']",
      title: "Bill of Materials",
      description:
        "Review components needed for production. The system checks if you have enough stock and warns about shortages.",
      placement: "bottom",
    },
    {
      target: "[data-tour='release']",
      title: "Release to Shop Floor",
      description:
        "Release orders to make them available for operators. They can then start jobs using the mobile scanner.",
      placement: "bottom",
    },
    {
      target: "[data-tour='consumption']",
      title: "Track Consumption",
      description:
        "As components are used, they're automatically deducted from inventory. Track actual vs planned for costing.",
      placement: "top",
    },
  ],

  salesOrders: [
    {
      target: "[data-tour='new-so']",
      title: "Create Sales Order",
      description:
        "Enter customer orders here. The system will check availability and reserve stock for confirmed orders.",
      placement: "bottom",
    },
    {
      target: "[data-tour='customer']",
      title: "Select Customer",
      description:
        "Choose your customer and their default terms, shipping address, and pricing will be loaded.",
      placement: "bottom",
    },
    {
      target: "[data-tour='atp-check']",
      title: "Check Availability",
      description:
        "ATP (Available to Promise) shows what you can commit to customers, including production capacity.",
      placement: "bottom",
    },
    {
      target: "[data-tour='fulfill']",
      title: "Pick and Ship",
      description:
        "Once confirmed, create pick tasks for warehouse. Then create shipment with tracking when ready to ship.",
      placement: "top",
    },
  ],

  qualityInspections: [
    {
      target: "[data-tour='inspection-type']",
      title: "Choose Inspection Type",
      description:
        "Receiving checks incoming materials, In-Process checks during production, Final checks finished goods, and Audit is periodic verification.",
      placement: "bottom",
    },
    {
      target: "[data-tour='checkpoints']",
      title: "Quality Checkpoints",
      description:
        "Complete each checkpoint with measurements or observations. Mark as Pass, Fail, or Conditional based on specifications.",
      placement: "top",
    },
    {
      target: "[data-tour='overall-result']",
      title: "Overall Result",
      description:
        "Accept releases inventory for use, Reject quarantines it, Conditional Accept allows use with restrictions.",
      placement: "top",
    },
    {
      target: "[data-tour='ncr']",
      title: "Non-Conformance Reports",
      description:
        "If issues are found, create an NCR to document the problem and track corrective actions.",
      placement: "left",
    },
  ],
};

// Helper to get tour by page path
export function getTourSteps(path: string): TourStep[] | null {
  const cleanPath = path.replace(/^\//, "").split("?")[0].split("/")[0];

  const pathMap: Record<string, string> = {
    "": "dashboard",
    dashboard: "dashboard",
    modules: "inventory",
    inventory: "inventory",
    "cycle-counts": "cycleCount",
    "ai-cycle-count": "aiCycleCount",
    assistant: "inventoryAssistant",
    purchasing: "purchaseOrders",
    "purchase-orders": "purchaseOrders",
    manufacturing: "productionOrders",
    "production-orders": "productionOrders",
    sales: "salesOrders",
    quality: "qualityInspections",
    inspections: "qualityInspections",
  };

  const key = pathMap[cleanPath];
  return key ? TOURS[key] : null;
}
