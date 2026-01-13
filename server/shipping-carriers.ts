/**
 * Shipping Carrier Integration System
 *
 * Integrates with UPS, FedEx, USPS, DHL for rate shopping,
 * label generation, and tracking
 */

import { prisma } from "./prisma";

// ============================================================
// TYPES
// ============================================================

export type CarrierCode = "UPS" | "FEDEX" | "USPS" | "DHL";
export type ServiceLevel = "GROUND" | "EXPRESS" | "OVERNIGHT" | "ECONOMY" | "FREIGHT";

export interface Address {
  name: string;
  company?: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  email?: string;
  residential?: boolean;
}

export interface Package {
  weight: number;
  weightUnit: "LB" | "KG";
  length: number;
  width: number;
  height: number;
  dimensionUnit: "IN" | "CM";
  packageType?: string;
  declaredValue?: number;
  insurance?: boolean;
}

export interface ShipmentRequest {
  fromAddress: Address;
  toAddress: Address;
  packages: Package[];
  serviceLevel?: ServiceLevel;
  carrier?: CarrierCode;
  referenceNumber?: string;
  requireSignature?: boolean;
  saturdayDelivery?: boolean;
}

export interface RateQuote {
  carrier: CarrierCode;
  serviceName: string;
  serviceCode: string;
  totalCost: number;
  currency: string;
  estimatedDeliveryDate?: Date;
  estimatedDays?: number;
  guaranteedDelivery?: boolean;
  breakdown?: {
    baseRate: number;
    fuel: number;
    residential?: number;
    insurance?: number;
    signature?: number;
    other?: number;
  };
}

export interface ShipmentLabel {
  carrier: CarrierCode;
  trackingNumber: string;
  labelUrl: string;
  labelFormat: "PDF" | "PNG" | "ZPL";
  cost: number;
  estimatedDelivery?: Date;
}

export interface TrackingEvent {
  timestamp: Date;
  status: string;
  description: string;
  location?: string;
  city?: string;
  state?: string;
  country?: string;
}

export interface TrackingInfo {
  carrier: CarrierCode;
  trackingNumber: string;
  status: "IN_TRANSIT" | "OUT_FOR_DELIVERY" | "DELIVERED" | "EXCEPTION" | "UNKNOWN";
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  events: TrackingEvent[];
}

// ============================================================
// CARRIER SERVICE
// ============================================================

export class ShippingCarrierService {
  private static carrierConfigs: Map<CarrierCode, any> = new Map();

  /**
   * Configure carrier credentials
   */
  static configureCarrier(carrier: CarrierCode, config: any): void {
    this.carrierConfigs.set(carrier, config);
  }

  /**
   * Get shipping rates from all configured carriers
   */
  static async getRates(request: ShipmentRequest): Promise<RateQuote[]> {
    const quotes: RateQuote[] = [];
    const carriers: CarrierCode[] = request.carrier
      ? [request.carrier]
      : ["UPS", "FEDEX", "USPS", "DHL"];

    for (const carrier of carriers) {
      try {
        const carrierQuotes = await this.getCarrierRates(carrier, request);
        quotes.push(...carrierQuotes);
      } catch (error) {
        console.error(`Error getting rates from ${carrier}:`, error);
      }
    }

    // Sort by price
    return quotes.sort((a, b) => a.totalCost - b.totalCost);
  }

