"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import QRCode from "qrcode";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type ItemDetail = {
  id: string;
  publicCode: string;
  sku: string | null;
  name: string;
  defaultLocation: { code: string } | null;
};

export default function ItemLabelPage() {
  const params = useParams<{ id: string }>();
  const itemId = params?.id;
  const { data } = useQuery<{ item: ItemDetail }>({
    queryKey: ["/api/items/" + itemId],
    enabled: Boolean(itemId),
  });
  const item = data?.item;
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_BASE_URL || "";

  const qrValue = useMemo(() => {
    if (!item) return "";
    return `${baseUrl}/i/${item.publicCode}`;
  }, [baseUrl, item]);

  useEffect(() => {
    if (!qrValue) return;
    QRCode.toDataURL(qrValue, { margin: 1, width: 240 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [qrValue]);

  if (!item) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <p className="text-sm text-muted-foreground">Loading label...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Item Label</h1>
        <Button onClick={() => window.print()}>Print</Button>
      </div>

      <Card className="max-w-md print:border-0 print:shadow-none">
        <CardContent className="flex flex-col items-center gap-4 p-6">
          <div className="text-center">
            <p className="text-lg font-semibold">{item.name}</p>
            <p className="text-sm text-muted-foreground">{item.sku || "No SKU"}</p>
          </div>
          {qrDataUrl ? (
            <img src={qrDataUrl} alt={item.publicCode} className="h-40 w-40" />
          ) : (
            <div className="h-40 w-40 rounded-md bg-muted" />
          )}
          <div className="text-center text-sm text-muted-foreground">
            {item.defaultLocation?.code ? (
              <span>Default: {item.defaultLocation.code}</span>
            ) : (
              <span>No default location</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">{qrValue}</div>
        </CardContent>
      </Card>
    </div>
  );
}
