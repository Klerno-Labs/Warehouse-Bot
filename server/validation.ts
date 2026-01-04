/**
 * Input Validation & Sanitization Utilities
 *
 * Provides comprehensive validation, sanitization, and security checks
 * for all user input to prevent injection attacks and data corruption.
 */

import { z } from "zod";
import { ValidationError } from "./errors";

/**
 * Constants for validation
 */
export const VALIDATION_LIMITS = {
  MAX_PAGE_SIZE: 1000,
  DEFAULT_PAGE_SIZE: 50,
  MAX_STRING_LENGTH: 10000,
  MAX_SEARCH_LENGTH: 200,
  MIN_PASSWORD_LENGTH: 12,
  MAX_PASSWORD_LENGTH: 128,
  MIN_BCRYPT_ROUNDS: 12,
  MAX_BCRYPT_ROUNDS: 15,
} as const;

/**
 * Sanitize string input - remove dangerous characters
 */
export function sanitizeString(input: string, maxLength?: number): string {
  let sanitized = input.trim();

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, "");

  // Limit length
  if (maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  } else {
    sanitized = sanitized.slice(0, VALIDATION_LIMITS.MAX_STRING_LENGTH);
  }

  return sanitized;
}

/**
 * Validate and sanitize pagination parameters
 */
export function validatePagination(params: {
  limit?: string | number | null;
  offset?: string | number | null;
}): { limit: number; offset: number } {
  let limit = VALIDATION_LIMITS.DEFAULT_PAGE_SIZE;
  let offset = 0;

  if (params.limit !== undefined && params.limit !== null) {
    const parsedLimit = typeof params.limit === "string"
      ? parseInt(params.limit, 10)
      : params.limit;

    if (isNaN(parsedLimit) || parsedLimit < 0) {
      throw new ValidationError("Invalid limit parameter", {
        limit: params.limit,
      });
    }

    limit = Math.min(parsedLimit, VALIDATION_LIMITS.MAX_PAGE_SIZE);
  }

  if (params.offset !== undefined && params.offset !== null) {
    const parsedOffset = typeof params.offset === "string"
      ? parseInt(params.offset, 10)
      : params.offset;

    if (isNaN(parsedOffset) || parsedOffset < 0) {
      throw new ValidationError("Invalid offset parameter", {
        offset: params.offset,
      });
    }

    offset = parsedOffset;
  }

  return { limit, offset };
}

/**
 * Validate search query
 */
export function validateSearchQuery(query: string | null | undefined): string {
  if (!query) return "";

  const sanitized = sanitizeString(query, VALIDATION_LIMITS.MAX_SEARCH_LENGTH);

  // Check for SQL injection patterns (paranoid check)
  const sqlInjectionPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /(--|\/\*|\*\/|;)/,
    /(\bOR\b.*=.*\b)/i,
    /(\bAND\b.*=.*\b)/i,
  ];

  for (const pattern of sqlInjectionPatterns) {
    if (pattern.test(sanitized)) {
      throw new ValidationError("Invalid search query - contains forbidden patterns");
    }
  }

  return sanitized.toLowerCase();
}

/**
 * Validate email address
 */
export function validateEmail(email: string): string {
  const emailSchema = z.string().email().max(255);

  try {
    return emailSchema.parse(email.trim().toLowerCase());
  } catch (error) {
    throw new ValidationError("Invalid email address", { email });
  }
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): void {
  if (password.length < VALIDATION_LIMITS.MIN_PASSWORD_LENGTH) {
    throw new ValidationError(
      `Password must be at least ${VALIDATION_LIMITS.MIN_PASSWORD_LENGTH} characters long`
    );
  }

  if (password.length > VALIDATION_LIMITS.MAX_PASSWORD_LENGTH) {
    throw new ValidationError(
      `Password must not exceed ${VALIDATION_LIMITS.MAX_PASSWORD_LENGTH} characters`
    );
  }

  // Check for complexity
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  const complexityCount = [hasUppercase, hasLowercase, hasNumber, hasSpecial].filter(Boolean).length;

  if (complexityCount < 3) {
    throw new ValidationError(
      "Password must contain at least 3 of: uppercase, lowercase, number, special character"
    );
  }

  // Check for common passwords
  const commonPasswords = [
    "password",
    "123456",
    "qwerty",
    "admin",
    "letmein",
    "welcome",
    "monkey",
    "dragon",
  ];

  if (commonPasswords.some((common) => password.toLowerCase().includes(common))) {
    throw new ValidationError("Password is too common - please choose a stronger password");
  }
}

