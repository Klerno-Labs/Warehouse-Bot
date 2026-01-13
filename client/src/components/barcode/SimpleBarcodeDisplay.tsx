"use client";

import { useEffect, useRef } from "react";

interface SimpleBarcodeDisplayProps {
  value: string;
  type?: "qr" | "code128" | "ean13" | "upc" | "code39";
  width?: number;
  height?: number;
}

export function SimpleBarcodeDisplay({
  value,
  type = "code128",
  width = 2,
  height = 80,
}: SimpleBarcodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!value || !canvasRef.current) return;

    const generateBarcode = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      try {
        if (type === "qr") {
          const QRCode = (await import("qrcode")).default;
          await QRCode.toCanvas(canvas, value, {
            width: 200,
            margin: 2,
            color: {
              "#0f172a",
              light: "#ffffff",
            },
          });
        } else {
          const bwipjs = (await import("bwip-js")).default;
          
          const barcodeTypes: Record<Exclude<typeof type, "qr">, string> = {
            code128: "code128",
            ean13: "ean13",
            upc: "upca",
            code39: "code39",
          };

          canvas.width = 300;
          canvas.height = height + 30;

          bwipjs.toCanvas(canvas, {
            bcid: barcodeTypes[type as Exclude<typeof type, "qr">],
            text: value,
            scale: width,
            height: Math.floor(height / 10),
            includetext: true,
            textxalign: "center",
          });
        }
      } catch (error) {
        console.error("Barcode generation error:", error);
      }
    };

    generateBarcode();
  }, [value, type, width, height]);

  return (
    <div className="flex justify-center">
      <canvas ref={canvasRef} />
    </div>
  );
}
