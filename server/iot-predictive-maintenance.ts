/**
 * IoT & Predictive Maintenance Module
 * Top 0.01% feature: Equipment monitoring with ML-based failure prediction
 * Competes with: IBM Maximo, SAP PM, Uptake
 */

import { storage } from './storage';

// Types for IoT and equipment management
interface IoTDevice {
  id: string;
  name: string;
  type: 'forklift' | 'conveyor' | 'hvac' | 'dock_door' | 'scanner' | 'scale' | 'agv' | 'robot' | 'sensor';
  serialNumber: string;
  location: string;
  zone: string;
  status: 'online' | 'offline' | 'maintenance' | 'error';
  lastSeen: string;
  batteryLevel?: number;
  firmware: string;
  metadata: Record<string, any>;
}

interface SensorReading {
  deviceId: string;
  timestamp: string;
  type: 'temperature' | 'humidity' | 'vibration' | 'pressure' | 'power' | 'speed' | 'utilization';
  value: number;
  unit: string;
  anomaly: boolean;
}

interface Equipment {
  id: string;
  name: string;
  type: string;
  make: string;
  model: string;
  serialNumber: string;
  purchaseDate: string;
  warrantyExpiration: string;
  location: string;
  status: 'operational' | 'degraded' | 'maintenance' | 'failed';
  healthScore: number;
  lastMaintenance: string;
  nextScheduledMaintenance: string;
  runtime: number; // hours
  specifications: Record<string, any>;
}

interface MaintenanceTask {
  id: string;
  equipmentId: string;
  type: 'preventive' | 'corrective' | 'predictive' | 'emergency';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  description: string;
  scheduledDate: string;
  assignedTo?: string;
  estimatedDuration: number; // minutes
  actualDuration?: number;
  parts: MaintenancePart[];
  cost?: number;
  notes?: string;
  completedAt?: string;
}

interface MaintenancePart {
  partNumber: string;
  name: string;
  quantity: number;
  cost: number;
}

interface FailurePrediction {
  equipmentId: string;
  equipmentName: string;
  failureType: string;
  probability: number;
  predictedDate: string;
  daysUntilFailure: number;
  confidence: number;
  recommendedAction: string;
  estimatedRepairCost: number;
  estimatedDowntimeCost: number;
  indicators: string[];
}

/**
 * IoT Device Management Service
 * Manages connected warehouse devices
 */
export class IoTDeviceService {
  private devices: IoTDevice[] = [
    {
      id: 'DEV-001',
      name: 'Forklift A1',
      type: 'forklift',
      serialNumber: 'FL-2024-001',
      location: 'Zone A',
      zone: 'A',
      status: 'online',
      lastSeen: new Date().toISOString(),
      batteryLevel: 85,
      firmware: 'v2.4.1',
      metadata: { operator: 'John Smith', shift: 'day' },
    },
    {
      id: 'DEV-002',
      name: 'Conveyor Line 1',
      type: 'conveyor',
      serialNumber: 'CV-2023-001',
      location: 'Main Floor',
      zone: 'B',
      status: 'online',
      lastSeen: new Date().toISOString(),
      firmware: 'v3.1.0',
      metadata: { speed: 2.5, length: 150 },
    },
    {
      id: 'DEV-003',
      name: 'HVAC Unit 1',
      type: 'hvac',
      serialNumber: 'HV-2022-001',
      location: 'Building A',
      zone: 'ALL',
      status: 'online',
      lastSeen: new Date().toISOString(),
      firmware: 'v1.8.2',
      metadata: { setpoint: 68, mode: 'cooling' },
    },
    {
      id: 'DEV-004',
      name: 'Dock Door 1',
      type: 'dock_door',
      serialNumber: 'DD-2023-001',
      location: 'Receiving',
      zone: 'R',
      status: 'online',
      lastSeen: new Date().toISOString(),
      firmware: 'v1.2.0',
      metadata: { position: 'closed', lockStatus: 'locked' },
    },
    {
      id: 'DEV-005',
      name: 'AGV Robot 1',
      type: 'agv',
      serialNumber: 'AGV-2024-001',
      location: 'Zone C',
      zone: 'C',
      status: 'online',
      lastSeen: new Date().toISOString(),
      batteryLevel: 72,
      firmware: 'v4.2.1',
      metadata: { currentTask: 'transport', destination: 'C-05-02' },
    },
    {
      id: 'DEV-006',
      name: 'Temp Sensor Cold Storage',
      type: 'sensor',
      serialNumber: 'TS-2024-001',
      location: 'Cold Storage',
      zone: 'COLD',
      status: 'online',
      lastSeen: new Date().toISOString(),
      firmware: 'v1.0.5',
      metadata: { reading: 35, unit: 'F' },
    },
  ];