  /**
   * Get rates from specific carrier
   */
  private static async getCarrierRates(
    carrier: CarrierCode,
    request: ShipmentRequest
  ): Promise<RateQuote[]> {
    // Calculate package dimensions
    const totalWeight = request.packages.reduce((sum, p) => sum + p.weight, 0);
    const isResidential = request.toAddress.residential !== false;

    // Base rates (simplified - in production, call actual carrier APIs)
    const baseRates: Record<CarrierCode, Record<ServiceLevel, number>> = {
      UPS: {
        GROUND: 8.50,
        EXPRESS: 15.00,
        OVERNIGHT: 45.00,
        ECONOMY: 6.00,
        FREIGHT: 75.00,
      },
      FEDEX: {
        GROUND: 9.00,
        EXPRESS: 16.00,
        OVERNIGHT: 48.00,
        ECONOMY: 6.50,
        FREIGHT: 80.00,
      },
      USPS: {
        GROUND: 5.50,
        EXPRESS: 25.00,
        OVERNIGHT: 35.00,
        ECONOMY: 4.00,
        FREIGHT: 0,
      },
      DHL: {
        GROUND: 10.00,
        EXPRESS: 18.00,
        OVERNIGHT: 55.00,
        ECONOMY: 7.00,
        FREIGHT: 85.00,
      },
    };

    const serviceNames: Record<CarrierCode, Record<ServiceLevel, string>> = {
      UPS: {
        GROUND: "UPS Ground",
        EXPRESS: "UPS 2nd Day Air",
        OVERNIGHT: "UPS Next Day Air",
        ECONOMY: "UPS SurePost",
        FREIGHT: "UPS Freight",
      },
      FEDEX: {
        GROUND: "FedEx Ground",
        EXPRESS: "FedEx 2Day",
        OVERNIGHT: "FedEx Priority Overnight",
        ECONOMY: "FedEx SmartPost",
        FREIGHT: "FedEx Freight",
      },
      USPS: {
        GROUND: "USPS Ground Advantage",
        EXPRESS: "USPS Priority Mail Express",
        OVERNIGHT: "USPS Priority Mail Express",
        ECONOMY: "USPS Ground Advantage",
        FREIGHT: "",
      },
      DHL: {
        GROUND: "DHL Ground",
        EXPRESS: "DHL Express",
        OVERNIGHT: "DHL Express Plus",
        ECONOMY: "DHL eCommerce",
        FREIGHT: "DHL Freight",
      },
    };

    const deliveryDays: Record<ServiceLevel, number> = {
      GROUND: 5,
      EXPRESS: 2,
      OVERNIGHT: 1,
      ECONOMY: 7,
      FREIGHT: 10,
    };

    const quotes: RateQuote[] = [];
    const serviceLevels: ServiceLevel[] = request.serviceLevel
      ? [request.serviceLevel]
      : ["GROUND", "EXPRESS", "OVERNIGHT", "ECONOMY"];

    for (const serviceLevel of serviceLevels) {
      const baseRate = baseRates[carrier][serviceLevel];
      if (!baseRate) continue;

      // Weight-based pricing
      const weightCharge = totalWeight * 0.50;

      // Fuel surcharge (approx 15%)
      const fuelCharge = (baseRate + weightCharge) * 0.15;

      // Residential surcharge
      const residentialCharge = isResidential ? 4.00 : 0;

      // Insurance
      const insuranceCharge = request.packages.some((p) => p.insurance)
        ? request.packages.reduce((sum, p) => sum + (p.declaredValue || 0) * 0.02, 0)
        : 0;

      // Signature
      const signatureCharge = request.requireSignature ? 5.00 : 0;

      const totalCost =
        baseRate + weightCharge + fuelCharge + residentialCharge + insuranceCharge + signatureCharge;

      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + deliveryDays[serviceLevel]);

      quotes.push({
        carrier,
        serviceName: serviceNames[carrier][serviceLevel],
        serviceCode: `${carrier}_${serviceLevel}`,
        totalCost: Math.round(totalCost * 100) / 100,
        currency: "USD",
        estimatedDeliveryDate: deliveryDate,
        estimatedDays: deliveryDays[serviceLevel],
        guaranteedDelivery: serviceLevel === "OVERNIGHT",
        breakdown: {
          baseRate,
          fuel: Math.round(fuelCharge * 100) / 100,
          residential: residentialCharge,
          insurance: insuranceCharge,
          signature: signatureCharge,
          other: weightCharge,
        },
      });
    }

