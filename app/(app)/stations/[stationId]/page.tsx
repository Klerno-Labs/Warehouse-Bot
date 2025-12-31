"use client";

import StationPage from "@/pages/stations/station";

export default function Page({ params }: { params: { stationId: string } }) {
  return <StationPage stationId={params.stationId} />;
}