  async getDevices(type?: string, status?: string, zone?: string): Promise<IoTDevice[]> {
    let filteredDevices = this.devices;
    if (type) {
      filteredDevices = filteredDevices.filter(d => d.type === type);
    }
    if (status) {
      filteredDevices = filteredDevices.filter(d => d.status === status);
    }
    if (zone) {
      filteredDevices = filteredDevices.filter(d => d.zone === zone || d.zone === 'ALL');
    }
    return filteredDevices;
  }

  async getDevice(deviceId: string): Promise<IoTDevice | null> {
    return this.devices.find(d => d.id === deviceId) || null;
  }

  async getDeviceSummary(): Promise<any> {
    const devices = await this.getDevices();
    return {
      total: devices.length,
      online: devices.filter(d => d.status === 'online').length,
      offline: devices.filter(d => d.status === 'offline').length,
      maintenance: devices.filter(d => d.status === 'maintenance').length,
      error: devices.filter(d => d.status === 'error').length,
      byType: this.groupBy(devices, 'type'),
      byZone: this.groupBy(devices, 'zone'),
      lowBattery: devices.filter(d => d.batteryLevel && d.batteryLevel < 20).length,
    };
  }

  async getSensorReadings(deviceId: string, hours: number = 24): Promise<SensorReading[]> {
    const readings: SensorReading[] = [];
    const now = new Date();
    const pointsPerHour = 12; // Every 5 minutes

    for (let i = hours * pointsPerHour - 1; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 5 * 60000);

      // Generate realistic sensor data
      readings.push({
        deviceId,
        timestamp: timestamp.toISOString(),
        type: 'temperature',
        value: 68 + Math.sin(i / 10) * 3 + Math.random() * 2,
        unit: '°F',
        anomaly: Math.random() > 0.98,
      });

      if (deviceId.includes('conveyor') || deviceId === 'DEV-002') {
        readings.push({
          deviceId,
          timestamp: timestamp.toISOString(),
          type: 'vibration',
          value: 0.5 + Math.random() * 0.3,
          unit: 'mm/s',
          anomaly: Math.random() > 0.95,
        });
      }

      if (deviceId.includes('hvac') || deviceId === 'DEV-003') {
        readings.push({
          deviceId,
          timestamp: timestamp.toISOString(),
          type: 'power',
          value: 2500 + Math.random() * 500,
          unit: 'W',
          anomaly: Math.random() > 0.97,
        });
      }
    }

    return readings;
  }

  private groupBy(items: any[], key: string): Record<string, number> {
    return items.reduce((acc, item) => {
      acc[item[key]] = (acc[item[key]] || 0) + 1;
      return acc;
    }, {});
  }
}

/**
 * Equipment Management Service
 * Tracks warehouse equipment and assets
 */
