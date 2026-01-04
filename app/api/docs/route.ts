import { NextResponse } from "next/server";
import { openApiSpec } from "./openapi";

/**
 * OpenAPI Documentation Endpoint
 * 
 * Returns the OpenAPI specification for the Warehouse Core API.
 * Use with Swagger UI or other OpenAPI tools.
 */
export async function GET() {
  return NextResponse.json(openApiSpec, {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
