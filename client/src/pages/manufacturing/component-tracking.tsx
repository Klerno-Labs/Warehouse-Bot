import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { QRScanner } from "@/components/qr-scanner";
import {
  Package,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Scan,
} from "lucide-react";

type ComponentStatus = {
  itemId: string;
  itemName: string;
  itemCode: string;
  qtyRequired: number;
  qtyScanned: number;
  remaining: number;
  percentComplete: number;
  isComplete: boolean;
  isOverPicked: boolean;
  scans: Array<{
    id: string;
    qty: number;
    scannedBy: string;
    scannedAt: Date;
    lotNumber?: string;
    location?: string;
  }>;
};

type ComponentTrackingData = {
  productionOrder: {
    id: string;
    orderNumber: string;
    qtyOrdered: number;
  };
  componentStatus: ComponentStatus[];
  summary: {
    totalComponents: number;
    completeComponents: number;
    overallProgress: number;
    allComplete: boolean;
  };
};

export default function ComponentTrackingPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [orderNumber, setOrderNumber] = useState("");
  const [selectedProductionOrderId, setSelectedProductionOrderId] = useState<string | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<ComponentStatus | null>(null);
  const [qtyToScan, setQtyToScan] = useState("1");
  const [lotNumber, setLotNumber] = useState("");
  const [location, setLocation] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const [scanMode, setScanMode] = useState<"order" | "component">("order");

  // Fetch component status for selected production order
  const { data: trackingData, isLoading } = useQuery<ComponentTrackingData>({
    queryKey: ["/api/job-tracking/component-scan", selectedProductionOrderId],
    enabled: !!selectedProductionOrderId,
    refetchInterval: 5000,
  });

  // Scan component mutation
  const scanMutation = useMutation({
    mutationFn: async (payload: {
      productionOrderId: string;
      jobOperationId: string;
      itemId: string;
      qtyScanned: number;
      lotNumber?: string;
      location?: string;
    }) => {
      return apiRequest("POST", "/api/job-tracking/component-scan", payload);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-tracking/component-scan"] });
      toast({
        title: "Component Scanned",
        description: `${data.summary.itemName}: ${data.summary.qtyScanned} scanned (${data.summary.percentComplete}% complete)`,
      });
      setQtyToScan("1");
      setLotNumber("");
      setLocation("");
      setSelectedComponent(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Scan Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleOrderScan = async (code: string) => {
    // In a real app, you would look up the production order by scanning its QR code
    // For now, we'll treat the code as the order number
    setOrderNumber(code);
    // Would need an API endpoint to convert order number to production order ID
    // For now, assume code is the production order ID
    setSelectedProductionOrderId(code);
  };

  const handleComponentScan = (component: ComponentStatus) => {
    if (!selectedProductionOrderId || !trackingData) return;

    const qty = parseFloat(qtyToScan);
    if (isNaN(qty) || qty <= 0) {
      toast({
        title: "Invalid Quantity",
        description: "Please enter a valid quantity",
        variant: "destructive",
      });
      return;
    }

    // Get active job operation (assume PICKING department for component scanning)
    // In a real implementation, you'd need to pass the actual job operation ID
    const jobOperationId = "temp-id"; // Would come from context

    scanMutation.mutate({
      productionOrderId: selectedProductionOrderId,
      jobOperationId,
      itemId: component.itemId,
      qtyScanned: qty,
      lotNumber: lotNumber || undefined,
      location: location || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground flex items-center justify-center gap-3">
          <Package className="h-8 w-8 text-primary" />
          Component Tracking
        </h1>
        <p className="text-muted-foreground mt-2">Scan and track component picking</p>
      </div>

      {!selectedProductionOrderId ? (
        /* Order Selection */
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scan className="h-5 w-5 text-primary" />
              Scan Production Order
            </CardTitle>
            <CardDescription>Scan the job card QR code to begin</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant="default"
                onClick={() => {
                  setScanMode("order");
                  setShowCamera(true);
                }}
                className="flex-1"
              >
                <Camera className="h-4 w-4 mr-2" />
                Scan Order QR
              </Button>
            </div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or enter manually</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Order Number</Label>
              <Input
                placeholder="FMP45813"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
              />
              <Button
                onClick={() => handleOrderScan(orderNumber)}
                disabled={!orderNumber}
                className="w-full"
              >
                Load Order
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Component Tracking */
        <>
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{trackingData?.productionOrder.orderNumber}</CardTitle>
                  <CardDescription>
                    Qty: {trackingData?.productionOrder.qtyOrdered}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedProductionOrderId(null);
                    setOrderNumber("");
                  }}
                >
                  Change Order
                </Button>
              </div>
            </CardHeader>
            {trackingData && (
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Overall Progress</span>
                    <span className="font-semibold">
                      {trackingData.summary.completeComponents} / {trackingData.summary.totalComponents} components
                    </span>
                  </div>
                  <Progress value={trackingData.summary.overallProgress} />
                  {trackingData.summary.allComplete && (
                    <Badge className="bg-green-600 mt-2">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      All Components Complete
                    </Badge>
                  )}
                </div>
              </CardContent>
            )}
          </Card>

          {/* Components List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trackingData?.componentStatus.map((component) => (
              <Card
                key={component.itemId}
                className={`${
                  component.isComplete
                    ? "border-green-500"
                    : component.isOverPicked
                    ? "border-amber-500"
                    : ""
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{component.itemName}</CardTitle>
                      <CardDescription className="text-xs">{component.itemCode}</CardDescription>
                    </div>
                    {component.isComplete ? (
                      <Badge className="bg-green-600">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Complete
                      </Badge>
                    ) : component.isOverPicked ? (
                      <Badge variant="destructive">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Over
                      </Badge>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Progress</span>
                      <span className="font-mono">
                        {component.qtyScanned} / {component.qtyRequired}
                      </span>
                    </div>
                    <Progress value={component.percentComplete} />
                    {component.remaining > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {component.remaining} remaining
                      </p>
                    )}
                  </div>

                  {!component.isComplete && (
                    <div className="space-y-2 pt-2 border-t">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Qty</Label>
                          <Input
                            type="number"
                            min="1"
                            value={selectedComponent?.itemId === component.itemId ? qtyToScan : "1"}
                            onChange={(e) => {
                              setSelectedComponent(component);
                              setQtyToScan(e.target.value);
                            }}
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Lot (Optional)</Label>
                          <Input
                            value={selectedComponent?.itemId === component.itemId ? lotNumber : ""}
                            onChange={(e) => {
                              setSelectedComponent(component);
                              setLotNumber(e.target.value);
                            }}
                            placeholder="LOT123"
                            className="h-8"
                          />
                        </div>
                      </div>
                      <Button
                        onClick={() => handleComponentScan(component)}
                        disabled={scanMutation.isPending}
                        size="sm"
                        className="w-full"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Scan Component
                      </Button>
                    </div>
                  )}

                  {component.scans.length > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Recent Scans</p>
                      <div className="space-y-1">
                        {component.scans.slice(0, 3).map((scan) => (
                          <div key={scan.id} className="text-xs flex justify-between">
                            <span>{scan.scannedBy}</span>
                            <span className="font-mono">{scan.qty}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* QR Scanner Modal */}
      {showCamera && (
        <QRScanner
          onScan={(code) => {
            if (scanMode === "order") {
              handleOrderScan(code);
            }
            setShowCamera(false);
            toast({
              title: "QR Code Scanned",
              description: code,
            });
          }}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
}
