import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole, handleApiError } from '@app/api/_utils/middleware';
import storage from '@/server/storage';

/**
 * GET /api/quality/inspections
 * Get all quality inspections with filtering
 */
export async function GET(req: NextRequest) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const inspectionType = searchParams.get('inspectionType');
    const status = searchParams.get('status');
    const itemId = searchParams.get('itemId');
    const search = searchParams.get('search');

    const where: any = {
      tenantId: context.user.tenantId,
    };

    if (inspectionType) {
      where.inspectionType = inspectionType;
    }

    if (status) {
      where.status = status;
    }

    if (itemId) {
      where.itemId = itemId;
    }

    if (search) {
      where.inspectionNumber = { contains: search, mode: 'insensitive' };
    }

    const inspections = await storage.qualityInspection.findMany({
      where,
      include: {
        item: {
          select: {
            id: true,
            sku: true,
            name: true,
          },
        },
        lot: {
          select: {
            id: true,
            lotNumber: true,
          },
        },
        productionOrder: {
          select: {
            id: true,
            orderNumber: true,
          },
        },
        purchaseOrder: {
          select: {
            id: true,
            poNumber: true,
          },
        },
        plan: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            checkpoints: true,
            ncrs: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ inspections });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/quality/inspections
 * Create a new quality inspection
 */
export async function POST(req: NextRequest) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    // Only QC, Supervisor, and Admin can create inspections
    const roleCheck = requireRole(context, ['Admin', 'Supervisor'] as any);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const body = await req.json();
    const {
      inspectionType,
      itemId,
      lotId,
      productionOrderId,
      purchaseOrderId,
      planId,
      sampleSize,
      scheduledDate,
      notes,
      checkpoints,
    } = body;

    // Validate required fields
    if (!inspectionType) {
      return NextResponse.json(
        { error: 'Missing required field: inspectionType' },
        { status: 400 }
      );
    }

    // Generate inspection number
    const count = await storage.qualityInspection.count({
      where: { tenantId: context.user.tenantId },
    });
    const inspectionNumber = `INS-${String(count + 1).padStart(6, '0')}`;

    // If plan is specified, load checkpoint templates
    let checkpointData = checkpoints || [];
    if (planId && (!checkpoints || checkpoints.length === 0)) {
      const plan = await storage.qualityInspectionPlan.findUnique({
        where: { id: planId },
        include: {
          checkpointTemplates: {
            orderBy: { sequence: 'asc' },
          },
        },
      });

      if (plan) {
        checkpointData = plan.checkpointTemplates.map((template: any) => ({
          sequence: template.sequence,
          checkpointName: template.checkpointName,
          description: template.description,
          measurementType: template.measurementType,
          targetValue: template.targetValue,
          upperLimit: template.upperLimit,
          lowerLimit: template.lowerLimit,
          unit: template.unit,
          isCritical: template.isCritical,
        }));
      }
    }

    // Create inspection with checkpoints
    const inspection = await storage.qualityInspection.create({
      data: {
        tenantId: context.user.tenantId,
        inspectionNumber,
        inspectionType,
        itemId,
        lotId,
        productionOrderId,
        purchaseOrderId,
        planId,
        sampleSize,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        notes,
        status: 'PENDING',
        checkpoints: {
          create: checkpointData,
        },
      },
      include: {
        item: true,
        lot: true,
        plan: true,
        checkpoints: {
          orderBy: { sequence: 'asc' },
        },
      },
    });

    return NextResponse.json({ inspection }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
