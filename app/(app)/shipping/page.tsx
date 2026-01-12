"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle,
  DollarSign,
  MapPin,
  Package,
  Printer,
  RefreshCw,
  Search,
  Truck,
  Clock,
  AlertCircle,
} from "lucide-react";

interface ShippingRate {
  carrier: string;
  service: string;
  serviceCode: string;
  price: number;
  estimatedDays: number;
  deliveryDate: string;
}

interface ShipmentLabel {
  trackingNumber: string;
  carrier: string;
  service: string;
  labelUrl: string;
  status: string;
  createdAt: string;
}

export default function ShippingPage() {
  const [activeTab, setActiveTab] = useState("rates");
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [labels, setLabels] = useState<ShipmentLabel[]>([]);
  const [loading, setLoading] = useState(false);
  const [showLabelDialog, setShowLabelDialog] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingResult, setTrackingResult] = useState<any>(null);

  // Address form
  const [origin, setOrigin] = useState({
    name: "",
    street1: "",
    city: "",
    state: "",
    postalCode: "",
    country: "US",
  });

  const [destination, setDestination] = useState({
    name: "",
    street1: "",
    city: "",
    state: "",
    postalCode: "",
    country: "US",
  });

  const [packageInfo, setPackageInfo] = useState({
    weight: "",
    length: "",
    width: "",
    height: "",
  });

  const [selectedCarriers, setSelectedCarriers] = useState<string[]>(["UPS", "FEDEX", "USPS"]);

  async function getRates() {
    setLoading(true);
    try {
      const res = await fetch("/api/shipping/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin,
          destination,
          packages: [{
            weight: parseFloat(packageInfo.weight),
            length: parseFloat(packageInfo.length),
            width: parseFloat(packageInfo.width),
            height: parseFloat(packageInfo.height),
            weightUnit: "lb",
            dimensionUnit: "in",
          }],
          carriers: selectedCarriers,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setRates(data.rates || []);
      }
    } catch (error) {
      console.error("Failed to get rates:", error);
    } finally {
      setLoading(false);
    }
  }

  async function createLabel(rate: ShippingRate) {
    setLoading(true);
    try {
      const res = await fetch("/api/shipping/labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carrier: rate.carrier,
          serviceCode: rate.serviceCode,
          origin,
          destination,
          packages: [{
            weight: parseFloat(packageInfo.weight),
            length: parseFloat(packageInfo.length),
            width: parseFloat(packageInfo.width),
            height: parseFloat(packageInfo.height),
            weightUnit: "lb",
            dimensionUnit: "in",
          }],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setLabels([data.label, ...labels]);
        setShowLabelDialog(true);
      }
    } catch (error) {
      console.error("Failed to create label:", error);
    } finally {
      setLoading(false);
    }
  }

  async function trackShipment() {
    if (!trackingNumber) return;

    setLoading(true);
    try {
      const res = await fetch(
        `/api/shipping/tracking?trackingNumber=${trackingNumber}&carrier=UPS`
      );
      if (res.ok) {
        const data = await res.json();
        setTrackingResult(data.tracking);
      }
    } catch (error) {
      console.error("Failed to track:", error);
    } finally {
      setLoading(false);
    }
  }

  function getCarrierLogo(carrier: string) {
    switch (carrier) {
      case "UPS":
        return "🟤";
      case "FEDEX":
        return "🟣";
      case "USPS":
        return "🔵";
      case "DHL":
        return "🟡";
      default:
        return "📦";
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Shipping Center</h1>
          <p className="text-muted-foreground">
            Multi-carrier rate shopping and label generation
          </p>
        </div>
      </div>

      {/* Carrier Selection */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            {["UPS", "FEDEX", "USPS", "DHL"].map((carrier) => (
              <Button
                key={carrier}
                variant={selectedCarriers.includes(carrier) ? "default" : "outline"}
                onClick={() => {
                  if (selectedCarriers.includes(carrier)) {
                    setSelectedCarriers(selectedCarriers.filter((c) => c !== carrier));
                  } else {
                    setSelectedCarriers([...selectedCarriers, carrier]);
                  }
                }}
              >
                {getCarrierLogo(carrier)} {carrier}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="rates">
            <DollarSign className="h-4 w-4 mr-2" />
            Rate Shopping
          </TabsTrigger>
          <TabsTrigger value="labels">
            <Printer className="h-4 w-4 mr-2" />
            Labels
          </TabsTrigger>
          <TabsTrigger value="tracking">
            <Search className="h-4 w-4 mr-2" />
            Tracking
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rates" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Origin Address */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Ship From
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>Name</Label>
                  <Input
                    value={origin.name}
                    onChange={(e) => setOrigin({ ...origin, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Street Address</Label>
                  <Input
                    value={origin.street1}
                    onChange={(e) => setOrigin({ ...origin, street1: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-2">
                    <Label>City</Label>
                    <Input
                      value={origin.city}
                      onChange={(e) => setOrigin({ ...origin, city: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>State</Label>
                    <Input
                      value={origin.state}
                      onChange={(e) => setOrigin({ ...origin, state: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>ZIP Code</Label>
                  <Input
                    value={origin.postalCode}
                    onChange={(e) => setOrigin({ ...origin, postalCode: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Destination Address */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Ship To
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>Name</Label>
                  <Input
                    value={destination.name}
                    onChange={(e) => setDestination({ ...destination, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Street Address</Label>
                  <Input
                    value={destination.street1}
                    onChange={(e) => setDestination({ ...destination, street1: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-2">
                    <Label>City</Label>
                    <Input
                      value={destination.city}
                      onChange={(e) => setDestination({ ...destination, city: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>State</Label>
                    <Input
                      value={destination.state}
                      onChange={(e) => setDestination({ ...destination, state: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>ZIP Code</Label>
                  <Input
                    value={destination.postalCode}
                    onChange={(e) => setDestination({ ...destination, postalCode: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Package Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Package
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>Weight (lbs)</Label>
                  <Input
                    type="number"
                    value={packageInfo.weight}
                    onChange={(e) => setPackageInfo({ ...packageInfo, weight: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="grid gap-2">
                    <Label>Length</Label>
                    <Input
                      type="number"
                      value={packageInfo.length}
                      onChange={(e) => setPackageInfo({ ...packageInfo, length: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Width</Label>
                    <Input
                      type="number"
                      value={packageInfo.width}
                      onChange={(e) => setPackageInfo({ ...packageInfo, width: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Height</Label>
                    <Input
                      type="number"
                      value={packageInfo.height}
                      onChange={(e) => setPackageInfo({ ...packageInfo, height: e.target.value })}
                    />
                  </div>
                </div>
                <Button className="w-full" onClick={getRates} disabled={loading}>
                  {loading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <DollarSign className="h-4 w-4 mr-2" />
                  )}
                  Get Rates
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Rates Results */}
          {rates.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Available Rates</CardTitle>
                <CardDescription>
                  Select a service to create a shipping label
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Carrier</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-center">Transit</TableHead>
                      <TableHead>Delivery</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rates.map((rate, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{getCarrierLogo(rate.carrier)}</span>
                            {rate.carrier}
                          </div>
                        </TableCell>
                        <TableCell>{rate.service}</TableCell>
                        <TableCell className="text-right font-bold">
                          ${rate.price.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Clock className="h-3 w-3" />
                            {rate.estimatedDays} days
                          </div>
                        </TableCell>
                        <TableCell>{rate.deliveryDate}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" onClick={() => createLabel(rate)}>
                            <Printer className="h-3 w-3 mr-1" />
                            Create Label
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="labels" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Labels</CardTitle>
              <CardDescription>Labels created in the last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              {labels.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tracking Number</TableHead>
                      <TableHead>Carrier</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {labels.map((label, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono">
                          {label.trackingNumber}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getCarrierLogo(label.carrier)}
                            {label.carrier}
                          </div>
                        </TableCell>
                        <TableCell>{label.service}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{label.status}</Badge>
                        </TableCell>
                        <TableCell>{label.createdAt}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline">
                            <Printer className="h-3 w-3 mr-1" />
                            Print
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Printer className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No labels created yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tracking" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Track Shipment</CardTitle>
              <CardDescription>
                Enter a tracking number to get real-time status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Input
                  placeholder="Enter tracking number..."
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={trackShipment} disabled={loading}>
                  {loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {trackingResult && (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">{getCarrierLogo(trackingResult.carrier)}</div>
                    <div>
                      <h3 className="font-bold text-lg">{trackingResult.carrier}</h3>
                      <p className="text-muted-foreground">{trackingResult.trackingNumber}</p>
                    </div>
                    <Badge className="ml-auto" variant="outline">
                      {trackingResult.status}
                    </Badge>
                  </div>

                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-4">Tracking History</h4>
                    <div className="space-y-4">
                      {trackingResult.events?.map((event: any, index: number) => (
                        <div key={index} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="w-3 h-3 rounded-full bg-primary" />
                            {index < trackingResult.events.length - 1 && (
                              <div className="w-0.5 h-full bg-muted" />
                            )}
                          </div>
                          <div className="flex-1 pb-4">
                            <p className="font-medium">{event.description}</p>
                            <p className="text-sm text-muted-foreground">
                              {event.location} - {event.timestamp}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
