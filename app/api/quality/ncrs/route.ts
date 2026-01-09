import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/app/api/_utils/getSessionUser';
import storage from '@/server/storage';

/**
 * GET /api/quality/ncrs
 * Get all non-conformance reports
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const severity = searchParams.get('severity');
    const search = searchParams.get('search');

    const where: any = {
      tenantId: user.tenantId,
    };

    if (status) {
      where.status = status;
    }

    if (severity) {
      where.severity = severity;
    }

    if (search) {
      where.ncrNumber = { contains: search, mode: 'insensitive' };
    }

    const ncrs = await storage.nonConformanceReport.findMany({
      where,
      include: {
        item: {
          select: {
            id: true,
            sku: true,
            name: true,
          },
        },
        inspection: {
          select: {
            id: true,
            inspectionNumber: true,
            inspectionType: true,
          },
        },
        productionOrder: {
          select: {
            id: true,
            orderNumber: true,
          },
        },
        _count: {
          select: {
            capas: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ ncrs });
  } catch (error) {
    console.error('Error fetching NCRs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch NCRs' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/quality/ncrs
 * Create a new non-conformance report
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only QC, Supervisor, and Admin can create NCRs
    if (!['Admin', 'Supervisor', 'QC'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await req.json();
    const {
      itemId,
      lotId,
      inspectionId,
      productionOrderId,
      issueType,
      severity,
      description,
      qtyAffected,
      uom,
      capaRequired,
      attachments,
    } = body;

    // Validate required fields
    if (!issueType || !severity || !description || !qtyAffected || !uom) {
      return NextResponse.json(
        { error: 'Missing required fields: issueType, severity, description, qtyAffected, uom' },
        { status: 400 }
      );
    }

    // Generate NCR number
    const count = await storage.nonConformanceReport.count({
      where: { tenantId: user.tenantId },
    });
    const ncrNumber = `NCR-${String(count + 1).padStart(6, '0')}`;

    const ncr = await storage.nonConformanceReport.create({
      data: {
        tenantId: user.tenantId,
        ncrNumber,
        itemId,
        lotId,
        inspectionId,
        productionOrderId,
        issueType,
        severity,
        description,
        qtyAffected,
        uom,
        status: 'OPEN',
        disposition: 'PENDING',
        capaRequired: capaRequired || false,
        reportedBy: user.email,
        reportedAt: new Date(),
        attachments: attachments || null,
      },
      include: {
        item: true,
        inspection: true,
        productionOrder: true,
      },
    });

    return NextResponse.json({ ncr }, { status: 201 });
  } catch (error) {
    console.error('Error creating NCR:', error);
    return NextResponse.json(
      { error: 'Failed to create NCR' },
      { status: 500 }
    );
  }
}
