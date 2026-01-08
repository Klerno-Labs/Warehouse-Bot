import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@app/api/_utils/session";
import { getUsageSummary } from "@app/api/_utils/usage";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const usage = await getUsageSummary(session.tenantId);

    // Calculate percentages for progress bars
    const calculatePercentage = (current: number, limit: number | null) => {
      if (limit === null || limit === 0) return 0;
      return Math.min(100, Math.round((current / limit) * 100));
    };

    return NextResponse.json({
      users: {
        ...usage.users,
        percentage: calculatePercentage(usage.users.current, usage.users.limit),
        unlimited: usage.users.limit === null,
      },
      sites: {
        ...usage.sites,
        percentage: calculatePercentage(usage.sites.current, usage.sites.limit),
        unlimited: usage.sites.limit === null,
      },
      items: {
        ...usage.items,
        percentage: calculatePercentage(usage.items.current, usage.items.limit),
        unlimited: usage.items.limit === null,
      },
      apiCalls: {
        ...usage.apiCalls,
        percentage: calculatePercentage(usage.apiCalls.current, usage.apiCalls.limit),
        unlimited: usage.apiCalls.limit === null,
      },
      storage: {
        currentGb: usage.storage.currentGb,
        limitGb: usage.storage.limitGb,
        percentage: usage.storage.limitGb 
          ? calculatePercentage(usage.storage.currentGb, usage.storage.limitGb)
          : 0,
        unlimited: usage.storage.limitGb === null,
      },
    });
  } catch (error) {
    console.error("Error fetching usage:", error);
    return NextResponse.json(
      { error: "Failed to fetch usage data" },
      { status: 500 }
    );
  }
}
