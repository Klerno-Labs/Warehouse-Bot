import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@app/api/_utils/session';
import { hasPermission, hasAnyPermission, Permission, Role } from '@shared/permissions';

/**
 * Permission middleware factory
 * Checks if user has required permission(s) before allowing access
 */
export function requirePermission(permission: Permission) {
  return async function (req: NextRequest, handler: (req: NextRequest, user: any) => Promise<NextResponse>) {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(user.role as Role, permission)) {
      return NextResponse.json(
        { error: `Insufficient permissions. Required: ${permission}` },
        { status: 403 }
      );
    }

    return handler(req, user);
  };
}

/**
 * Require ANY of the specified permissions
 */
export function requireAnyPermission(permissions: Permission[]) {
  return async function (req: NextRequest, handler: (req: NextRequest, user: any) => Promise<NextResponse>) {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasAnyPermission(user.role as Role, permissions)) {
      return NextResponse.json(
        { error: `Insufficient permissions. Required one of: ${permissions.join(', ')}` },
        { status: 403 }
      );
    }

    return handler(req, user);
  };
}

/**
 * Require specific role(s)
 */
export function requireRole(...roles: Role[]) {
  return async function (req: NextRequest, handler: (req: NextRequest, user: any) => Promise<NextResponse>) {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!roles.includes(user.role as Role)) {
      return NextResponse.json(
        { error: `Insufficient role. Required one of: ${roles.join(', ')}` },
        { status: 403 }
      );
    }

    return handler(req, user);
  };
}

/**
 * Require minimum tier level
 */
export function requireTier(minTier: number) {
  return async function (req: NextRequest, handler: (req: NextRequest, user: any) => Promise<NextResponse>) {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { getRoleTier } = await import('@shared/permissions');
    const userTier = getRoleTier(user.role as Role);

    if (userTier < minTier) {
      return NextResponse.json(
        { error: `Insufficient access level. Required tier ${minTier} or higher` },
        { status: 403 }
      );
    }

    return handler(req, user);
  };
}

/**
 * Wrapper to apply middleware to route handlers
 * Usage:
 *
 * export const POST = withAuth(
 *   requirePermission(Permission.CREATE_PRODUCTION_ORDER),
 *   async (req, user) => {
 *     // Your handler logic here
 *     return NextResponse.json({ success: true });
 *   }
 * );
 */
export function withAuth(
  middleware: (req: NextRequest, handler: any) => Promise<NextResponse>,
  handler: (req: NextRequest, user: any, context?: any) => Promise<NextResponse>
) {
  return async (req: NextRequest, context?: any) => {
    return middleware(req, (req: NextRequest, user: any) => handler(req, user, context));
  };
}
