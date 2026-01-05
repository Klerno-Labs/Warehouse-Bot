/**
 * Validation System Tests
 *
 * Comprehensive tests for input validation, sanitization, and security.
 */

import { describe, it, expect } from "vitest";
import {
  sanitizeString,
  validatePagination,
  validateSearchQuery,
  validateEmail,
  validatePassword,
  validateUUID,
  validateDate,
  validateDateRange,
  validateNumber,
  validateJSON,
  VALIDATION_LIMITS,
} from "@/server/validation";
import { ValidationError } from "@/server/errors";

describe("Input Validation System", () => {
  describe("sanitizeString", () => {
    it("should remove null bytes", () => {
      const result = sanitizeString("test\x00string");
      expect(result).toBe("teststring");
    });

    it("should trim whitespace", () => {
      const result = sanitizeString("  test string  ");
      expect(result).toBe("test string");
    });

    it("should limit length", () => {
      const longString = "a".repeat(20000);
      const result = sanitizeString(longString);
      expect(result.length).toBe(VALIDATION_LIMITS.MAX_STRING_LENGTH);
    });

    it("should respect custom max length", () => {
      const result = sanitizeString("test string", 5);
      expect(result).toBe("test ");
    });
  });

  describe("validatePagination", () => {
    it("should return default values for empty params", () => {
      const result = validatePagination({});
      expect(result.limit).toBe(VALIDATION_LIMITS.DEFAULT_PAGE_SIZE);
      expect(result.offset).toBe(0);
    });

    it("should parse string numbers", () => {
      const result = validatePagination({ limit: "100", offset: "50" });
      expect(result.limit).toBe(100);
      expect(result.offset).toBe(50);
    });

    it("should cap limit at MAX_PAGE_SIZE", () => {
      const result = validatePagination({ limit: "999999" });
      expect(result.limit).toBe(VALIDATION_LIMITS.MAX_PAGE_SIZE);
    });

    it("should reject negative offset", () => {
      expect(() => {
        validatePagination({ offset: "-10" });
      }).toThrow(ValidationError);
    });

    it("should reject negative limit", () => {
      expect(() => {
        validatePagination({ limit: "-5" });
      }).toThrow(ValidationError);
    });

    it("should reject invalid numbers", () => {
      expect(() => {
        validatePagination({ limit: "abc" });
      }).toThrow(ValidationError);
    });
  });

  describe("validateSearchQuery", () => {
    it("should handle empty/null queries", () => {
      expect(validateSearchQuery(null)).toBe("");
      expect(validateSearchQuery(undefined)).toBe("");
      expect(validateSearchQuery("")).toBe("");
    });

    it("should sanitize and lowercase", () => {
      const result = validateSearchQuery("  TEST Query  ");
      expect(result).toBe("test query");
    });

    it("should limit length", () => {
      const longQuery = "a".repeat(500);
      const result = validateSearchQuery(longQuery);
      expect(result.length).toBe(VALIDATION_LIMITS.MAX_SEARCH_LENGTH);
    });

    it("should detect SQL injection patterns", () => {
      const sqlInjections = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "admin'--",
        "' OR 1=1 --",
        "SELECT * FROM users",
        "INSERT INTO users",
        "UPDATE users SET",
        "DELETE FROM users",
      ];

      sqlInjections.forEach((injection) => {
        expect(() => {
          validateSearchQuery(injection);
        }).toThrow(ValidationError);
      });
    });

    it("should allow safe queries", () => {
      const safeQueries = [
        "laptop",
        "office chair",
        "SKU-12345",
        "widget (type-A)",
        "item-name-123",
      ];

      safeQueries.forEach((query) => {
        expect(() => validateSearchQuery(query)).not.toThrow();
      });
    });
  });

  describe("validateEmail", () => {
    it("should accept valid emails", () => {
      const validEmails = [
        "test@example.com",
        "user.name@company.co.uk",
        "admin+tag@test.io",
      ];

      validEmails.forEach((email) => {
        expect(() => validateEmail(email)).not.toThrow();
      });
    });

    it("should normalize email (trim, lowercase)", () => {
      const result = validateEmail("  TEST@EXAMPLE.COM  ");
      expect(result).toBe("test@example.com");
    });

    it("should reject invalid emails", () => {
      const invalidEmails = [
        "notanemail",
        "@example.com",
        "user@",
        "user @example.com",
        "user@.com",
      ];

      invalidEmails.forEach((email) => {
        expect(() => validateEmail(email)).toThrow(ValidationError);
      });
    });

    it("should reject emails longer than 255 characters", () => {
      const longEmail = "a".repeat(250) + "@example.com";
      expect(() => validateEmail(longEmail)).toThrow(ValidationError);
    });
  });

  describe("validatePassword", () => {
    it("should reject passwords shorter than 12 characters", () => {
      expect(() => validatePassword("Short1!")).toThrow(ValidationError);
    });

    it("should reject passwords longer than 128 characters", () => {
      const longPassword = "A1!" + "a".repeat(200);
      expect(() => validatePassword(longPassword)).toThrow(ValidationError);
    });

    it("should require complexity (3 of 4 categories)", () => {
      const weakPasswords = [
        "alllowercase1",  // Only lowercase + number (2)
        "ALLUPPERCASE1",  // Only uppercase + number (2)
        "NoNumbers!!!",   // Only uppercase + lowercase + special (3) - should pass
        "12345678901234", // Only numbers (1)
      ];

      expect(() => validatePassword(weakPasswords[0])).toThrow(ValidationError);
      expect(() => validatePassword(weakPasswords[1])).toThrow(ValidationError);
      expect(() => validatePassword(weakPasswords[2])).not.toThrow(); // Has 3 categories
      expect(() => validatePassword(weakPasswords[3])).toThrow(ValidationError);
    });

    it("should reject common passwords", () => {
      const commonPasswords = [
        "Password123!",
        "Admin12345!",
        "Letmein123!",
        "Welcome123!",
      ];

      commonPasswords.forEach((password) => {
        expect(() => validatePassword(password)).toThrow(ValidationError);
      });
    });

    it("should accept strong passwords", () => {
      const strongPasswords = [
        "MyS3cur3P@ssw0rd!",
        "Tr0ub4dor&3Plus",
        "C0mpl3x!P@ssphrase",
      ];

      strongPasswords.forEach((password) => {
        expect(() => validatePassword(password)).not.toThrow();
      });
    });
  });

  describe("validateUUID", () => {
    it("should accept valid UUIDs", () => {
      const validUUIDs = [
        "550e8400-e29b-41d4-a716-446655440000",
        "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      ];

      validUUIDs.forEach((uuid) => {
        expect(() => validateUUID(uuid)).not.toThrow();
      });
    });

    it("should reject invalid UUIDs", () => {
      const invalidUUIDs = [
        "not-a-uuid",
        "550e8400e29b41d4a716446655440000", // No dashes
        "550e8400-e29b-41d4-a716",              // Too short
        "zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz", // Invalid chars
      ];

      invalidUUIDs.forEach((uuid) => {
        expect(() => validateUUID(uuid)).toThrow(ValidationError);
      });
    });
  });

  describe("validateDate", () => {
    it("should accept valid date strings", () => {
      const validDates = [
        "2026-01-04",
        "2026-12-31",
        "2026-01-04T10:30:00Z",
        "2026-01-04T10:30:00.000Z",
      ];

      validDates.forEach((dateString) => {
        expect(() => validateDate(dateString)).not.toThrow();
      });
    });

    it("should reject invalid date strings", () => {
      const invalidDates = [
        "not-a-date",
        "2026-13-01",  // Invalid month
        "2026-01-32",  // Invalid day
        "2026/01/04",  // Wrong format
      ];

      invalidDates.forEach((dateString) => {
        expect(() => validateDate(dateString)).toThrow(ValidationError);
      });
    });

    it("should enforce futureOnly constraint", () => {
      const pastDate = "2020-01-01";
      const futureDate = "2030-01-01";

      expect(() => {
        validateDate(pastDate, "date", { futureOnly: true });
      }).toThrow(ValidationError);

      expect(() => {
        validateDate(futureDate, "date", { futureOnly: true });
      }).not.toThrow();
    });

    it("should enforce pastOnly constraint", () => {
      const pastDate = "2020-01-01";
      const futureDate = "2030-01-01";

      expect(() => {
        validateDate(pastDate, "date", { pastOnly: true });
      }).not.toThrow();

      expect(() => {
        validateDate(futureDate, "date", { pastOnly: true });
      }).toThrow(ValidationError);
    });

    it("should enforce min/max date constraints", () => {
      const minDate = new Date("2025-01-01");
      const maxDate = new Date("2027-01-01");

      expect(() => {
        validateDate("2024-06-01", "date", { minDate });
      }).toThrow(ValidationError);

      expect(() => {
        validateDate("2028-06-01", "date", { maxDate });
      }).toThrow(ValidationError);

      expect(() => {
        validateDate("2026-06-01", "date", { minDate, maxDate });
      }).not.toThrow();
    });
  });

  describe("validateDateRange", () => {
    it("should accept valid date ranges", () => {
      const result = validateDateRange("2026-01-01", "2026-01-31");
      expect(result.start).toBeInstanceOf(Date);
      expect(result.end).toBeInstanceOf(Date);
      expect(result.end.getTime()).toBeGreaterThan(result.start.getTime());
    });

    it("should reject ranges where end is before start", () => {
      expect(() => {
        validateDateRange("2026-01-31", "2026-01-01");
      }).toThrow(ValidationError);
    });

    it("should reject ranges where end equals start", () => {
      expect(() => {
        validateDateRange("2026-01-01", "2026-01-01");
      }).toThrow(ValidationError);
    });
  });

  describe("validateNumber", () => {
    it("should accept valid numbers", () => {
      expect(validateNumber(42, "count")).toBe(42);
      expect(validateNumber("42", "count")).toBe(42);
      expect(validateNumber(3.14, "pi")).toBe(3.14);
    });

    it("should reject non-numbers", () => {
      expect(() => validateNumber("abc", "count")).toThrow(ValidationError);
      expect(() => validateNumber(NaN, "count")).toThrow(ValidationError);
    });

    it("should enforce integer constraint", () => {
      expect(() => {
        validateNumber(3.14, "count", { integer: true });
      }).toThrow(ValidationError);

      expect(validateNumber(42, "count", { integer: true })).toBe(42);
    });

    it("should enforce positive constraint", () => {
      expect(() => {
        validateNumber(-10, "count", { positive: true });
      }).toThrow(ValidationError);

      expect(validateNumber(10, "count", { positive: true })).toBe(10);
    });

    it("should enforce min/max constraints", () => {
      expect(() => {
        validateNumber(5, "count", { min: 10 });
      }).toThrow(ValidationError);

      expect(() => {
        validateNumber(15, "count", { max: 10 });
      }).toThrow(ValidationError);

      expect(validateNumber(10, "count", { min: 5, max: 15 })).toBe(10);
    });
  });

  describe("validateJSON", () => {
    it("should parse valid JSON", () => {
      const result = validateJSON('{"key": "value"}');
      expect(result).toEqual({ key: "value" });
    });

    it("should reject invalid JSON", () => {
      expect(() => {
        validateJSON("not json");
      }).toThrow(ValidationError);

      expect(() => {
        validateJSON("{invalid}");
      }).toThrow(ValidationError);
    });

    it("should validate against schema", () => {
      const { z } = require("zod");
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      expect(() => {
        validateJSON('{"name": "John", "age": 30}', schema);
      }).not.toThrow();

      expect(() => {
        validateJSON('{"name": "John"}', schema); // Missing age
      }).toThrow(ValidationError);

      expect(() => {
        validateJSON('{"name": "John", "age": "thirty"}', schema); // Wrong type
      }).toThrow(ValidationError);
    });
  });

  describe("Security Edge Cases", () => {
    it("should handle extremely long inputs", () => {
      const veryLongString = "a".repeat(1000000);

      expect(() => {
        sanitizeString(veryLongString);
      }).not.toThrow();

      const result = sanitizeString(veryLongString);
      expect(result.length).toBeLessThanOrEqual(VALIDATION_LIMITS.MAX_STRING_LENGTH);
    });

    it("should handle unicode and special characters", () => {
      const unicodeString = "Hello 世界 🌍 \u0000";
      const result = sanitizeString(unicodeString);
      expect(result).not.toContain("\u0000");
    });

    it("should handle SQL injection in search", () => {
      const attacks = [
        "' UNION SELECT * FROM users --",
        "1'; DROP TABLE items; --",
        "admin' OR '1'='1' --",
        "x' AND 1=(SELECT COUNT(*) FROM users) --",
      ];

      attacks.forEach((attack) => {
        expect(() => validateSearchQuery(attack)).toThrow(ValidationError);
      });
    });

    it("should handle XSS attempts", () => {
      const xssPayloads = [
        "<script>alert('XSS')</script>",
        "<img src=x onerror=alert('XSS')>",
        "<svg onload=alert('XSS')>",
      ];

      // Sanitization should strip these
      xssPayloads.forEach((payload) => {
        const sanitized = sanitizeString(payload);
        // Should not execute as code
        expect(sanitized).not.toContain("<script");
        expect(sanitized).not.toContain("onerror");
        expect(sanitized).not.toContain("onload");
      });
    });
  });
});
