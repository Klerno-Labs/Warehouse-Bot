/**
 * Cartonization & Load Planning Service
 *
 * Optimal packing and shipping:
 * - Cartonization (box sizing algorithms)
 * - Load planning and optimization
 * - Pallet building
 * - Container loading
 */

import { storage } from "./storage";

// ============================================================================
// CARTONIZATION
// ============================================================================

interface CartonType {
  id: string;
  name: string;
  code: string;
  innerLength: number;
  innerWidth: number;
  innerHeight: number;
  outerLength: number;
  outerWidth: number;
  outerHeight: number;
  maxWeight: number;
  tareWeight: number;
  cost: number;
  material: "CORRUGATED" | "POLY_MAILER" | "PADDED_MAILER" | "BOX" | "CRATE";
  isActive: boolean;
}

interface CartonizationResult {
  id: string;
  salesOrderId: string;
  algorithm: "BEST_FIT" | "FIRST_FIT" | "WEIGHT_BALANCED" | "MINIMIZE_CARTONS" | "MINIMIZE_COST";
  cartons: PackedCarton[];
  summary: {
    totalCartons: number;
    totalWeight: number;
    totalVolume: number;
    volumeUtilization: number;
    totalCartonCost: number;
    estimatedShippingCost: number;
  };
}

interface PackedCarton {
  cartonId: string;
  cartonType: CartonType;
  sequence: number;
  items: Array<{
    itemId: string;
    itemSku: string;
    quantity: number;
    weight: number;
    position?: { x: number; y: number; z: number };
    orientation?: "UPRIGHT" | "SIDE" | "FLAT";
  }>;
  totalWeight: number;
  volumeUsed: number;
  volumeUtilization: number;
  specialHandling?: string[];
}

interface ItemDimensions {
  itemId: string;
  length: number;
  width: number;
  height: number;
  weight: number;
  isStackable: boolean;
  maxStackWeight: number;
  orientations: ("UPRIGHT" | "SIDE" | "FLAT")[];
  requiresOwnCarton: boolean;
  hazmat: boolean;
  fragile: boolean;
}

export class CartonizationService {
  constructor(private tenantId: string) {}

  async getCartonTypes(): Promise<CartonType[]> {
    return [
      {
        id: "ct-1",
        name: "Small Box",
        code: "SM-BOX",
        innerLength: 8,
        innerWidth: 6,
        innerHeight: 4,
        outerLength: 8.5,
        outerWidth: 6.5,
        outerHeight: 4.5,
        maxWeight: 10,
        tareWeight: 0.5,
        cost: 0.75,
        material: "CORRUGATED",
        isActive: true,
      },
      {
        id: "ct-2",
        name: "Medium Box",
        code: "MD-BOX",
        innerLength: 12,
        innerWidth: 10,
        innerHeight: 8,
        outerLength: 12.5,
        outerWidth: 10.5,
        outerHeight: 8.5,
        maxWeight: 25,
        tareWeight: 1.0,
        cost: 1.25,
        material: "CORRUGATED",
        isActive: true,
      },
      {
        id: "ct-3",
        name: "Large Box",
        code: "LG-BOX",
        innerLength: 18,
        innerWidth: 14,
        innerHeight: 12,
        outerLength: 18.5,
        outerWidth: 14.5,
        outerHeight: 12.5,
        maxWeight: 50,
        tareWeight: 1.5,
        cost: 2.00,
        material: "CORRUGATED",
        isActive: true,
      },
      {
        id: "ct-4",
        name: "Poly Mailer Small",
        code: "POLY-SM",
        innerLength: 10,
        innerWidth: 8,
        innerHeight: 2,
        outerLength: 10,
        outerWidth: 8,
        outerHeight: 2,
        maxWeight: 3,
        tareWeight: 0.1,
        cost: 0.25,
        material: "POLY_MAILER",
        isActive: true,
      },
    ];
  }

  async createCartonType(params: Omit<CartonType, "id">): Promise<CartonType> {
    return {
      id: `ct-${Date.now()}`,
      ...params,
    };
  }

