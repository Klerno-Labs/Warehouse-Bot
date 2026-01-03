// Job Tracking & Department-Specific Workflows

export const DEPARTMENTS = [
  "PICKING",
  "ASSEMBLY",
  "PLEATING",
  "OVEN",
  "LASER",
  "QC",
  "PACKAGING",
  "SHIPPING",
] as const;

export type Department = (typeof DEPARTMENTS)[number];

export const OPERATION_STATUS = [
  "PENDING",
  "IN_PROGRESS",
  "PAUSED",
  "COMPLETED",
  "SKIPPED",
] as const;

export type OperationStatus = (typeof OPERATION_STATUS)[number];

// Job Card - Physical card with QR code that travels with the job
export type JobCard = {
  id: string;
  productionOrderId: string;
  qrCode: string; // Unique QR code for scanning
  orderNumber: string;
  itemName: string;
  quantity: number;
  createdAt: Date;
};

// Operation Routing - Defines the path a job takes through departments
export type JobOperation = {
  id: string;
  productionOrderId: string;
  sequence: number; // Order of operations (1, 2, 3...)
  department: Department;
  operationName: string;
  description?: string;
  status: OperationStatus;
  assignedTo?: string; // User ID or name

  // Timing
  scheduledStart?: Date;
  scheduledDuration?: number; // minutes
  actualStart?: Date;
  actualEnd?: Date;

  // Location
  workCenterName?: string;

  // Notes
  notes?: string;

  // Relations
  createdAt: Date;
  updatedAt: Date;
};

// Operation Scan Event - Each time someone scans the job card
export type OperationScanEvent = {
  id: string;
  jobOperationId: string;
  productionOrderId: string;
  scanType: "START" | "PAUSE" | "RESUME" | "COMPLETE" | "SKIP";
  scannedBy: string; // User ID or name
  scannedAt: Date;
  department: Department;

  // Device info
  deviceId?: string;

  // Notes
  notes?: string;

  // Calculated
  elapsedTime?: number; // seconds since operation started
};

// Department-Specific Configuration
export type DepartmentConfig = {
  department: Department;
  displayName: string;
  allowsMultipleActive: boolean; // Can work on multiple jobs at once
  requiresQC: boolean; // Requires QC check after completion
  defaultDuration?: number; // Default operation time in minutes
  instructions?: string;
};

export const DEPARTMENT_CONFIGS: Record<Department, DepartmentConfig> = {
  PICKING: {
    department: "PICKING",
    displayName: "Parts Picking",
    allowsMultipleActive: true,
    requiresQC: false,
    instructions: "Scan card to start picking. Scan each component as you gather it. Scan card again when complete.",
  },
  ASSEMBLY: {
    department: "ASSEMBLY",
    displayName: "Assembly",
    allowsMultipleActive: true,
    requiresQC: true,
    defaultDuration: 30,
    instructions: "Scan card to begin assembly. Follow build instructions. Scan when complete.",
  },
  PLEATING: {
    department: "PLEATING",
    displayName: "Pleating",
    allowsMultipleActive: false,
    requiresQC: false,
    defaultDuration: 45,
    instructions: "Scan card before loading media. Start pleater. Scan card when pleating is complete.",
  },
  OVEN: {
    department: "OVEN",
    displayName: "Oven/Curing",
    allowsMultipleActive: false,
    requiresQC: false,
    defaultDuration: 60,
    instructions: "Scan card before loading oven. Start cure cycle. Scan when cycle is complete.",
  },
  LASER: {
    department: "LASER",
    displayName: "Laser Cutting",
    allowsMultipleActive: false,
    requiresQC: false,
    defaultDuration: 20,
    instructions: "Scan card to start. Load media and run cutting program. Scan when cutting is complete.",
  },
  QC: {
    department: "QC",
    displayName: "Quality Control",
    allowsMultipleActive: true,
    requiresQC: false,
    defaultDuration: 15,
    instructions: "Scan card to inspect. Check quality against standards. Scan to approve or reject.",
  },
  PACKAGING: {
    department: "PACKAGING",
    displayName: "Packaging",
    allowsMultipleActive: true,
    requiresQC: false,
    defaultDuration: 10,
    instructions: "Scan card to begin packaging. Package according to specifications. Scan when complete.",
  },
  SHIPPING: {
    department: "SHIPPING",
    displayName: "Shipping",
    allowsMultipleActive: true,
    requiresQC: false,
    instructions: "Scan card to mark ready for shipment. Verify shipping info. Scan to complete.",
  },
};

// Mobile View State
export type DepartmentView = {
  department: Department;
  activeJobs: Array<{
    id: string;
    orderNumber: string;
    itemName: string;
    currentOperation: string;
    assignedTo?: string;
    startedAt?: Date;
    elapsedTime?: number; // seconds
  }>;
  pendingJobs: Array<{
    id: string;
    orderNumber: string;
    itemName: string;
    nextOperation: string;
  }>;
};

// Example Job Configuration (Your HAM/CHEESE example)
export type JobTemplate = {
  name: string;
  operations: Array<{
    sequence: number;
    department: Department;
    operationName: string;
    description: string;
  }>;
};

// Example: Filter Assembly Job (HAM1 + CHEESE cores)
export const FILTER_ASSEMBLY_JOB: JobTemplate = {
  name: "Filter Assembly (HAM + CHEESE)",
  operations: [
    {
      sequence: 1,
      department: "PICKING",
      operationName: "Gather Components",
      description: "Pick BONE1, BONE2, BONE3 for HAM caps. Pick CHEESE1, CHEESE2 cores.",
    },
    {
      sequence: 2,
      department: "ASSEMBLY",
      operationName: "Assemble HAM Caps",
      description: "Assemble HAM1 and HAM2 using bones.",
    },
    {
      sequence: 3,
      department: "QC",
      operationName: "QC - HAM Caps",
      description: "Inspect assembled caps for quality.",
    },
    {
      sequence: 4,
      department: "PLEATING",
      operationName: "Pleat Media",
      description: "Load and pleat filter media.",
    },
    {
      sequence: 5,
      department: "OVEN",
      operationName: "Cure Media",
      description: "Cure pleated media in oven.",
    },
    {
      sequence: 6,
      department: "LASER",
      operationName: "Cut Media",
      description: "Laser cut media to specifications.",
    },
    {
      sequence: 7,
      department: "ASSEMBLY",
      operationName: "Final Assembly",
      description: "Assemble HAM caps, CHEESE cores, media, and Bread net.",
    },
    {
      sequence: 8,
      department: "QC",
      operationName: "Final QC",
      description: "Final quality inspection.",
    },
  ],
};
