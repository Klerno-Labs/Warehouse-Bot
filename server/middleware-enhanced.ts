/**
 * Enhanced Middleware with Security & Resilience
 *
 * Wraps existing middleware with comprehensive security, validation,
 * error handling, logging, and performance monitoring.
 */

import { NextResponse } from "next/server";
import { logger, RequestTimer, createLogger } from "./logger";
import { toErrorResponse, AppError, AuthenticationError } from "./errors";
import { extractIPAddress, validatePagination } from "./validation";
import { rateLimit, RateLimitConfig, RateLimitPresets } from "./rate-limit";
import type { AuthenticatedContext, UserRole } from "@/app/api/_utils/middleware";
import { requireAuth as baseRequireAuth, requireRole as baseRequireRole } from "@/app/api/_utils/middleware";

/**
 * Request context with enhanced information
 */
export interface EnhancedContext extends AuthenticatedContext {
  requestId: string;
  ipAddress: string;
  userAgent: string;
  timer: RequestTimer;
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Enhanced authentication middleware with logging and IP tracking
 */
export async function requireAuth(
  req: Request
): Promise<NextResponse | EnhancedContext> {
  const requestId = generateRequestId();
  const ipAddress = extractIPAddress(req);
  const userAgent = req.headers.get("user-agent") || "unknown";
  const timer = new RequestTimer();

  const contextLogger = createLogger({
    requestId,
    ipAddress,
    userAgent,
  });

  try {
    // Call base authentication
    const baseContext = await baseRequireAuth();

    if (baseContext instanceof NextResponse) {
      // Authentication failed
      contextLogger.logSecurityEvent(
        "Authentication failed",
        "medium",
        {
          url: req.url,
          method: req.method,
        }
      );

      return baseContext;
    }

    // Authentication successful - create enhanced context
    const enhancedContext: EnhancedContext = {
      ...baseContext,
      requestId,
      ipAddress,
      userAgent,
      timer,
    };

    // Set logger context for this request
    contextLogger.setContext({
      userId: enhancedContext.user.id,
      tenantId: enhancedContext.user.tenantId,
      userRole: enhancedContext.user.role,
    });

    contextLogger.debug("Authentication successful", {
      userId: enhancedContext.user.id,
      role: enhancedContext.user.role,
    });

    return enhancedContext;
  } catch (error) {
    contextLogger.error("Authentication error", error as Error);

    return NextResponse.json(
      toErrorResponse(error as Error, req.url, requestId),
      { status: 500 }
    );
  }
}

/**
 * Enhanced role-based authorization with logging
 */
export async function requireRole(
  req: Request,
  roles: UserRole[]
): Promise<NextResponse | EnhancedContext> {
  const context = await requireAuth(req);

  if (context instanceof NextResponse) {
    return context;
  }

  // Call base role check
  const baseResult = await baseRequireRole(roles);

  if (baseResult instanceof NextResponse) {
    // Authorization failed
    logger.logSecurityEvent(
      "Authorization failed",
      "medium",
      {
        requestId: context.requestId,
        userId: context.user.id,
        userRole: context.user.role,
        requiredRoles: roles,
        url: req.url,
      }
    );

    return baseResult;
  }

  logger.debug("Authorization successful", {
    requestId: context.requestId,
    userId: context.user.id,
    role: context.user.role,
  });

  return context;
}

/**
 * Middleware composer - combines multiple middleware functions
 */
export function composeMiddleware(
  ...middlewares: Array<(req: Request) => Promise<NextResponse | null>>
) {
  return async (req: Request): Promise<NextResponse | null> => {
    for (const middleware of middlewares) {
      const result = await middleware(req);
      if (result) {
        return result; // Middleware returned a response, stop processing
      }
    }
    return null; // All middleware passed
  };
}

/**
 * Rate limiting middleware wrapper
 */
export function withRateLimit(config: RateLimitConfig) {
  return rateLimit(config);
}

/**
 * Request logging middleware
 */
export function requestLoggingMiddleware() {
  return async (req: Request): Promise<null> => {
    const requestId = generateRequestId();
    const ipAddress = extractIPAddress(req);
    const method = req.method;
    const url = new URL(req.url);

    logger.info("Incoming request", {
      requestId,
      method,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
      ipAddress,
      userAgent: req.headers.get("user-agent"),
    });

    return null;
  };
}

/**
 * Error handling wrapper for API routes
 */
export function withErrorHandling<T>(
  handler: (req: Request, context?: any) => Promise<T>,
  context?: any
) {
  return async (req: Request, routeContext?: any): Promise<NextResponse> => {
    const requestId = generateRequestId();
    const timer = new RequestTimer();

    try {
      const result = await handler(req, context || routeContext);

      const duration = timer.elapsed();
      logger.logRequest(
        req.method,
        new URL(req.url).pathname,
        200,
        duration
      );

      if (result instanceof NextResponse) {
        return result;
      }

      return NextResponse.json(result);
    } catch (error: any) {
      const duration = timer.elapsed();

      // Log error with context
      logger.error(
        `API error: ${req.method} ${new URL(req.url).pathname}`,
        error,
        {
          requestId,
          duration,
          ipAddress: extractIPAddress(req),
        }
      );

      // Convert error to standardized response
      const errorResponse = toErrorResponse(
        error,
        new URL(req.url).pathname,
        requestId
      );

      const statusCode = error instanceof AppError ? error.statusCode : 500;

      logger.logRequest(
        req.method,
        new URL(req.url).pathname,
        statusCode,
        duration
      );

      return NextResponse.json(errorResponse, { status: statusCode });
    }
  };
}

/**
 * Validate request body against schema
 */
export async function validateRequestBody<T>(
  req: Request,
  schema: any // Zod schema
): Promise<{ data: T; error: null } | { data: null; error: NextResponse }> {
  try {
    const body = await req.json();
    const validated = schema.parse(body);

    return { data: validated, error: null };
  } catch (error: any) {
    logger.warn("Request body validation failed", {
      error: error.message,
      url: req.url,
    });

    const errorResponse = toErrorResponse(error, new URL(req.url).pathname);

    return {
      data: null,
      error: NextResponse.json(errorResponse, { status: 400 }),
    };
  }
}

/**
 * Validate and extract pagination parameters
 */
export function extractPaginationParams(req: Request): {
  limit: number;
  offset: number;
} {
  const { searchParams } = new URL(req.url);

  return validatePagination({
    limit: searchParams.get("limit"),
    offset: searchParams.get("offset"),
  });
}

/**
 * Security headers middleware
 */
export function securityHeadersMiddleware() {
  return async (req: Request): Promise<null> => {
    // Headers will be added in the response wrapper
    return null;
  };
}

/**
 * Add security headers to response
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  const headers = response.headers;

  // Prevent clickjacking
  headers.set("X-Frame-Options", "DENY");

  // Prevent MIME type sniffing
  headers.set("X-Content-Type-Options", "nosniff");

  // Enable XSS protection
  headers.set("X-XSS-Protection", "1; mode=block");

  // Referrer policy
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions policy
  headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()");

  // Content Security Policy
  if (process.env.NODE_ENV === "production") {
    headers.set(
      "Content-Security-Policy",
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' data:; " +
      "connect-src 'self'; " +
      "frame-ancestors 'none'"
    );
  }

  return response;
}

/**
 * Wrap response with security headers and logging
 */
export function wrapResponse(
  response: NextResponse,
  req: Request,
  timer: RequestTimer
): NextResponse {
  // Add security headers
  const secureResponse = addSecurityHeaders(response);

  // Log response
  const duration = timer.elapsed();
  logger.logRequest(
    req.method,
    new URL(req.url).pathname,
    response.status,
    duration
  );

  // Add request timing header
  secureResponse.headers.set("X-Response-Time", `${duration}ms`);

  return secureResponse;
}

/**
 * Complete API route wrapper with all middleware
 */
export function createSecureRoute<T = any>(options: {
  handler: (req: Request, context: EnhancedContext) => Promise<T>;
  requiresAuth?: boolean;
  roles?: UserRole[];
  rateLimit?: RateLimitConfig;
}) {
  return async (req: Request, routeContext?: any): Promise<NextResponse> => {
    const timer = new RequestTimer();
    const requestId = generateRequestId();

    try {
      // Apply rate limiting if configured
      if (options.rateLimit) {
        const rateLimitResult = await rateLimit(options.rateLimit)(req);
        if (rateLimitResult) {
          return rateLimitResult;
        }
      }

      // Apply authentication if required
      let context: EnhancedContext | undefined;

      if (options.requiresAuth !== false) {
        const authResult = options.roles
          ? await requireRole(req, options.roles)
          : await requireAuth(req);

        if (authResult instanceof NextResponse) {
          return authResult;
        }

        context = authResult;
      } else {
        // Create minimal context without authentication
        context = {
          requestId,
          ipAddress: extractIPAddress(req),
          userAgent: req.headers.get("user-agent") || "unknown",
          timer,
        } as EnhancedContext;
      }

      // Execute handler
      const result = await options.handler(req, context);

      // Wrap result in Response if needed
      let response: NextResponse;

      if (result instanceof NextResponse) {
        response = result;
      } else {
        response = NextResponse.json(result);
      }

      // Add security headers and logging
      return wrapResponse(response, req, timer);
    } catch (error: any) {
      logger.error(
        `Route error: ${req.method} ${new URL(req.url).pathname}`,
        error,
        {
          requestId,
        }
      );

      const errorResponse = toErrorResponse(
        error,
        new URL(req.url).pathname,
        requestId
      );

      const statusCode = error instanceof AppError ? error.statusCode : 500;

      const response = NextResponse.json(errorResponse, { status: statusCode });
      return wrapResponse(response, req, timer);
    }
  };
}

/**
 * Preset middleware configurations
 */
export const MiddlewarePresets = {
  /**
   * Public endpoint - no auth, standard rate limit
   */
  public: (handler: any) => createSecureRoute({
    handler,
    requiresAuth: false,
    rateLimit: RateLimitPresets.API,
  }),

  /**
   * Authenticated endpoint - requires auth, standard rate limit
   */
  authenticated: (handler: any) => createSecureRoute({
    handler,
    requiresAuth: true,
    rateLimit: RateLimitPresets.API,
  }),

  /**
   * Admin only endpoint - requires admin role, strict rate limit
   */
  adminOnly: (handler: any) => createSecureRoute({
    handler,
    requiresAuth: true,
    roles: ["Admin"],
    rateLimit: RateLimitPresets.WRITE,
  }),

  /**
   * Write endpoint - authenticated, stricter rate limit
   */
  write: (handler: any) => createSecureRoute({
    handler,
    requiresAuth: true,
    rateLimit: RateLimitPresets.WRITE,
  }),

  /**
   * Sensitive operation - authenticated, very strict rate limit
   */
  sensitive: (handler: any) => createSecureRoute({
    handler,
    requiresAuth: true,
    rateLimit: RateLimitPresets.SENSITIVE,
  }),

  /**
   * Authentication endpoint - no auth required, brute force protection
   */
  auth: (handler: any) => createSecureRoute({
    handler,
    requiresAuth: false,
    rateLimit: RateLimitPresets.AUTH,
  }),
};