/**
 * Validate UUID format
 */
export function validateUUID(id: string, fieldName: string = "id"): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(id)) {
    throw new ValidationError(`Invalid ${fieldName} format`, { [fieldName]: id });
  }

  return id;
}

/**
 * Validate date string and convert to Date object
 */
export function validateDate(
  dateString: string,
  fieldName: string = "date",
  options?: {
    minDate?: Date;
    maxDate?: Date;
    futureOnly?: boolean;
    pastOnly?: boolean;
  }
): Date {
  const date = new Date(dateString);

  if (isNaN(date.getTime())) {
    throw new ValidationError(`Invalid ${fieldName} format`, {
      [fieldName]: dateString,
    });
  }

  const now = new Date();

  if (options?.futureOnly && date <= now) {
    throw new ValidationError(`${fieldName} must be in the future`, {
      [fieldName]: dateString,
    });
  }

  if (options?.pastOnly && date >= now) {
    throw new ValidationError(`${fieldName} must be in the past`, {
      [fieldName]: dateString,
    });
  }

  if (options?.minDate && date < options.minDate) {
    throw new ValidationError(`${fieldName} must be after ${options.minDate.toISOString()}`, {
      [fieldName]: dateString,
    });
  }

  if (options?.maxDate && date > options.maxDate) {
    throw new ValidationError(`${fieldName} must be before ${options.maxDate.toISOString()}`, {
      [fieldName]: dateString,
    });
  }

  return date;
}

/**
 * Validate date range
 */
export function validateDateRange(
  startDate: string,
  endDate: string,
  fieldNames: { start: string; end: string } = { start: "startDate", end: "endDate" }
): { start: Date; end: Date } {
  const start = validateDate(startDate, fieldNames.start);
  const end = validateDate(endDate, fieldNames.end);

  if (end <= start) {
    throw new ValidationError(`${fieldNames.end} must be after ${fieldNames.start}`, {
      [fieldNames.start]: startDate,
      [fieldNames.end]: endDate,
    });
  }

  return { start, end };
}

/**
 * Validate numeric value with range
 */
export function validateNumber(
  value: number | string,
  fieldName: string,
  options?: {
    min?: number;
    max?: number;
    integer?: boolean;
    positive?: boolean;
  }
): number {
  const num = typeof value === "string" ? parseFloat(value) : value;

  if (isNaN(num)) {
    throw new ValidationError(`Invalid ${fieldName} - must be a number`, {
      [fieldName]: value,
    });
  }

  if (options?.integer && !Number.isInteger(num)) {
    throw new ValidationError(`${fieldName} must be an integer`, {
      [fieldName]: value,
    });
  }

  if (options?.positive && num < 0) {
    throw new ValidationError(`${fieldName} must be positive`, {
      [fieldName]: value,
    });
  }

  if (options?.min !== undefined && num < options.min) {
    throw new ValidationError(`${fieldName} must be at least ${options.min}`, {
      [fieldName]: value,
    });
  }

  if (options?.max !== undefined && num > options.max) {
    throw new ValidationError(`${fieldName} must not exceed ${options.max}`, {
      [fieldName]: value,
    });
  }

  return num;
}

/**
 * Validate quantity with UOM
 */
