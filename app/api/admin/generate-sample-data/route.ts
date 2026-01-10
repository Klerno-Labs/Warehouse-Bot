import { NextResponse } from "next/server";
import { requireAuth } from "@app/api/_utils/middleware";
import { generateSampleData } from "../../../../scripts/generate-sample-data";

export async function POST() {
  const context = await requireAuth();
  if (context instanceof NextResponse) return context;

  const tenantId = context.user.tenantId;

  // Only allow SuperAdmin or Admin to generate sample data
  if (!["Admin", "SuperAdmin"].includes(context.user.role)) {
    return NextResponse.json(
      { error: "Insufficient permissions. Only admins can generate sample data." },
      { status: 403 }
    );
  }

  try {
    console.log(`Generating sample data for tenant: ${tenantId}`);

    const result = await generateSampleData(tenantId);

    return NextResponse.json({
      success: true,
      message: "Sample data generated successfully",
      counts: result.counts,
    });
  } catch (error) {
    console.error("Sample data generation error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate sample data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