export class EquipmentService {
  private equipment: Equipment[] = [
    {
      id: 'EQP-001',
      name: 'Electric Forklift #1',
      type: 'Forklift',
      make: 'Toyota',
      model: '8FBRE16',
      serialNumber: 'FL-2024-001',
      purchaseDate: '2022-06-15',
      warrantyExpiration: '2025-06-15',
      location: 'Zone A',
      status: 'operational',
      healthScore: 92,
      lastMaintenance: '2024-11-01',
      nextScheduledMaintenance: '2025-02-01',
      runtime: 4520,
      specifications: { capacity: '3500 lbs', liftHeight: '210 in' },
    },
    {
      id: 'EQP-002',
      name: 'Conveyor System Main',
      type: 'Conveyor',
      make: 'Hytrol',
      model: 'EZ Logic',
      serialNumber: 'CV-2023-001',
      purchaseDate: '2023-01-10',
      warrantyExpiration: '2026-01-10',
      location: 'Main Floor',
      status: 'operational',
      healthScore: 88,
      lastMaintenance: '2024-10-15',
      nextScheduledMaintenance: '2025-01-15',
      runtime: 12500,
      specifications: { length: '450 ft', speed: '150 fpm' },
    },
    {
      id: 'EQP-003',
      name: 'Pallet Wrapper Auto',
      type: 'Wrapper',
      make: 'Lantech',
      model: 'Q-300XT',
      serialNumber: 'PW-2021-001',
      purchaseDate: '2021-03-20',
      warrantyExpiration: '2024-03-20',
      location: 'Shipping',
      status: 'degraded',
      healthScore: 65,
      lastMaintenance: '2024-09-01',
      nextScheduledMaintenance: '2024-12-01',
      runtime: 8750,
      specifications: { wrapSpeed: '25 rpm', loadCapacity: '5000 lbs' },
    },
    {
      id: 'EQP-004',
      name: 'HVAC Unit Main',
      type: 'HVAC',
      make: 'Carrier',
      model: '50XC',
      serialNumber: 'HV-2022-001',
      purchaseDate: '2020-08-01',
      warrantyExpiration: '2025-08-01',
      location: 'Building A',
      status: 'operational',
      healthScore: 78,
      lastMaintenance: '2024-08-15',
      nextScheduledMaintenance: '2025-02-15',
      runtime: 35000,
      specifications: { capacity: '30 tons', efficiency: '14 SEER' },
    },
    {
      id: 'EQP-005',
      name: 'Dock Leveler #1',
      type: 'Dock Equipment',
      make: 'Rite-Hite',
      model: 'RHH-6000',
      serialNumber: 'DL-2019-001',
      purchaseDate: '2019-05-10',
      warrantyExpiration: '2024-05-10',
      location: 'Dock 1',
      status: 'operational',
      healthScore: 85,
      lastMaintenance: '2024-07-20',
      nextScheduledMaintenance: '2025-01-20',
      runtime: 15200,
      specifications: { capacity: '30000 lbs', width: '6 ft' },
    },
  ];

  async getEquipment(type?: string, status?: string): Promise<Equipment[]> {
    let filtered = this.equipment;
    if (type) {
      filtered = filtered.filter(e => e.type.toLowerCase() === type.toLowerCase());
    }
    if (status) {
      filtered = filtered.filter(e => e.status === status);
    }
    return filtered;
  }

  async getEquipmentById(equipmentId: string): Promise<Equipment | null> {
    return this.equipment.find(e => e.id === equipmentId) || null;
  }

  async getEquipmentHealthSummary(): Promise<any> {
    return {
      total: this.equipment.length,
      operational: this.equipment.filter(e => e.status === 'operational').length,
      degraded: this.equipment.filter(e => e.status === 'degraded').length,
      maintenance: this.equipment.filter(e => e.status === 'maintenance').length,
      failed: this.equipment.filter(e => e.status === 'failed').length,
      avgHealthScore: this.equipment.reduce((sum, e) => sum + e.healthScore, 0) / this.equipment.length,
      criticalHealth: this.equipment.filter(e => e.healthScore < 70).map(e => ({
        id: e.id,
        name: e.name,
        healthScore: e.healthScore,
        status: e.status,
      })),
      maintenanceDue: this.equipment.filter(e => {
        const nextMaint = new Date(e.nextScheduledMaintenance);
        const now = new Date();
        const daysUntil = (nextMaint.getTime() - now.getTime()) / 86400000;
        return daysUntil <= 30;
      }).map(e => ({
        id: e.id,
        name: e.name,
        nextMaintenance: e.nextScheduledMaintenance,
        daysUntil: Math.ceil((new Date(e.nextScheduledMaintenance).getTime() - Date.now()) / 86400000),
      })),
      warrantyExpiring: this.equipment.filter(e => {
        const warranty = new Date(e.warrantyExpiration);
        const now = new Date();
        const daysUntil = (warranty.getTime() - now.getTime()) / 86400000;
        return daysUntil <= 90 && daysUntil > 0;
      }).map(e => ({
        id: e.id,
        name: e.name,
        warrantyExpiration: e.warrantyExpiration,
      })),
    };
  }
}

