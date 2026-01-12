import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import { storage } from '@server/storage';
import { hashSync } from 'bcryptjs';
import { Role } from '@shared/prisma-enums';

/**
 * POST /api/admin/department-users
 * Create a new user in manager's department
 * Managers can only add users to their assigned departments
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only Supervisor, Manager roles, and above can add users
    const allowedRoles = ['Supervisor', 'Inventory', 'Purchasing', 'Maintenance', 'QC', 'Executive', 'Admin', 'SuperAdmin'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { error: 'Only managers can add users to departments' },
        { status: 403 }
      );
    }

    const { email, firstName, lastName, badgeNumber, pin, roleId, assignedDepartments } =
      await req.json();

    // Validate required fields
    if (!email || !firstName || !lastName || !badgeNumber || !pin) {
      return NextResponse.json(
        { error: 'Email, first name, last name, badge number, and PIN are required' },
        { status: 400 }
      );
    }

    // Validate PIN is 4 digits
    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { error: 'PIN must be 4 digits' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await storage.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 400 }
      );
    }

    // Check if badge number already exists
    const existingBadge = await storage.prisma.badge.findFirst({
      where: {
        badgeNumber,
        tenantId: user.tenantId,
      },
    });

    if (existingBadge) {
      return NextResponse.json(
        { error: 'This badge number is already in use' },
        { status: 400 }
      );
    }

    // Get custom role if provided
    let customRole = null;
    let baseRole: Role = Role.Operator; // Default to Operator

    if (roleId) {
      customRole = await storage.prisma.tenantRoleConfig.findUnique({
        where: {
          id: roleId,
          tenantId: user.tenantId,
        },
      });

      if (!customRole) {
        return NextResponse.json(
          { error: 'Custom role not found' },
          { status: 400 }
        );
      }

      baseRole = customRole.baseRole as Role;
    }

    // Hash the PIN for security
    const hashedPin = hashSync(pin, 10);

    // Create the user
    const newUser = await storage.prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        password: hashedPin, // Store PIN as password for mobile login
        role: baseRole,
        tenantId: user.tenantId,
        customRoleId: roleId || null,
        assignedDepartments: assignedDepartments || [],
        isActive: true,
      },
    });

    // Create badge for the user
    await storage.prisma.badge.create({
      data: {
        badgeNumber,
        userId: newUser.id,
        tenantId: user.tenantId,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        badgeNumber,
        role: baseRole,
        customRoleName: customRole?.customName,
        assignedDepartments: newUser.assignedDepartments,
      },
    });
  } catch (error) {
    console.error('Error creating department user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/department-users
 * Get all users in manager's departments
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const department = searchParams.get('department');

    // Build query based on user role
    let whereClause: any = {
      tenantId: user.tenantId,
    };

    // SuperAdmin and Executive see all users
    if (!['SuperAdmin', 'Executive', 'Admin'].includes(user.role)) {
      // Managers only see users in their departments
      const assignedDepartments = (user as any).assignedDepartments;
      if (assignedDepartments && assignedDepartments.length > 0) {
        whereClause.assignedDepartments = {
          hasSome: assignedDepartments,
        };
      }
    }

    // Filter by specific department if requested
    if (department && department !== 'all') {
      whereClause.assignedDepartments = {
        has: department,
      };
    }

    const users = await storage.prisma.user.findMany({
      where: whereClause,
      include: {
        customRole: true,
        badges: {
          where: { isActive: true },
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        badgeNumber: u.badges[0]?.badgeNumber || null,
        role: u.customRole?.customName || u.role,
        baseRole: u.role,
        department: u.assignedDepartments[0] || 'Unassigned',
        assignedDepartments: u.assignedDepartments,
        isActive: u.isActive,
      })),
    });
  } catch (error) {
    console.error('Error fetching department users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