  async cartonize(params: {
    salesOrderId: string;
    items: Array<{
      itemId: string;
      quantity: number;
    }>;
    algorithm?: CartonizationResult["algorithm"];
    constraints?: {
      maxWeight?: number;
      maxCartons?: number;
      preferredCartonTypes?: string[];
      excludeCartonTypes?: string[];
    };
  }): Promise<CartonizationResult> {
    const algorithm = params.algorithm || "BEST_FIT";
    const cartonTypes = await this.getCartonTypes();

    // Get item dimensions
    const itemDims = await this.getItemDimensions(params.items.map((i) => i.itemId));

    // Pack items into cartons using selected algorithm
    const packedCartons = this.packItems(params.items, itemDims, cartonTypes, algorithm);

    const totalWeight = packedCartons.reduce((sum, c) => sum + c.totalWeight, 0);
    const totalVolume = packedCartons.reduce(
      (sum, c) => sum + c.cartonType.innerLength * c.cartonType.innerWidth * c.cartonType.innerHeight,
      0
    );
    const usedVolume = packedCartons.reduce((sum, c) => sum + c.volumeUsed, 0);

    return {
      id: `cart-${Date.now()}`,
      salesOrderId: params.salesOrderId,
      algorithm,
      cartons: packedCartons,
      summary: {
        totalCartons: packedCartons.length,
        totalWeight,
        totalVolume,
        volumeUtilization: (usedVolume / totalVolume) * 100,
        totalCartonCost: packedCartons.reduce((sum, c) => sum + c.cartonType.cost, 0),
        estimatedShippingCost: 0, // Would be calculated with carrier rates
      },
    };
  }

  private async getItemDimensions(itemIds: string[]): Promise<Map<string, ItemDimensions>> {
    // Would fetch from database
    const dims = new Map<string, ItemDimensions>();
    return dims;
  }

  private packItems(
    items: Array<{ itemId: string; quantity: number }>,
    dimensions: Map<string, ItemDimensions>,
    cartonTypes: CartonType[],
    algorithm: CartonizationResult["algorithm"]
  ): PackedCarton[] {
    // Implement bin packing algorithm
    // This is a simplified version
    const cartons: PackedCarton[] = [];

    // Sort cartons by size for best-fit
    const sortedCartons = [...cartonTypes].sort(
      (a, b) =>
        a.innerLength * a.innerWidth * a.innerHeight -
        b.innerLength * b.innerWidth * b.innerHeight
    );

    // Pack items (simplified - real implementation would be more complex)
    let currentCarton: PackedCarton | null = null;
    let sequence = 1;

    for (const item of items) {
      for (let i = 0; i < item.quantity; i++) {
        const dims = dimensions.get(item.itemId);
        const itemWeight = dims?.weight || 1;
        const itemVolume = dims
          ? dims.length * dims.width * dims.height
          : 100;

        // Find suitable carton
        if (!currentCarton) {
          const cartonType = sortedCartons.find(
            (ct) =>
              ct.innerLength * ct.innerWidth * ct.innerHeight >= itemVolume &&
              ct.maxWeight >= itemWeight
          ) || sortedCartons[sortedCartons.length - 1];

          currentCarton = {
            cartonId: `carton-${Date.now()}-${sequence}`,
            cartonType,
            sequence,
            items: [],
            totalWeight: cartonType.tareWeight,
            volumeUsed: 0,
            volumeUtilization: 0,
          };
          sequence++;
        }

        // Add item to current carton
        currentCarton.items.push({
          itemId: item.itemId,
          itemSku: "", // Would be populated
          quantity: 1,
          weight: itemWeight,
        });
        currentCarton.totalWeight += itemWeight;
        currentCarton.volumeUsed += itemVolume;

        // Check if carton is full
        const maxVolume =
          currentCarton.cartonType.innerLength *
          currentCarton.cartonType.innerWidth *
          currentCarton.cartonType.innerHeight;
        currentCarton.volumeUtilization = (currentCarton.volumeUsed / maxVolume) * 100;

        if (
          currentCarton.volumeUtilization >= 90 ||
          currentCarton.totalWeight >= currentCarton.cartonType.maxWeight * 0.9
        ) {
          cartons.push(currentCarton);
          currentCarton = null;
        }
      }
    }

    if (currentCarton && currentCarton.items.length > 0) {
      cartons.push(currentCarton);
    }

    return cartons;
  }

