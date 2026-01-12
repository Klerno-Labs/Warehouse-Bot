/**
 * Custom Error Classes for Type-Safe Error Handling
 *
 * Provides structured error handling across the application with
 * proper HTTP status codes and error details.
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, any>;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = "INTERNAL_ERROR",
    details?: Record<string, any>,
    isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);

    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;

    Error.captureStackTrace(this);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication required") {
    super(message, 401, "AUTHENTICATION_ERROR");
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = "Permission denied") {
    super(message, 403, "AUTHORIZATION_ERROR");
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, 404, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 409, "CONFLICT", details);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = "Too many requests", retryAfter?: number) {
    super(message, 429, "RATE_LIMIT_EXCEEDED", { retryAfter });
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(
      message,
      500,
      "DATABASE_ERROR",
      originalError ? { originalMessage: originalError.message } : undefined,
      false
    );
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, originalError?: Error) {
    super(
      `External service '${service}' error: ${message}`,
      503,
      "EXTERNAL_SERVICE_ERROR",
      originalError ? { originalMessage: originalError.message } : undefined
    );
  }
}

/**
 * Error response structure for API
 */
export interface ErrorResponse {
  error: {
    message: string;
    code: string;
    statusCode: number;
    details?: Record<string, any>;
    timestamp: string;
    path?: string;
    requestId?: string;
  };
}

/**
 * Convert any error to standardized error response
 */
export function toErrorResponse(
  error: Error | AppError,
  path?: string,
  requestId?: string
): ErrorResponse {
  if (error instanceof AppError) {
    return {
      error: {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        details: error.details,
        timestamp: new Date().toISOString(),
        path,
        requestId,
      },
    };
  }

  // Handle Prisma errors
  if (error.constructor.name === "PrismaClientKnownRequestError") {
    const prismaError = error as any;

    if (prismaError.code === "P2002") {
      // Unique constraint violation
      const fields = prismaError.meta?.target || ["field"];
      return {
        error: {
          message: `A record with this ${fields.join(", ")} already exists`,
          code: "UNIQUE_CONSTRAINT_VIOLATION",
          statusCode: 409,
          details: { fields },
          timestamp: new Date().toISOString(),
          path,
          requestId,
        },
      };
    }

    if (prismaError.code === "P2025") {
      // Record not found
      return {
        error: {
          message: "Record not found",
          code: "NOT_FOUND",
          statusCode: 404,
          timestamp: new Date().toISOString(),
          path,
          requestId,
        },
      };
    }

    if (prismaError.code === "P2003") {
      // Foreign key constraint violation
      return {
        error: {
          message: "Referenced record does not exist",
          code: "FOREIGN_KEY_VIOLATION",
          statusCode: 400,
          details: { field: prismaError.meta?.field_name },
          timestamp: new Date().toISOString(),
          path,
          requestId,
        },
      };
    }
  }

  // Handle Zod validation errors
  if (error.constructor.name === "ZodError") {
    const zodError = error as any;
    return {
      error: {
        message: "Validation failed",
        code: "VALIDATION_ERROR",
        statusCode: 400,
        details: {
          errors: zodError.issues.map((e: any) => ({
            path: e.path.join("."),
            message: e.message,
          })),
        },
        timestamp: new Date().toISOString(),
        path,
        requestId,
      },
    };
  }

  // Generic error
  return {
    error: {
      message: process.env.NODE_ENV === "production"
        ? "An unexpected error occurred"
        : error.message,
      code: "INTERNAL_ERROR",
      statusCode: 500,
      timestamp: new Date().toISOString(),
      path,
      requestId,
    },
  };
}

/**
 * Determine if error should be logged
 */
export function isOperationalError(error: Error | AppError): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}