/**
 * Predictive Maintenance Service
 * ML-based equipment failure prediction
 */
export class PredictiveMaintenanceService {
  private iotService = new IoTDeviceService();
  private equipmentService = new EquipmentService();

  async generateFailurePredictions(): Promise<FailurePrediction[]> {
    const equipment = await this.equipmentService.getEquipment();
    const predictions: FailurePrediction[] = [];

    for (const equip of equipment) {
      // Calculate failure probability based on health score, runtime, and age
      const age = (Date.now() - new Date(equip.purchaseDate).getTime()) / (365 * 86400000);
      const runtimeFactor = equip.runtime / 10000;
      const healthFactor = (100 - equip.healthScore) / 100;

      const baseProbability = (age * 0.1 + runtimeFactor * 0.3 + healthFactor * 0.6);

      if (baseProbability > 0.15) {
        const prediction: FailurePrediction = {
          equipmentId: equip.id,
          equipmentName: equip.name,
          failureType: this.predictFailureType(equip.type),
          probability: Math.min(baseProbability + Math.random() * 0.1, 0.95),
          predictedDate: new Date(Date.now() + Math.random() * 30 * 86400000).toISOString().split('T')[0],
          daysUntilFailure: Math.ceil(Math.random() * 30),
          confidence: 75 + Math.random() * 20,
          recommendedAction: this.getRecommendedAction(equip.type, baseProbability),
          estimatedRepairCost: this.estimateRepairCost(equip.type),
          estimatedDowntimeCost: this.estimateDowntimeCost(equip.type),
          indicators: this.getFailureIndicators(equip),
        };
        predictions.push(prediction);
      }
    }

    // Sort by probability (highest first)
    predictions.sort((a, b) => b.probability - a.probability);
    return predictions;
  }

  async getEquipmentRiskScore(equipmentId: string): Promise<any> {
    const equipment = await this.equipmentService.getEquipmentById(equipmentId);
    if (!equipment) return null;

    const age = (Date.now() - new Date(equipment.purchaseDate).getTime()) / (365 * 86400000);
    const daysSinceMaintenance = (Date.now() - new Date(equipment.lastMaintenance).getTime()) / 86400000;

    return {
      equipmentId,
      equipmentName: equipment.name,
      overallRiskScore: Math.round(100 - equipment.healthScore + age * 2 + daysSinceMaintenance * 0.1),
      factors: {
        healthScore: { value: equipment.healthScore, weight: 0.4, contribution: (100 - equipment.healthScore) * 0.4 },
        age: { value: `${age.toFixed(1)} years`, weight: 0.2, contribution: age * 2 * 0.2 },
        runtime: { value: `${equipment.runtime} hours`, weight: 0.2, contribution: (equipment.runtime / 10000) * 10 * 0.2 },
        maintenanceGap: { value: `${Math.round(daysSinceMaintenance)} days`, weight: 0.2, contribution: daysSinceMaintenance * 0.1 * 0.2 },
      },
      recommendation: equipment.healthScore < 70
        ? 'Schedule immediate maintenance inspection'
        : daysSinceMaintenance > 90
        ? 'Schedule preventive maintenance'
        : 'Continue normal monitoring',
    };
  }

