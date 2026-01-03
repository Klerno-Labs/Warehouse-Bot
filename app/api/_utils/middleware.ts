import { NextResponse } from "next/server";
import { getSessionUserWithRecord } from "./session";
import { storage } from "@server/storage";
import { z } from "zod";

// ============================================================================
// API MIDDLEWARE UTILITIES
// Consolidates duplicate authentication, authorization, and error handling
// patterns across 35+ API routes into reusable functions
// ============================================================================

export type UserRole = "Admin" | "Supervisor" | "Inventory" | "Manufacturing" | "Purchasing" | "Operator" | "Viewer";

export type AuthenticatedContext = {
  user: {
    id: string;
    tenantId: string;
    siteIds: string[];
    role: UserRole;
    email: string;
    name: string;
  };
};

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================

/**
 * Validates session and returns authenticated user context
 * Replaces 35+ identical session validation blocks
 */
export async function requireAuth(): Promise<NextResponse | AuthenticatedContext> {
  const session = await getSessionUserWithRecord();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return {
    user: {
      id: session.user.id,
      tenantId: session.user.tenantId,
      siteIds: session.user.siteIds,
      role: session.user.role as UserRole,
      email: session.user.email,
      name: `${session.user.firstName} ${session.user.lastName}`,
    },
  };
}

// ============================================================================
// AUTHORIZATION MIDDLEWARE
// ============================================================================

/**
 * Checks if user has required role
 * Replaces 20+ identical role validation blocks
 */
export function requireRole(context: AuthenticatedContext, allowedRoles: UserRole[]): NextResponse | true {
  if (!allowedRoles.includes(context.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return true;
}

/**
 * Checks if user has access to specific site
 * Replaces 10+ identical site validation blocks
 */
export function requireSiteAccess(context: AuthenticatedContext, siteId: string): NextResponse | true {
  if (!context.user.siteIds.includes(siteId)) {
    return NextResponse.json({ error: "Site access denied" }, { status: 403 });
  }
  return true;
}

/**
 * Validates tenant ownership of a resource
 * Replaces 25+ identical tenant validation blocks
 */
export async function requireTenantResource<T extends { tenantId: string }>(
  context: AuthenticatedContext,
  resource: T | null | undefined,
  resourceName = "Resource"
): Promise<NextResponse | T> {
  if (!resource) {
    return NextResponse.json({ error: `${resourceName} not found` }, { status: 404 });
  }

  if (resource.tenantId !== context.user.tenantId) {
    return NextResponse.json({ error: `${resourceName} not found` }, { status: 404 });
  }

  return resource;
}

// ============================================================================
// ERROR HANDLING MIDDLEWARE
// ============================================================================

/**
 * Standard error handler for API routes
 * Replaces 31+ identical try-catch error handling blocks
 */
export function handleApiError(error: unknown): NextResponse {
  console.error("API Error:", error);

  // Zod validation errors
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: "Invalid request", details: error.errors },
      { status: 400 }
    );
  }

  // Known error with message
  if (error instanceof Error) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }

  // Unknown error
  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 }
  );
}

/**
 * Wraps an async API handler with standard error handling
 */
export function withErrorHandler<T>(
  handler: () => Promise<T>
): Promise<T | NextResponse> {
  return handler().catch((error) => {
    return handleApiError(error);
  });
}

// ============================================================================
// VALIDATION MIDDLEWARE
// ============================================================================

/**
 * Validates request body against Zod schema
 */
export async function validateBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<NextResponse | T> {
  try {
    const body = await request.json();
    const validated = schema.parse(body);
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.errors },
        { status: 400 }
      );
    }
    throw error;
  }
}

// ============================================================================
// AUDIT LOGGING HELPER
// ============================================================================

/**
 * Creates standardized audit event
 * Replaces 10+ similar audit logging patterns
 */
export async function createAuditLog(
  context: AuthenticatedContext,
  action: string,
  entityType: string,
  entityId: string,
  details: string
): Promise<void> {
  await storage.createAuditEvent({
    tenantId: context.user.tenantId,
    userId: context.user.id,
    action,
    entityType,
    entityId,
    details,
    ipAddress: null,
  });
}

// ============================================================================
// COMBINED MIDDLEWARE HELPERS
// ============================================================================

/**
 * Complete auth + role check in one function
 */
export async function requireAuthWithRole(allowedRoles: UserRole[]): Promise<NextResponse | AuthenticatedContext> {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  const roleCheck = requireRole(authResult, allowedRoles);
  if (roleCheck instanceof NextResponse) return roleCheck;

  return authResult;
}

/**
 * Complete auth + site access check in one function
 */
export async function requireAuthWithSite(siteId: string): Promise<NextResponse | AuthenticatedContext> {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  const siteCheck = requireSiteAccess(authResult, siteId);
  if (siteCheck instanceof NextResponse) return siteCheck;

  return authResult;
}
