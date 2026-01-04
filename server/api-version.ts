/**
 * API Versioning Utilities
 * 
 * Provides versioning support for API backward compatibility.
 * 
 * USAGE:
 * ```typescript
 * import { getApiVersion, transformResponseForVersion } from "@/server/api-version";
 * 
 * export async function GET(req: Request) {
 *   const version = getApiVersion(req);
 *   const data = await fetchData();
 *   return transformResponseForVersion(data, version);
 * }
 * ```
 */

import { NextResponse } from "next/server";

// Supported API versions
export type ApiVersion = "v1" | "v2";

// Current default version
export const CURRENT_API_VERSION: ApiVersion = "v1";

// Minimum supported version
export const MIN_API_VERSION: ApiVersion = "v1";

/**
 * Extract API version from request headers or query params
 */
export function getApiVersion(req: Request): ApiVersion {
  // Check X-API-Version header first
  const headerVersion = req.headers.get("X-API-Version");
  if (headerVersion && isValidVersion(headerVersion)) {
    return headerVersion as ApiVersion;
  }

  // Check Accept header for version (e.g., application/vnd.warehousecore.v1+json)
  const accept = req.headers.get("Accept") || "";
  const versionMatch = accept.match(/vnd\.warehousecore\.(v\d+)/);
  if (versionMatch && isValidVersion(versionMatch[1])) {
    return versionMatch[1] as ApiVersion;
  }

  // Check query parameter
  const url = new URL(req.url);
  const queryVersion = url.searchParams.get("api_version");
  if (queryVersion && isValidVersion(queryVersion)) {
    return queryVersion as ApiVersion;
  }

  return CURRENT_API_VERSION;
}

/**
 * Check if a version string is valid
 */
function isValidVersion(version: string): boolean {
  return ["v1", "v2"].includes(version);
}

/**
 * Version-specific response transformers
 */
type ResponseTransformer = (data: unknown) => unknown;

const responseTransformers: Record<ApiVersion, Record<string, ResponseTransformer>> = {
  v1: {
    // V1 is the base version, no transformations needed
  },
  v2: {
    // V2 transformations (when we add v2)
    "dashboard-stats": (data: any) => ({
      ...data,
      // Add v2-specific fields
      version: "v2",
      // Rename fields for v2 format
      metrics: data.overview,
      warnings: data.alerts,
    }),
  },
};

/**
 * Transform response data for a specific API version
 */
export function transformResponseForVersion<T>(
  data: T,
  version: ApiVersion,
  endpoint?: string
): T {
  if (!endpoint) {
    return data;
  }

  const transformer = responseTransformers[version]?.[endpoint];
  if (transformer) {
    return transformer(data) as T;
  }

  return data;
}

/**
 * Create versioned response with appropriate headers
 */
export function createVersionedResponse(
  data: unknown,
  version: ApiVersion,
  status: number = 200
): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: {
      "X-API-Version": version,
      "X-API-Deprecated": version === MIN_API_VERSION && version !== CURRENT_API_VERSION ? "true" : "false",
    },
  });
}

/**
 * Deprecation warning middleware
 */
export function addDeprecationWarning(
  response: NextResponse,
  deprecatedVersion: ApiVersion,
  sunsetDate: string
): NextResponse {
  response.headers.set("Deprecation", "true");
  response.headers.set("Sunset", sunsetDate);
  response.headers.set(
    "Link",
    `</api/docs>; rel="successor-version"`
  );
  return response;
}

/**
 * Version-aware error response
 */
export function createVersionedError(
  message: string,
  version: ApiVersion,
  status: number = 400,
  details?: Record<string, unknown>
): NextResponse {
  const errorBody: Record<string, unknown> = {
    error: message,
    version,
  };

  if (details) {
    errorBody.details = details;
  }

  return NextResponse.json(errorBody, {
    status,
    headers: {
      "X-API-Version": version,
    },
  });
}

/**
 * Check if request is using a deprecated API version
 */
export function isDeprecatedVersion(version: ApiVersion): boolean {
  const deprecatedVersions: ApiVersion[] = [];
  return deprecatedVersions.includes(version);
}

/**
 * Get version from URL path (for versioned routes like /api/v1/items)
 */
export function getVersionFromPath(pathname: string): ApiVersion | null {
  const match = pathname.match(/\/api\/(v\d+)\//);
  if (match && isValidVersion(match[1])) {
    return match[1] as ApiVersion;
  }
  return null;
}