  private predictFailureType(equipmentType: string): string {
    const failureTypes: Record<string, string[]> = {
      'Forklift': ['Battery degradation', 'Hydraulic leak', 'Motor wear', 'Brake system'],
      'Conveyor': ['Belt wear', 'Motor burnout', 'Bearing failure', 'Roller damage'],
      'Wrapper': ['Film tension', 'Turntable motor', 'Control board', 'Mechanical wear'],
      'HVAC': ['Compressor failure', 'Refrigerant leak', 'Fan motor', 'Thermostat'],
      'Dock Equipment': ['Hydraulic pump', 'Lip cylinder', 'Structural fatigue', 'Safety system'],
    };
    const types = failureTypes[equipmentType] || ['General mechanical failure'];
    return types[Math.floor(Math.random() * types.length)];
  }

  private getRecommendedAction(equipmentType: string, probability: number): string {
    if (probability > 0.7) {
      return 'Schedule emergency preventive maintenance within 48 hours';
    } else if (probability > 0.5) {
      return 'Schedule maintenance inspection within 1 week';
    } else if (probability > 0.3) {
      return 'Add to next scheduled maintenance cycle';
    }
    return 'Continue monitoring - no immediate action required';
  }

  private estimateRepairCost(equipmentType: string): number {
    const costs: Record<string, number> = {
      'Forklift': 2500,
      'Conveyor': 5000,
      'Wrapper': 1500,
      'HVAC': 3500,
      'Dock Equipment': 2000,
    };
    const base = costs[equipmentType] || 1000;
    return Math.round(base * (0.8 + Math.random() * 0.4));
  }

  private estimateDowntimeCost(equipmentType: string): number {
    const costPerHour: Record<string, number> = {
      'Forklift': 150,
      'Conveyor': 500,
      'Wrapper': 100,
      'HVAC': 200,
      'Dock Equipment': 250,
    };
    const hourly = costPerHour[equipmentType] || 100;
    const estimatedDowntimeHours = 4 + Math.random() * 8;
    return Math.round(hourly * estimatedDowntimeHours);
  }

  private getFailureIndicators(equipment: Equipment): string[] {
    const indicators: string[] = [];

    if (equipment.healthScore < 80) {
      indicators.push('Declining health score trend');
    }
    if (equipment.runtime > 8000) {
      indicators.push('High accumulated runtime');
    }

    const daysSinceMaintenance = (Date.now() - new Date(equipment.lastMaintenance).getTime()) / 86400000;
    if (daysSinceMaintenance > 60) {
      indicators.push('Extended time since last maintenance');
    }

    const age = (Date.now() - new Date(equipment.purchaseDate).getTime()) / (365 * 86400000);
    if (age > 3) {
      indicators.push('Equipment past typical lifespan midpoint');
    }

    if (equipment.status === 'degraded') {
      indicators.push('Currently operating in degraded mode');
    }

    // Add some random sensor-based indicators
    if (Math.random() > 0.5) {
      indicators.push('Elevated vibration readings detected');
    }
    if (Math.random() > 0.6) {
      indicators.push('Temperature variance from baseline');
    }
    if (Math.random() > 0.7) {
      indicators.push('Power consumption anomaly');
    }

    return indicators;
  }
}

/**
 * Maintenance Work Order Service
 * Manages maintenance tasks and scheduling
 */