export function validateQuantity(
  qty: number,
  uom: string,
  fieldName: string = "quantity"
): void {
  validateNumber(qty, fieldName, { min: 0 });

  // Validate UOM exists (basic check)
  if (!uom || uom.trim().length === 0) {
    throw new ValidationError("Unit of measure (UOM) is required");
  }

  const sanitizedUom = sanitizeString(uom, 50);

  if (sanitizedUom.length === 0) {
    throw new ValidationError("Invalid unit of measure");
  }
}

/**
 * Validate tenant and site access
 */
export function validateTenantAccess(
  resourceTenantId: string,
  userTenantId: string,
  resourceName: string = "Resource"
): void {
  if (resourceTenantId !== userTenantId) {
    throw new ValidationError(`${resourceName} does not belong to your organization`);
  }
}

/**
 * Validate site access
 */
export function validateSiteAccess(
  resourceSiteId: string,
  userSiteIds: string[],
  resourceName: string = "Resource"
): void {
  if (!userSiteIds.includes(resourceSiteId)) {
    throw new ValidationError(`You don't have access to the site for this ${resourceName}`);
  }
}

/**
 * Sanitize SQL LIKE pattern (prevent SQL injection in LIKE clauses)
 */
export function sanitizeLikePattern(pattern: string): string {
  // Escape special LIKE characters
  return pattern
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}

/**
 * Validate and parse JSON safely
 */
export function validateJSON<T = any>(
  jsonString: string,
  schema?: z.ZodSchema<T>
): T {
  let parsed: any;

  try {
    parsed = JSON.parse(jsonString);
  } catch (error) {
    throw new ValidationError("Invalid JSON format");
  }

  if (schema) {
    try {
      return schema.parse(parsed);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError("JSON validation failed", {
          errors: error.errors,
        });
      }
      throw error;
    }
  }

  return parsed;
}

/**
 * Validate file upload
 */
export function validateFileUpload(
  file: File | { size: number; type: string; name: string },
  options?: {
    maxSize?: number; // in bytes
    allowedTypes?: string[];
    allowedExtensions?: string[];
  }
): void {
  const maxSize = options?.maxSize || 10 * 1024 * 1024; // 10MB default

  if (file.size > maxSize) {
    throw new ValidationError(
      `File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`,
      { fileSize: file.size, maxSize }
    );
  }

  if (options?.allowedTypes && !options.allowedTypes.includes(file.type)) {
    throw new ValidationError("File type not allowed", {
      fileType: file.type,
      allowedTypes: options.allowedTypes,
    });
  }

  if (options?.allowedExtensions) {
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension || !options.allowedExtensions.includes(extension)) {
      throw new ValidationError("File extension not allowed", {
        extension,
        allowedExtensions: options.allowedExtensions,
      });
    }
  }
}

/**
 * Extract and validate IP address from request
 */
export function extractIPAddress(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    return forwarded.split(",")[0].trim();
  }

  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP.trim();
  }

  // Fallback
  return "unknown";
}

/**
 * Common Zod schemas for reuse
 */
export const CommonSchemas = {
  pagination: z.object({
    limit: z.coerce.number().int().min(1).max(VALIDATION_LIMITS.MAX_PAGE_SIZE).default(VALIDATION_LIMITS.DEFAULT_PAGE_SIZE),
    offset: z.coerce.number().int().min(0).default(0),
  }),

  search: z.string().max(VALIDATION_LIMITS.MAX_SEARCH_LENGTH).transform(validateSearchQuery),

  email: z.string().email().max(255).transform((e) => e.trim().toLowerCase()),

  password: z.string()
    .min(VALIDATION_LIMITS.MIN_PASSWORD_LENGTH)
    .max(VALIDATION_LIMITS.MAX_PASSWORD_LENGTH)
    .refine((pwd) => {
      try {
        validatePassword(pwd);
        return true;
      } catch {
        return false;
      }
    }, "Password does not meet security requirements"),

  uuid: z.string().uuid(),

  date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),

  positiveNumber: z.number().positive(),

  nonNegativeNumber: z.number().min(0),

  positiveInteger: z.number().int().positive(),

  nonNegativeInteger: z.number().int().min(0),
};
