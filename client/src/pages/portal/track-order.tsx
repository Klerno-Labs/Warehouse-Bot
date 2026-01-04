import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Package,
  Search,
  CheckCircle,
  Clock,
  AlertCircle,
  MapPin,
  Calendar,
  Box,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface OrderStatus {
  orderNumber: string;
  status: string;
  item: {
    name: string;
    description: string;
    sku: string;
  };
  quantityOrdered: number;
  quantityProduced: number;
  scheduledDate: string;
  startedAt: string | null;
  completedAt: string | null;
  estimatedCompletion: string;
  site: {
    name: string;
    address: string | null;
  };
}

const STATUS_INFO = {
  PLANNED: { label: "Planned", color: "bg-gray-500", icon: Clock },
  RELEASED: { label: "Released", color: "bg-blue-500", icon: Package },
  IN_PROGRESS: { label: "In Progress", color: "bg-yellow-500", icon: Package },
  COMPLETED: { label: "Completed", color: "bg-green-500", icon: CheckCircle },
  CLOSED: { label: "Closed", color: "bg-gray-700", icon: CheckCircle },
  CANCELLED: { label: "Cancelled", color: "bg-red-500", icon: AlertCircle },
};

export default function TrackOrderPage() {
  const { toast } = useToast();
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [orderStatus, setOrderStatus] = useState<OrderStatus | null>(null);
  const [error, setError] = useState("");

  const handleTrackOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setOrderStatus(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/portal/orders/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to track order");
        return;
      }

      setOrderStatus(data.order);
      toast({
        title: "Order found",
        description: `Order ${orderNumber} is ${data.order.status.toLowerCase()}`,
      });
    } catch (err: any) {
      setError("Failed to connect to server. Please try again.");
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getProgressPercentage = () => {
    if (!orderStatus) return 0;
    if (orderStatus.quantityOrdered === 0) return 0;
    return (orderStatus.quantityProduced / orderStatus.quantityOrdered) * 100;
  };

  const StatusIcon = orderStatus
    ? STATUS_INFO[orderStatus.status as keyof typeof STATUS_INFO]?.icon || Package
    : Package;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-slate-900">Track Your Order</h1>
          <p className="text-lg text-slate-600">
            Enter your order number and email to get real-time status updates
          </p>
        </div>

        {/* Track Order Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Order Lookup
            </CardTitle>
            <CardDescription>
              You can find your order number in your confirmation email
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTrackOrder} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orderNumber">Order Number</Label>
                <Input
                  id="orderNumber"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="e.g., PO-2024-00001"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Searching..." : "Track Order"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Order Status Display */}
        {orderStatus && (
          <Card className="border-2 border-blue-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-6 w-6 text-blue-600" />
                  Order {orderStatus.orderNumber}
                </CardTitle>
                <Badge
                  className={
                    STATUS_INFO[orderStatus.status as keyof typeof STATUS_INFO]?.color ||
                    "bg-gray-500"
                  }
                >
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {STATUS_INFO[orderStatus.status as keyof typeof STATUS_INFO]?.label ||
                    orderStatus.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Production Progress</span>
                  <span className="font-semibold">
                    {orderStatus.quantityProduced} / {orderStatus.quantityOrdered} units
                  </span>
                </div>
                <Progress value={getProgressPercentage()} className="h-3" />
                <div className="text-xs text-right text-slate-500">
                  {getProgressPercentage().toFixed(1)}% complete
                </div>
              </div>

              {/* Item Details */}
              <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                <div className="flex items-start gap-3">
                  <Box className="h-5 w-5 text-slate-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900">{orderStatus.item.name}</div>
                    {orderStatus.item.description && (
                      <div className="text-sm text-slate-600">{orderStatus.item.description}</div>
                    )}
                    <div className="text-xs text-slate-500 mt-1">SKU: {orderStatus.item.sku}</div>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-3">
                <div className="text-sm font-semibold text-slate-700">Order Timeline</div>

                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span className="text-slate-600">Scheduled:</span>
                    <span className="font-medium">
                      {new Date(orderStatus.scheduledDate).toLocaleDateString()}
                    </span>
                  </div>

                  {orderStatus.startedAt && (
                    <div className="flex items-center gap-3 text-sm">
                      <Clock className="h-4 w-4 text-yellow-600" />
                      <span className="text-slate-600">Started:</span>
                      <span className="font-medium">
                        {new Date(orderStatus.startedAt).toLocaleString()}
                      </span>
                    </div>
                  )}

                  {orderStatus.completedAt ? (
                    <div className="flex items-center gap-3 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-slate-600">Completed:</span>
                      <span className="font-medium">
                        {new Date(orderStatus.completedAt).toLocaleString()}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-sm">
                      <Clock className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-600">Est. Completion:</span>
                      <span className="font-medium">
                        {new Date(orderStatus.estimatedCompletion).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Production Site */}
              <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <div className="font-semibold text-blue-900">{orderStatus.site.name}</div>
                    {orderStatus.site.address && (
                      <div className="text-sm text-blue-700">{orderStatus.site.address}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Help Text */}
              <Alert>
                <AlertDescription>
                  Questions about your order? Contact our support team with your order number.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
