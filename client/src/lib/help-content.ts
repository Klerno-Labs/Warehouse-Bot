/**
 * Contextual help content for all pages in the application
 * This makes it easy for non-technical users to understand how to use each feature
 */

export interface HelpContent {
  title: string;
  description: string;
  steps?: string[];
  tips?: string[];
  videoUrl?: string;
  docsUrl?: string;
  examples?: Array<{
    title: string;
    description: string;
  }>;
  shortcuts?: Array<{
    keys: string[];
    action: string;
  }>;
}

export const HELP_CONTENT: Record<string, HelpContent> = {
  // Dashboard
  dashboard: {
    title: "Dashboard Overview",
    description:
      "Your command center for monitoring inventory, production, and operations. The dashboard shows real-time metrics and suggests the most important actions to take.",
    steps: [
      "Check the 'What Should I Do Next?' section for AI-recommended actions",
      "Monitor key metrics like stock value and health score",
      "Review alerts for items needing attention (out of stock, low stock)",
      "Use Quick Tasks buttons or keyboard shortcuts for common actions",
    ],
    tips: [
      "The dashboard updates automatically every 30 seconds",
      "Click on any metric card to view details",
      "Hover over metrics with ℹ️ to see how they're calculated",
      "Use keyboard shortcuts (M, A, C, J, P, S) for quick navigation",
    ],
    shortcuts: [
      { keys: ["M"], action: "Move Stock" },
      { keys: ["A"], action: "Adjust Stock" },
      { keys: ["C"], action: "Cycle Count" },
      { keys: ["J"], action: "Scan Job" },
      { keys: ["P"], action: "Purchase Order" },
      { keys: ["S"], action: "Check Availability" },
    ],
  },

  // Inventory Management
  inventory: {
    title: "Inventory Management",
    description:
      "View and manage all your inventory items, locations, and stock levels. This is where you control your warehouse operations.",
    steps: [
      "Search for items by SKU, name, or category",
      "Click on an item to view details and balances",
      "Use filters to find specific items (low stock, out of stock, etc.)",
      "Perform transactions: Receive, Move, Adjust, or Issue inventory",
    ],
    examples: [
      {
        title: "Receiving Inventory",
        description:
          "When you receive a shipment, go to Purchasing → Receipts → New Receipt. Enter the PO number and quantities received.",
      },
      {
        title: "Moving Stock",
        description:
          "To transfer items between locations, use the Move action. Select the item, from location, to location, and quantity.",
      },
      {
        title: "Adjusting Counts",
        description:
          "If physical count doesn't match system, use Adjust action. Always include a reason code explaining why.",
      },
    ],
    tips: [
      "Use barcode scanning for faster data entry",
      "Set reorder points to get automatic alerts when stock is low",
      "Run cycle counts regularly to maintain accuracy",
      "Always use reason codes when adjusting inventory",
    ],
  },

  // Cycle Counting
  cycleCount: {
    title: "Cycle Counting",
    description:
      "Verify inventory accuracy by counting physical stock and comparing to system records. Regular cycle counts improve accuracy without full physical inventory shutdowns.",
    steps: [
      "Use AI Cycle Count Analyzer to identify which items to count",
      "Create a cycle count sheet with selected items",
      "Physically count the items in the warehouse",
      "Enter counted quantities into the system",
      "Review variances and investigate discrepancies",
      "Post adjustments to correct inventory records",
    ],
    examples: [
      {
        title: "ABC Cycle Count",
        description:
          "Count high-value items (Class A) monthly, medium-value (Class B) quarterly, and low-value (Class C) annually.",
      },
      {
        title: "Random Sampling",
        description:
          "Count a random selection of items each week to maintain overall accuracy.",
      },
    ],
    tips: [
      "Count during slow periods to minimize disruption",
      "Use two-person counts for high-value items",
      "Investigate variances over 2% immediately",
      "Train all staff on proper counting procedures",
    ],
  },

  // AI Inventory Assistant
  inventoryAssistant: {
    title: "AI Inventory Assistant",
    description:
      "Quickly diagnose inventory discrepancies using AI. When items are missing or there are extra units, the assistant analyzes recent transactions to identify the likely cause.",
    steps: [
      "Select the item with the discrepancy",
      "Enter the expected quantity (what system shows)",
      "Enter the actual quantity (what you physically counted)",
      "Review AI analysis of possible causes",
      "Check the evidence provided for each cause",
      "Follow recommended next steps to resolve the issue",
    ],
    examples: [
      {
        title: "Missing Inventory",
        description:
          "System shows 100 units, but you only count 80. AI checks for unreported production usage, duplicate shipments, or location transfers.",
      },
      {
        title: "Extra Inventory",
        description:
          "You count 120 units but system shows 100. AI checks for duplicate receipts or unreported returns.",
      },
    ],
    tips: [
      "Run this analysis before posting cycle count adjustments",
      "Fix the root cause, not just the symptom",
      "Document your findings in the adjustment notes",
      "Use this to improve your processes and training",
    ],
  },

  // AI Cycle Count Analyzer
  aiCycleCount: {
    title: "AI Cycle Count Analyzer",
    description:
      "Let AI decide which items need counting based on value, activity, variance history, and time since last count. Saves time by focusing on high-risk items.",
    steps: [
      "Select your counting strategy (ABC, High Risk, Random, or All)",
      "Choose maximum number of items to count",
      "Click 'Analyze & Generate Recommendations'",
      "Review recommended items with priority scores",
      "Select items you want to include in the count",
      "Click 'Create Cycle Count' to generate count sheet",
    ],
    examples: [
      {
        title: "ABC Strategy",
        description:
          "Focuses on high-value and high-activity items. Best for routine cycle counts.",
      },
      {
        title: "High Risk Strategy",
        description:
          "Only shows items with high variance history or long time since last count. Best when you have limited time.",
      },
    ],
    tips: [
      "Run analysis weekly to stay on top of inventory accuracy",
      "Start with high-priority items (critical/high)",
      "Review risk factors to understand why items were selected",
      "Adjust max items based on available labor hours",
    ],
  },

  // Purchase Orders
  purchaseOrders: {
    title: "Purchase Orders",
    description:
      "Create and manage orders to suppliers. Track expected delivery dates and receive items when they arrive.",
    steps: [
      "Click 'New Purchase Order' button",
      "Select supplier from dropdown",
      "Add line items with quantities and prices",
      "Set expected delivery date",
      "Submit for approval (if required by workflow)",
      "Send PO to supplier via email or print",
      "Receive items when they arrive using Receipts",
    ],
    tips: [
      "Set reorder points to trigger automatic PO suggestions",
      "Review vendor scorecards before placing large orders",
      "Include expected delivery dates for planning",
      "Use PO templates for frequently ordered items",
    ],
  },

  // Production Orders
  productionOrders: {
    title: "Production Orders",
    description:
      "Plan and execute manufacturing jobs. Track which components are consumed and what finished goods are produced.",
    steps: [
      "Create production order for finished item",
      "System shows BOM (Bill of Materials) components needed",
      "Release order to make it available to shop floor",
      "Start job using mobile job scanner",
      "Consume components as they're used",
      "Complete job when finished goods are produced",
      "Receive finished goods into inventory",
    ],
    examples: [
      {
        title: "Simple Assembly",
        description:
          "Assemble 100 widgets from 200 components. System automatically deducts components and adds finished widgets.",
      },
    ],
    tips: [
      "Create orders based on sales demand or forecast",
      "Use production board to visualize active jobs",
      "Track actual vs planned quantities for costing",
      "Report scrap and rework with proper reason codes",
    ],
  },

  // Sales Orders
  salesOrders: {
    title: "Sales Orders",
    description:
      "Manage customer orders from creation to shipment. Check availability, allocate stock, and create shipments.",
    steps: [
      "Create new sales order for customer",
      "Add items and quantities ordered",
      "System checks ATP (Available to Promise)",
      "Confirm order once all items are available",
      "Pick items from warehouse locations",
      "Create shipment when ready to ship",
      "Mark as shipped with tracking number",
    ],
    tips: [
      "Use ATP check before confirming orders to customers",
      "Set requested delivery dates for priority planning",
      "Allocate stock to prevent over-promising",
      "Link shipments to tracking numbers for visibility",
    ],
  },

  // Quality Inspections
  qualityInspections: {
    title: "Quality Inspections",
    description:
      "Perform quality checks at receiving, in-process, and final stages. Track checkpoints and results to ensure product quality.",
    steps: [
      "Select inspection type (Receiving, In-Process, Final, Audit)",
      "Choose item or lot to inspect",
      "Complete each checkpoint with measurements",
      "Mark checkpoints as Pass, Fail, or Conditional",
      "Assign overall result (Accept, Reject, Conditional Accept)",
      "Create NCR (Non-Conformance Report) if issues found",
    ],
    tips: [
      "Receiving inspections prevent bad material entering inventory",
      "Use inspection plans to standardize checkpoints",
      "Document all failed checkpoints with photos if possible",
      "Follow up NCRs with CAPA (Corrective Actions)",
    ],
  },

  // Lot Tracking
  lotTracking: {
    title: "Lot/Batch Tracking",
    description:
      "Track items by production lot or batch for traceability. Essential for food, pharma, and industries with recalls.",
    steps: [
      "Create lot during production or receiving",
      "Assign unique lot number and production date",
      "Set expiration date if applicable",
      "Perform QC inspection on lot",
      "Put on hold or quarantine if needed",
      "Release for use once approved",
      "Track lot genealogy (which lots went into finished goods)",
    ],
    examples: [
      {
        title: "Forward Traceability",
        description:
          "If a raw material lot is recalled, identify all finished goods that contain it.",
      },
      {
        title: "Backward Traceability",
        description:
          "If a finished good has issues, trace back to source raw material lots.",
      },
    ],
    tips: [
      "Use lot tracking for items with expiration dates",
      "FEFO (First Expired, First Out) for perishables",
      "Maintain lot history for regulatory compliance",
      "Perform lot-specific cycle counts if discrepancies found",
    ],
  },
};

// Helper to get help content by page path
export function getHelpContent(path: string): HelpContent | null {
  // Strip leading slash and parameters
  const cleanPath = path.replace(/^\//, "").split("?")[0].split("/")[0];

  // Map paths to help content keys
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
    lots: "lotTracking",
  };

  const key = pathMap[cleanPath];
  return key ? HELP_CONTENT[key] : null;
}
