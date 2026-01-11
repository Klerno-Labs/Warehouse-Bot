import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import { storage } from '@server/storage';

/**
 * GET /api/quality/capas
 * Get all CAPAs (Corrective and Preventive Actions)
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: any = {
      tenantId: user.tenantId,
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

    const capas = await storage.prisma.cAPA.findMany({
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
    console.error('Error fetching CAPAs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch CAPAs' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/quality/capas
 * Create a new CAPA
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only QC, Supervisor, and Admin can create CAPAs
    if (!['Admin', 'Supervisor', 'QC'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

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
    const count = await storage.prisma.cAPA.count({
      where: { tenantId: user.tenantId },
    });
    const capaNumber = `CAPA-${String(count + 1).padStart(6, '0')}`;

    const capa = await storage.prisma.cAPA.create({
      data: {
        tenantId: user.tenantId,
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
    console.error('Error creating CAPA:', error);
    return NextResponse.json(
      { error: 'Failed to create CAPA' },
      { status: 500 }
    );
  }
}