  async compareAlgorithms(params: {
    salesOrderId: string;
    items: Array<{ itemId: string; quantity: number }>;
  }): Promise<Array<{
    algorithm: CartonizationResult["algorithm"];
    cartons: number;
    cost: number;
    volumeUtilization: number;
  }>> {
    const algorithms: CartonizationResult["algorithm"][] = [
      "BEST_FIT",
      "FIRST_FIT",
      "MINIMIZE_CARTONS",
      "MINIMIZE_COST",
    ];

    const results = await Promise.all(
      algorithms.map(async (algorithm) => {
        const result = await this.cartonize({ ...params, algorithm });
        return {
          algorithm,
          cartons: result.summary.totalCartons,
          cost: result.summary.totalCartonCost,
          volumeUtilization: result.summary.volumeUtilization,
        };
      })
    );

    return results;
  }
}

// ============================================================================
// LOAD PLANNING
// ============================================================================

interface LoadPlan {
  id: string;
  planNumber: string;
  vehicleType: "TRUCK" | "CONTAINER" | "VAN" | "TRAILER";
  vehicleId?: string;
  vehicleName?: string;
  status: "PLANNING" | "CONFIRMED" | "LOADING" | "LOADED" | "DEPARTED";
  route?: string;
  stops: LoadStop[];
  totalWeight: number;
  totalVolume: number;
  weightCapacity: number;
  volumeCapacity: number;
  weightUtilization: number;
  volumeUtilization: number;
  loadSequence: LoadSequenceItem[];
  departureTime?: Date;
  estimatedArrival?: Date;
}

interface LoadStop {
  sequence: number;
  customerId: string;
  customerName: string;
  address: string;
  shipments: string[]; // Shipment IDs
  palletCount: number;
  weight: number;
  estimatedArrival: Date;
  deliveryWindow?: { start: string; end: string };
}

interface LoadSequenceItem {
  sequence: number;
  type: "PALLET" | "CARTON" | "ITEM";
  referenceId: string;
  shipmentId: string;
  stopSequence: number;
  position: {
    floor: number;
    row: number;
    column: number;
  };
  weight: number;
  instructions?: string;
}

interface VehicleType {
  id: string;
  name: string;
  code: string;
  lengthInches: number;
  widthInches: number;
  heightInches: number;
  maxWeightLbs: number;
  doorType: "REAR" | "SIDE" | "BOTH";
  hasTailLift: boolean;
  isRefrigerated: boolean;
}

export class LoadPlanningService {
  constructor(private tenantId: string) {}

  async getVehicleTypes(): Promise<VehicleType[]> {
    return [
      {
        id: "vt-1",
        name: "26ft Box Truck",
        code: "TRUCK-26",
        lengthInches: 312,
        widthInches: 102,
        heightInches: 102,
        maxWeightLbs: 10000,
        doorType: "REAR",
        hasTailLift: true,
        isRefrigerated: false,
      },
      {
        id: "vt-2",
        name: "53ft Trailer",
        code: "TRAILER-53",
        lengthInches: 636,
        widthInches: 102,
        heightInches: 110,
        maxWeightLbs: 45000,
        doorType: "REAR",
        hasTailLift: false,
        isRefrigerated: false,
      },
      {
        id: "vt-3",
        name: "Refrigerated Truck",
        code: "REEFER-26",
        lengthInches: 312,
        widthInches: 96,
        heightInches: 96,
        maxWeightLbs: 8000,
        doorType: "REAR",
        hasTailLift: true,
        isRefrigerated: true,
      },
      {
        id: "vt-4",
        name: "Sprinter Van",
        code: "VAN-SPR",
        lengthInches: 144,
        widthInches: 70,
        heightInches: 72,
        maxWeightLbs: 3000,
        doorType: "BOTH",
        hasTailLift: false,
        isRefrigerated: false,
      },
    ];
  }

