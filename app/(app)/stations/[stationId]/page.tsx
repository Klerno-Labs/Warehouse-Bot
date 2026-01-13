"use client";

import { use } from "react";
import StationPage from "@/pages/stations/station";

export default function Page({ params }: { params: Promise<{ stationId: string }> }) {
  const { stationId } = use(params);
  return <StationPage stationId={stationId} />;
}
