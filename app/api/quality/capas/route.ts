import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole, handleApiError } from '@app/api/_utils/middleware';
import storage from '@/server/storage';

/**
 * GET /api/quality/capas
 * Get all CAPAs (Corrective and Preventive Actions)
 */
export async function GET(req: NextRequest) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: any = {
      tenantId: context.user.tenantId,
    };

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.capaNumber = { contains: search, mode: 'insensitive' };
    }

    const capas = await storage.cAPA.findMany({
      where,
      include: {
        ncr: {
          select: {
            id: true,
            ncrNumber: true,
            issueType: true,
            severity: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ capas });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/quality/capas
 * Create a new CAPA
 */
export async function POST(req: NextRequest) {
  try {
    const context = await requireAuth();
    if (context instanceof NextResponse) return context;

    // Only QC, Supervisor, and Admin can create CAPAs
    const roleCheck = requireRole(context, ['Admin', 'Supervisor'] as any);
    if (roleCheck instanceof NextResponse) return roleCheck;

    const body = await req.json();
    const {
      type,
      sourceType,
      ncrId,
      problemStatement,
      rootCauseAnalysis,
      proposedActions,
      responsiblePerson,
      targetDate,
      implementationPlan,
      verificationMethod,
    } = body;

    // Validate required fields
    if (!type || !sourceType || !problemStatement || !proposedActions) {
      return NextResponse.json(
        { error: 'Missing required fields: type, sourceType, problemStatement, proposedActions' },
        { status: 400 }
      );
    }

    // Generate CAPA number
    const count = await storage.cAPA.count({
      where: { tenantId: context.user.tenantId },
    });
    const capaNumber = `CAPA-${String(count + 1).padStart(6, '0')}`;

    const capa = await storage.cAPA.create({
      data: {
        tenantId: context.user.tenantId,
        capaNumber,
        type,
        sourceType,
        ncrId,
        problemStatement,
        rootCauseAnalysis,
        proposedActions,
        responsiblePerson,
        targetDate: targetDate ? new Date(targetDate) : null,
        implementationPlan,
        verificationMethod,
        status: 'OPEN',
      },
      include: {
        ncr: true,
      },
    });

    return NextResponse.json({ capa }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