    return quotes;
  }

  /**
   * Create shipment and generate label
   */
  static async createShipment(
    request: ShipmentRequest,
    selectedRate: RateQuote
  ): Promise<ShipmentLabel> {
    // In production, this would call the actual carrier API
    // For now, generate a mock label

    const trackingNumber = this.generateTrackingNumber(selectedRate.carrier);

    // Create label data (in production, this would be actual label data)
    const labelData = {
      carrier: selectedRate.carrier,
      service: selectedRate.serviceName,
      tracking: trackingNumber,
      from: request.fromAddress,
      to: request.toAddress,
      packages: request.packages,
      date: new Date().toISOString(),
    };

    // In production, return actual label URL from carrier
    const labelUrl = `data:application/json;base64,${Buffer.from(JSON.stringify(labelData)).toString("base64")}`;

    return {
      carrier: selectedRate.carrier,
      trackingNumber,
      labelUrl,
      labelFormat: "PDF",
      cost: selectedRate.totalCost,
      estimatedDelivery: selectedRate.estimatedDeliveryDate,
    };
  }

  /**
   * Generate tracking number (mock)
   */
  private static generateTrackingNumber(carrier: CarrierCode): string {
    const prefix = {
      UPS: "1Z",
      FEDEX: "7489",
      USPS: "9400",
      DHL: "JD",
    };

    const randomPart = Math.random().toString(36).substring(2, 15).toUpperCase();
    return `${prefix[carrier]}${randomPart}`;
  }

  /**
   * Track shipment
   */
  static async trackShipment(
    carrier: CarrierCode,
    trackingNumber: string
  ): Promise<TrackingInfo> {
    // In production, call carrier tracking API
    // For now, return mock data

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const mockEvents: TrackingEvent[] = [
      {
        timestamp: twoDaysAgo,
        status: "PICKED_UP",
        description: "Package picked up",
        location: "Origin Facility",
        city: "New York",
        state: "NY",
        country: "US",
      },
      {
        timestamp: yesterday,
        status: "IN_TRANSIT",
        description: "In transit to destination",
        location: "Regional Hub",
        city: "Newark",
        state: "NJ",
        country: "US",
      },
      {
        timestamp: now,
        status: "OUT_FOR_DELIVERY",
        description: "Out for delivery",
        location: "Local Facility",
        city: "Philadelphia",
        state: "PA",
        country: "US",
      },
    ];

    return {
      carrier,
      trackingNumber,
      status: "OUT_FOR_DELIVERY",
      estimatedDelivery: now,
      events: mockEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
    };
  }

  /**
   * Void/cancel shipment
   */
  static async voidShipment(
    carrier: CarrierCode,
    trackingNumber: string
  ): Promise<{ success: boolean; refundAmount?: number }> {
    // In production, call carrier void API
    return {
      success: true,
      refundAmount: 10.00,
    };
  }

  /**
   * Schedule pickup
   */
  static async schedulePickup(params: {
    carrier: CarrierCode;
    address: Address;
    pickupDate: Date;
    readyTime: string; // HH:mm
    closeTime: string; // HH:mm
    packageCount: number;
    totalWeight: number;
  }): Promise<{ confirmationNumber: string; pickupDate: Date }> {
    // In production, call carrier pickup API
    return {
      confirmationNumber: `PU${Date.now()}`,
      pickupDate: params.pickupDate,
    };
  }

  /**
   * Update shipment in database with tracking info
   */
  static async syncTrackingInfo(shipmentId: string): Promise<any> {
    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
    });

    if (!shipment || !shipment.trackingNumber || !shipment.carrier) {
      throw new Error("Shipment not found or missing tracking info");
    }

    const trackingInfo = await this.trackShipment(
      shipment.carrier as CarrierCode,
      shipment.trackingNumber
    );

    // Update shipment status based on tracking
    let newStatus = shipment.status;
    if (trackingInfo.status === "DELIVERED") {
      newStatus = "DELIVERED";
    } else if (trackingInfo.status === "IN_TRANSIT" || trackingInfo.status === "OUT_FOR_DELIVERY") {
      newStatus = "IN_TRANSIT";
    }

    const updated = await prisma.shipment.update({
      where: { id: shipmentId },
      data: {
        status: newStatus,
        deliveryDate: trackingInfo.actualDelivery,
      },
    });

    return {
      shipment: updated,
      tracking: trackingInfo,
    };
  }

  /**
   * Get cheapest rate for a shipment
   */
  static async getCheapestRate(request: ShipmentRequest): Promise<RateQuote | null> {
    const rates = await this.getRates(request);
    return rates.length > 0 ? rates[0] : null;
  }

  /**
   * Get fastest rate for a shipment
   */
  static async getFastestRate(request: ShipmentRequest): Promise<RateQuote | null> {
    const rates = await this.getRates(request);
    const sortedBySpeed = rates.sort((a, b) => (a.estimatedDays || 99) - (b.estimatedDays || 99));
    return sortedBySpeed.length > 0 ? sortedBySpeed[0] : null;
  }

  /**
   * Batch ship multiple orders
   */
  static async batchShip(params: {
    tenantId: string;
    siteId: string;
    shipmentIds: string[];
    carrier: CarrierCode;
    serviceLevel: ServiceLevel;
    fromAddress: Address;
  }): Promise<{ successful: ShipmentLabel[]; failed: { shipmentId: string; error: string }[] }> {
    const successful: ShipmentLabel[] = [];
    const failed: { shipmentId: string; error: string }[] = [];

    for (const shipmentId of params.shipmentIds) {
      try {
        const shipment = await prisma.shipment.findUnique({
          where: { id: shipmentId },
          include: {
            customer: true,
            packages: true,
          },
        });

        if (!shipment) {
          failed.push({ shipmentId, error: "Shipment not found" });
          continue;
        }

        const request: ShipmentRequest = {
          fromAddress: params.fromAddress,
          toAddress: {
            name: shipment.shipToName || shipment.customer.name,
            street1: shipment.shipToAddress1 || "",
            city: shipment.shipToCity || "",
            state: shipment.shipToState || "",
            postalCode: shipment.shipToZip || "",
            country: shipment.shipToCountry || "US",
          },
          packages: shipment.packages.map((pkg) => ({
            weight: pkg.weight || 1,
            weightUnit: (pkg.weightUnit as "LB" | "KG") || "LB",
            length: pkg.length || 12,
            width: pkg.width || 12,
            height: pkg.height || 12,
            dimensionUnit: (pkg.dimensionUnit as "IN" | "CM") || "IN",
          })),
          carrier: params.carrier,
          serviceLevel: params.serviceLevel,
        };

        const rates = await this.getCarrierRates(params.carrier, request);
        const selectedRate = rates.find((r) => r.serviceCode.includes(params.serviceLevel));

        if (!selectedRate) {
          failed.push({ shipmentId, error: "No rate found for selected service" });
          continue;
        }

        const label = await this.createShipment(request, selectedRate);

        // Update shipment record
        await prisma.shipment.update({
          where: { id: shipmentId },
          data: {
            carrier: params.carrier,
            serviceLevel: params.serviceLevel,
            trackingNumber: label.trackingNumber,
            shippingCost: label.cost,
            status: "SHIPPED",
            shipDate: new Date(),
          },
        });

        successful.push(label);
      } catch (error: any) {
        failed.push({ shipmentId, error: error.message });
      }
    }

    return { successful, failed };
  }
}

// ============================================================
// ADDRESS VALIDATION SERVICE
// ============================================================

export class AddressValidationService {
  /**
   * Validate and standardize an address
   */
  static async validateAddress(address: Address): Promise<{
    valid: boolean;
    standardized?: Address;
    suggestions?: Address[];
    errors?: string[];
  }> {
    const errors: string[] = [];

    // Basic validation
    if (!address.street1) errors.push("Street address is required");
    if (!address.city) errors.push("City is required");
    if (!address.state) errors.push("State is required");
    if (!address.postalCode) errors.push("Postal code is required");
    if (!address.country) errors.push("Country is required");

    // Validate postal code format
    if (address.country === "US") {
      const zipRegex = /^\d{5}(-\d{4})?$/;
      if (!zipRegex.test(address.postalCode)) {
        errors.push("Invalid US postal code format");
      }
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    // Standardize address
    const standardized: Address = {
      ...address,
      name: address.name.toUpperCase(),
      street1: address.street1.toUpperCase(),
      street2: address.street2?.toUpperCase(),
      city: address.city.toUpperCase(),
      state: address.state.toUpperCase(),
      postalCode: address.postalCode,
      country: address.country.toUpperCase(),
    };

    return { valid: true, standardized };
  }
}