  async createLoadPlan(params: {
    vehicleTypeId: string;
    shipmentIds: string[];
    departureTime?: Date;
    optimizeRoute?: boolean;
    optimizeLoad?: boolean;
  }): Promise<LoadPlan> {
    const vehicleTypes = await this.getVehicleTypes();
    const vehicleType = vehicleTypes.find((v) => v.id === params.vehicleTypeId);

    if (!vehicleType) {
      throw new Error("Vehicle type not found");
    }

    // Get shipment details and group by customer/stop
    const stops = await this.buildStops(params.shipmentIds);

    // Optimize route if requested
    if (params.optimizeRoute) {
      await this.optimizeRoute(stops);
    }

    // Calculate load sequence (LIFO - last stop loaded first)
    const loadSequence = await this.calculateLoadSequence(stops, vehicleType);

    const totalWeight = stops.reduce((sum, s) => sum + s.weight, 0);
    const totalVolume = 0; // Would be calculated

    const volumeCapacity =
      vehicleType.lengthInches * vehicleType.widthInches * vehicleType.heightInches;

    const plan: LoadPlan = {
      id: `load-${Date.now()}`,
      planNumber: `LP-${Date.now().toString().slice(-8)}`,
      vehicleType: "TRUCK",
      status: "PLANNING",
      stops,
      totalWeight,
      totalVolume,
      weightCapacity: vehicleType.maxWeightLbs,
      volumeCapacity,
      weightUtilization: (totalWeight / vehicleType.maxWeightLbs) * 100,
      volumeUtilization: 0, // Would be calculated
      loadSequence,
      departureTime: params.departureTime,
    };

    return plan;
  }

  private async buildStops(shipmentIds: string[]): Promise<LoadStop[]> {
    // Group shipments by customer and build stops
    return [];
  }

  private async optimizeRoute(stops: LoadStop[]): Promise<void> {
    // Use traveling salesman algorithm
    // Consider delivery windows
    // Minimize total distance/time
  }

  private async calculateLoadSequence(
    stops: LoadStop[],
    vehicleType: VehicleType
  ): Promise<LoadSequenceItem[]> {
    // LIFO loading - last delivery loaded first
    // Consider weight distribution
    // Consider fragile items on top
    return [];
  }

  async confirmLoadPlan(loadPlanId: string): Promise<LoadPlan> {
    return {} as LoadPlan;
  }

  async startLoading(loadPlanId: string): Promise<LoadPlan> {
    return {} as LoadPlan;
  }

  async recordLoadedItem(params: {
    loadPlanId: string;
    sequenceId: string;
    loadedBy: string;
    position?: LoadSequenceItem["position"];
  }): Promise<void> {
    // Record item loaded
    // Verify sequence
  }

  async completeLoading(loadPlanId: string): Promise<LoadPlan> {
    return {} as LoadPlan;
  }

  async departLoad(loadPlanId: string): Promise<LoadPlan> {
    return {} as LoadPlan;
  }

  async getLoadPlans(params?: {
    status?: LoadPlan["status"];
    vehicleType?: LoadPlan["vehicleType"];
    date?: Date;
  }): Promise<LoadPlan[]> {
    return [];
  }

  async getLoadAnalytics(period: "DAY" | "WEEK" | "MONTH"): Promise<{
    totalLoads: number;
    avgWeightUtilization: number;
    avgVolumeUtilization: number;
    avgStopsPerLoad: number;
    onTimeDeliveries: number;
    byVehicleType: Array<{
      vehicleType: string;
      loads: number;
      avgUtilization: number;
    }>;
  }> {
    return {
      totalLoads: 45,
      avgWeightUtilization: 78.5,
      avgVolumeUtilization: 82.3,
      avgStopsPerLoad: 4.2,
      onTimeDeliveries: 96.5,
      byVehicleType: [],
    };
  }

  async suggestVehicle(params: {
    shipmentIds: string[];
    requiresRefrigeration?: boolean;
    requiresTailLift?: boolean;
  }): Promise<Array<{
    vehicleType: VehicleType;
    weightUtilization: number;
    volumeUtilization: number;
    recommendation: "OPTIMAL" | "ADEQUATE" | "OVERSIZED" | "INSUFFICIENT";
  }>> {
    return [];
  }
}