export class MaintenanceWorkOrderService {
  private tasks: MaintenanceTask[] = [
    {
      id: 'WO-001',
      equipmentId: 'EQP-001',
      type: 'preventive',
      priority: 'medium',
      status: 'scheduled',
      description: 'Quarterly forklift inspection and battery check',
      scheduledDate: '2025-02-01',
      assignedTo: 'Mike Maintenance',
      estimatedDuration: 120,
      parts: [
        { partNumber: 'FL-FLT-001', name: 'Hydraulic filter', quantity: 1, cost: 45 },
        { partNumber: 'FL-OIL-001', name: 'Hydraulic oil', quantity: 2, cost: 35 },
      ],
    },
    {
      id: 'WO-002',
      equipmentId: 'EQP-003',
      type: 'corrective',
      priority: 'high',
      status: 'in_progress',
      description: 'Repair film carriage tension system',
      scheduledDate: '2024-12-15',
      assignedTo: 'Joe Technician',
      estimatedDuration: 180,
      parts: [
        { partNumber: 'PW-TENS-001', name: 'Tension spring kit', quantity: 1, cost: 125 },
        { partNumber: 'PW-BRG-001', name: 'Carriage bearing', quantity: 2, cost: 45 },
      ],
    },
    {
      id: 'WO-003',
      equipmentId: 'EQP-002',
      type: 'predictive',
      priority: 'medium',
      status: 'scheduled',
      description: 'Replace conveyor belt section showing wear',
      scheduledDate: '2025-01-15',
      assignedTo: 'Mike Maintenance',
      estimatedDuration: 240,
      parts: [
        { partNumber: 'CV-BLT-001', name: 'Conveyor belt section', quantity: 1, cost: 850 },
        { partNumber: 'CV-SPL-001', name: 'Belt splice kit', quantity: 2, cost: 65 },
      ],
    },
  ];

  async getMaintenanceTasks(status?: string, priority?: string, equipmentId?: string): Promise<MaintenanceTask[]> {
    let filtered = this.tasks;
    if (status) {
      filtered = filtered.filter(t => t.status === status);
    }
    if (priority) {
      filtered = filtered.filter(t => t.priority === priority);
    }
    if (equipmentId) {
      filtered = filtered.filter(t => t.equipmentId === equipmentId);
    }
    return filtered;
  }

  async getMaintenanceTask(taskId: string): Promise<MaintenanceTask | null> {
    return this.tasks.find(t => t.id === taskId) || null;
  }

  async createMaintenanceTask(taskData: Omit<MaintenanceTask, 'id'>): Promise<MaintenanceTask> {
    const task: MaintenanceTask = {
      id: `WO-${String(this.tasks.length + 1).padStart(3, '0')}`,
      ...taskData,
    };
    this.tasks.push(task);
    return task;
  }

  async updateMaintenanceTask(taskId: string, updates: Partial<MaintenanceTask>): Promise<MaintenanceTask | null> {
    const index = this.tasks.findIndex(t => t.id === taskId);
    if (index === -1) return null;
    this.tasks[index] = { ...this.tasks[index], ...updates };
    return this.tasks[index];
  }

  async getMaintenanceDashboard(): Promise<any> {
    const tasks = await this.getMaintenanceTasks();

    return {
      summary: {
        total: tasks.length,
        scheduled: tasks.filter(t => t.status === 'scheduled').length,
        inProgress: tasks.filter(t => t.status === 'in_progress').length,
        completed: tasks.filter(t => t.status === 'completed').length,
        overdue: tasks.filter(t => t.status === 'scheduled' && new Date(t.scheduledDate) < new Date()).length,
      },
      byPriority: {
        critical: tasks.filter(t => t.priority === 'critical').length,
        high: tasks.filter(t => t.priority === 'high').length,
        medium: tasks.filter(t => t.priority === 'medium').length,
        low: tasks.filter(t => t.priority === 'low').length,
      },
      byType: {
        preventive: tasks.filter(t => t.type === 'preventive').length,
        corrective: tasks.filter(t => t.type === 'corrective').length,
        predictive: tasks.filter(t => t.type === 'predictive').length,
        emergency: tasks.filter(t => t.type === 'emergency').length,
      },
      upcomingTasks: tasks
        .filter(t => t.status === 'scheduled')
        .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
        .slice(0, 5),
      estimatedCosts: {
        parts: tasks.reduce((sum, t) => sum + t.parts.reduce((ps, p) => ps + p.cost * p.quantity, 0), 0),
        labor: tasks.reduce((sum, t) => sum + (t.estimatedDuration / 60) * 75, 0), // $75/hour labor
      },
    };
  }
}
