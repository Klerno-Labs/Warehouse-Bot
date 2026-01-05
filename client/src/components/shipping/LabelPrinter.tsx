import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Printer, Package, FileText, RotateCcw, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShippingLabel {
  orderNumber: string;
  orderDate: Date;
  shipTo: {
    name: string;
    company?: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
    email?: string;
  };
  shipFrom: {
    name: string;
    company: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone: string;
  };
  carrier?: string;
  serviceLevel?: string;
  trackingNumber?: string;
  barcode: string;
  specialInstructions?: string;
}

interface PackingSlipLine {
  sku: string;
  name: string;
  description?: string;
  quantityOrdered: number;
  quantityShipped: number;
  uom: string;
  lotNumber?: string;
  serialNumber?: string;
}

interface PackingSlip {
  orderNumber: string;
  orderDate: Date;
  shipDate: Date;
  shipTo: {
    name: string;
    company?: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  lines: PackingSlipLine[];
  notes?: string;
  totalItems: number;
  totalQuantity: number;
}

export function LabelPrinter({ orderId, orderType = "purchase" }: { orderId: string; orderType?: string }) {
  const { toast } = useToast();
  const [label, setLabel] = useState<ShippingLabel | null>(null);
  const [packingSlip, setPackingSlip] = useState<PackingSlip | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [labelDialogOpen, setLabelDialogOpen] = useState(false);
  const [packingDialogOpen, setPackingDialogOpen] = useState(false);
  const [totalBoxes, setTotalBoxes] = useState(1);

  const loadShippingLabel = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/labels?orderId=${orderId}&type=${orderType}&action=shipping`);
      const data = await response.json();
      setLabel(data);
      setLabelDialogOpen(true);
    } catch (error: any) {
      toast({
        title: "Failed to generate label",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadPackingSlip = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/labels?orderId=${orderId}&type=${orderType}&action=packing`);
      const data = await response.json();
      setPackingSlip(data);
      setPackingDialogOpen(true);
    } catch (error: any) {
      toast({
        title: "Failed to generate packing slip",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadReturnLabel = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/labels?orderId=${orderId}&type=${orderType}&action=return`);
      const data = await response.json();
      setLabel(data);
      setLabelDialogOpen(true);
    } catch (error: any) {
      toast({
        title: "Failed to generate return label",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const printLabel = () => {
    window.print();
  };

  const downloadLabelPDF = async () => {
    if (!label) return;

    try {
      const jsPDF = (await import("jspdf")).default;
      const QRCode = (await import("qrcode")).default;

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "in",
        format: [4, 6], // 4x6 shipping label
      });

      // Generate barcode as data URL
      const barcodeDataUrl = await QRCode.toDataURL(label.barcode, {
        width: 150,
        margin: 1,
      });

      let y = 0.3;

      // Header
      doc.setFontSize(10);
      doc.text(label.carrier || "CARRIER", 0.3, y);
      doc.text(label.serviceLevel || "SERVICE", 3, y);
      y += 0.3;

      // From
      doc.setFontSize(8);
      doc.text("FROM:", 0.3, y);
      y += 0.15;
      doc.setFontSize(9);
      doc.text(label.shipFrom.company, 0.3, y);
      y += 0.15;
      doc.text(label.shipFrom.address1, 0.3, y);
      y += 0.15;
      doc.text(`${label.shipFrom.city}, ${label.shipFrom.state} ${label.shipFrom.postalCode}`, 0.3, y);
      y += 0.3;

      // To
      doc.setFontSize(8);
      doc.text("TO:", 0.3, y);
      y += 0.15;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(label.shipTo.name, 0.3, y);
      y += 0.2;
      if (label.shipTo.company) {
        doc.text(label.shipTo.company, 0.3, y);
        y += 0.2;
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text(label.shipTo.address1, 0.3, y);
      y += 0.18;
      if (label.shipTo.address2) {
        doc.text(label.shipTo.address2, 0.3, y);
        y += 0.18;
      }
      doc.text(`${label.shipTo.city}, ${label.shipTo.state} ${label.shipTo.postalCode}`, 0.3, y);
      y += 0.18;
      if (label.shipTo.country && label.shipTo.country !== "USA") {
        doc.text(label.shipTo.country, 0.3, y);
        y += 0.18;
      }

      // Barcode
      doc.addImage(barcodeDataUrl, "PNG", 0.3, y + 0.2, 1.5, 1.5);

      // Tracking number
      if (label.trackingNumber) {
        doc.setFontSize(10);
        doc.text(label.trackingNumber, 2, y + 0.8);
      }

      // Order number
      doc.setFontSize(8);
      doc.text(`Order: ${label.orderNumber}`, 0.3, 5.7);

      doc.save(`shipping-label-${label.orderNumber}.pdf`);

      toast({
        title: "Label downloaded",
        description: "Shipping label saved as PDF",
      });
    } catch (error: any) {
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const downloadPackingSlipPDF = async () => {
    if (!packingSlip) return;

    try {
      const jsPDF = (await import("jspdf")).default;
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF();

      // Header
      doc.setFontSize(20);
      doc.text("PACKING SLIP", 105, 20, { align: "center" });

      // Order info
      doc.setFontSize(10);
      doc.text(`Order Number: ${packingSlip.orderNumber}`, 20, 35);
      doc.text(`Order Date: ${new Date(packingSlip.orderDate).toLocaleDateString()}`, 20, 42);
      doc.text(`Ship Date: ${new Date(packingSlip.shipDate).toLocaleDateString()}`, 20, 49);

      // Ship to
      doc.setFontSize(12);
      doc.text("Ship To:", 20, 60);
      doc.setFontSize(10);
      let y = 67;
      if (packingSlip.shipTo.company) {
        doc.text(packingSlip.shipTo.company, 20, y);
        y += 7;
      }
      doc.text(packingSlip.shipTo.name, 20, y);
      y += 7;
      doc.text(packingSlip.shipTo.address1, 20, y);
      y += 7;
      if (packingSlip.shipTo.address2) {
        doc.text(packingSlip.shipTo.address2, 20, y);
        y += 7;
      }
      doc.text(
        `${packingSlip.shipTo.city}, ${packingSlip.shipTo.state} ${packingSlip.shipTo.postalCode}`,
        20,
        y
      );

      // Items table
      autoTable(doc, {
        startY: y + 15,
        head: [["SKU", "Item", "Ordered", "Shipped", "UOM"]],
        body: packingSlip.lines.map((line) => [
          line.sku,
          line.name,
          line.quantityOrdered.toString(),
          line.quantityShipped.toString(),
          line.uom,
        ]),
        foot: [
          [
            "TOTALS",
            `${packingSlip.totalItems} items`,
            "",
            packingSlip.totalQuantity.toString(),
            "",
          ],
        ],
      });

      // Notes
      if (packingSlip.notes) {
        const finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(10);
        doc.text("Notes:", 20, finalY);
        doc.setFontSize(9);
        const splitNotes = doc.splitTextToSize(packingSlip.notes, 170);
        doc.text(splitNotes, 20, finalY + 7);
      }

      doc.save(`packing-slip-${packingSlip.orderNumber}.pdf`);

      toast({
        title: "Packing slip downloaded",
        description: "Packing slip saved as PDF",
      });
    } catch (error: any) {
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={loadShippingLabel} disabled={isLoading}>
        <Package className="h-4 w-4 mr-2" />
        Shipping Label
      </Button>

      <Button variant="outline" size="sm" onClick={loadPackingSlip} disabled={isLoading}>
        <FileText className="h-4 w-4 mr-2" />
        Packing Slip
      </Button>

      <Button variant="outline" size="sm" onClick={loadReturnLabel} disabled={isLoading}>
        <RotateCcw className="h-4 w-4 mr-2" />
        Return Label
      </Button>

      {/* Shipping Label Dialog */}
      <Dialog open={labelDialogOpen} onOpenChange={setLabelDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Shipping Label</DialogTitle>
            <DialogDescription>
              {label?.orderNumber} - {label?.carrier} {label?.serviceLevel}
            </DialogDescription>
          </DialogHeader>

          {label && (
            <div className="space-y-4">
              {/* Label Preview */}
              <div className="border-2 border-gray-300 p-6 bg-white" style={{ width: "4in", height: "6in" }}>
                <div className="text-xs mb-2 flex justify-between">
                  <span className="font-bold">{label.carrier}</span>
                  <span>{label.serviceLevel}</span>
                </div>

                <div className="text-xs mb-4">
                  <div className="font-semibold mb-1">FROM:</div>
                  <div>{label.shipFrom.company}</div>
                  <div>{label.shipFrom.address1}</div>
                  <div>
                    {label.shipFrom.city}, {label.shipFrom.state} {label.shipFrom.postalCode}
                  </div>
                </div>

                <div className="border-t-2 border-black pt-3 mb-4">
                  <div className="text-xs font-semibold mb-2">TO:</div>
                  <div className="text-lg font-bold">{label.shipTo.name}</div>
                  {label.shipTo.company && <div className="text-base font-semibold">{label.shipTo.company}</div>}
                  <div className="text-base">{label.shipTo.address1}</div>
                  {label.shipTo.address2 && <div className="text-base">{label.shipTo.address2}</div>}
                  <div className="text-base">
                    {label.shipTo.city}, {label.shipTo.state} {label.shipTo.postalCode}
                  </div>
                  {label.shipTo.country !== "USA" && <div className="text-base">{label.shipTo.country}</div>}
                </div>

                {label.trackingNumber && (
                  <div className="text-center mb-2">
                    <div className="text-xs">Tracking Number</div>
                    <div className="text-lg font-mono font-bold">{label.trackingNumber}</div>
                  </div>
                )}

                <div className="text-xs text-center">
                  <div className="font-mono">{label.barcode}</div>
                </div>

                {label.specialInstructions && (
                  <div className="text-xs mt-2 p-2 bg-yellow-100 border border-yellow-300">
                    <strong>SPECIAL:</strong> {label.specialInstructions}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button onClick={printLabel} className="flex-1">
                  <Printer className="h-4 w-4 mr-2" />
                  Print Label
                </Button>
                <Button onClick={downloadLabelPDF} variant="outline" className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Packing Slip Dialog */}
      <Dialog open={packingDialogOpen} onOpenChange={setPackingDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Packing Slip</DialogTitle>
            <DialogDescription>Order {packingSlip?.orderNumber}</DialogDescription>
          </DialogHeader>

          {packingSlip && (
            <div className="space-y-4">
              {/* Slip Preview */}
              <div className="border p-6 bg-white">
                <h2 className="text-2xl font-bold text-center mb-6">PACKING SLIP</h2>

                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <div className="text-sm text-gray-600">Order Number</div>
                    <div className="font-semibold">{packingSlip.orderNumber}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Order Date</div>
                    <div className="font-semibold">
                      {new Date(packingSlip.orderDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Ship Date</div>
                    <div className="font-semibold">
                      {new Date(packingSlip.shipDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="font-semibold text-lg mb-2">Ship To:</div>
                  {packingSlip.shipTo.company && <div>{packingSlip.shipTo.company}</div>}
                  <div>{packingSlip.shipTo.name}</div>
                  <div>{packingSlip.shipTo.address1}</div>
                  {packingSlip.shipTo.address2 && <div>{packingSlip.shipTo.address2}</div>}
                  <div>
                    {packingSlip.shipTo.city}, {packingSlip.shipTo.state} {packingSlip.shipTo.postalCode}
                  </div>
                </div>

                <table className="w-full border-collapse mb-4">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border p-2 text-left">SKU</th>
                      <th className="border p-2 text-left">Item</th>
                      <th className="border p-2 text-right">Ordered</th>
                      <th className="border p-2 text-right">Shipped</th>
                      <th className="border p-2 text-center">UOM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {packingSlip.lines.map((line, index) => (
                      <tr key={index}>
                        <td className="border p-2 font-mono text-sm">{line.sku}</td>
                        <td className="border p-2">{line.name}</td>
                        <td className="border p-2 text-right">{line.quantityOrdered}</td>
                        <td className="border p-2 text-right font-semibold">{line.quantityShipped}</td>
                        <td className="border p-2 text-center">{line.uom}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-100 font-bold">
                    <tr>
                      <td className="border p-2">TOTALS</td>
                      <td className="border p-2">{packingSlip.totalItems} items</td>
                      <td className="border p-2"></td>
                      <td className="border p-2 text-right">{packingSlip.totalQuantity}</td>
                      <td className="border p-2"></td>
                    </tr>
                  </tfoot>
                </table>

                {packingSlip.notes && (
                  <div className="mt-4">
                    <div className="font-semibold mb-1">Notes:</div>
                    <div className="text-sm text-gray-700">{packingSlip.notes}</div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button onClick={printLabel} className="flex-1">
                  <Printer className="h-4 w-4 mr-2" />
                  Print Packing Slip
                </Button>
                <Button onClick={downloadPackingSlipPDF} variant="outline" className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
