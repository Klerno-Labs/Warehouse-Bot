import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Printer, QrCode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type BarcodeType = "qr" | "code128" | "ean13" | "upc" | "code39";

interface BarcodeGeneratorProps {
  defaultValue?: string;
  defaultType?: BarcodeType;
  showLabel?: boolean;
  label?: string;
}

export function BarcodeGenerator({
  defaultValue = "",
  defaultType = "qr",
  showLabel = true,
  label,
}: BarcodeGeneratorProps) {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [type, setType] = useState<BarcodeType>(defaultType);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (value) {
      generateBarcode();
    }
  }, [value, type]);

  const generateBarcode = async () => {
    if (!value || !canvasRef.current) return;

    setIsGenerating(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    try {
      if (type === "qr") {
        // Generate QR code
        const QRCode = (await import("qrcode")).default;
        await QRCode.toCanvas(canvas, value, {
          width: 300,
          margin: 2,
          color: {
            "#0f172a",
            light: "#ffffff",
          },
        });
      } else {
        // Generate barcode using bwip-js
        const bwipjs = (await import("bwip-js")).default;

        // Map our types to bwip-js types
        const barcodeTypes: Record<Exclude<BarcodeType, "qr">, string> = {
          code128: "code128",
          ean13: "ean13",
          upc: "upca",
          code39: "code39",
        };

        canvas.width = 400;
        canvas.height = 150;

        bwipjs.toCanvas(canvas, {
          bcid: barcodeTypes[type as Exclude<BarcodeType, "qr">],
          text: value,
          scale: 3,
          height: 10,
          includetext: true,
          textxalign: "center",
        });
      }
    } catch (error: any) {
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate barcode",
        variant: "destructive",
      });
      console.error("Barcode generation error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}-${value}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    toast({
      title: "Downloaded",
      description: `Barcode saved as ${type}-${value}.png`,
    });
  };

  const handlePrint = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL();

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({
        title: "Print failed",
        description: "Please allow popups to print",
        variant: "destructive",
      });
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Barcode - ${value}</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              display: flex;
              flex-direction: column;
              align-items: center;
              font-family: Arial, sans-serif;
            }
            img {
              max-width: 100%;
              height: auto;
            }
            .label {
              margin-top: 10px;
              font-size: 14px;
              font-weight: 600;
              text-align: center;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <img src="${dataUrl}" alt="Barcode: ${value}" />
          ${showLabel ? `<div class="label">${label || value}</div>` : ""}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          Barcode Generator
        </CardTitle>
        <CardDescription>
          Generate QR codes and barcodes for items, jobs, and locations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="barcode-value">Value</Label>
            <Input
              id="barcode-value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Enter SKU, Job Number, or Location"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="barcode-type">Barcode Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as BarcodeType)}>
              <SelectTrigger id="barcode-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="qr">QR Code</SelectItem>
                <SelectItem value="code128">Code 128</SelectItem>
                <SelectItem value="ean13">EAN-13</SelectItem>
                <SelectItem value="upc">UPC-A</SelectItem>
                <SelectItem value="code39">Code 39</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-center p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          {value ? (
            <canvas
              ref={canvasRef}
              className="max-w-full h-auto"
              style={{ imageRendering: "pixelated" }}
            />
          ) : (
            <div className="text-center text-muted-foreground py-12">
              <QrCode className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Enter a value to generate barcode</p>
            </div>
          )}
        </div>

        {value && (
          <div className="flex gap-2">
            <Button onClick={handleDownload} variant="outline" className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Download PNG
            </Button>
            <Button onClick={handlePrint} variant="outline" className="flex-1">
              <Printer className="h-4 w-4 mr-2" />
              Print Label
            </Button>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>QR Code:</strong> Best for mobile scanning, stores lots of data</p>
          <p><strong>Code 128:</strong> Compact, good for alphanumeric data</p>
          <p><strong>EAN-13:</strong> Standard retail barcode (13 digits)</p>
          <p><strong>UPC-A:</strong> US retail standard (12 digits)</p>
          <p><strong>Code 39:</strong> Industrial standard, alphanumeric</p>
        </div>
      </CardContent>
    </Card>
  );
}

interface ItemBarcodeProps {
  sku: string;
  name: string;
}

export function ItemBarcode({ sku, name }: ItemBarcodeProps) {
  return <BarcodeGenerator defaultValue={sku} defaultType="qr" label={name} />;
}

interface JobBarcodeProps {
  jobNumber: string;
}

export function JobBarcode({ jobNumber }: JobBarcodeProps) {
  return <BarcodeGenerator defaultValue={jobNumber} defaultType="code128" label={`Job ${jobNumber}`} />;
}

interface LocationBarcodeProps {
  locationLabel: string;
  locationType?: string;
}

export function LocationBarcode({ locationLabel, locationType }: LocationBarcodeProps) {
  return (
    <BarcodeGenerator
      defaultValue={locationLabel}
      defaultType="qr"
      label={`${locationType || "Location"}: ${locationLabel}`}
    />
  );
}
