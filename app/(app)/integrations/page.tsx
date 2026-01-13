"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle,
  ExternalLink,
  Link2,
  RefreshCw,
  Settings,
  ShoppingBag,
  XCircle,
  Zap,
  FileText,
  DollarSign,
} from "lucide-react";

interface IntegrationConnection {
  id: string;
  provider: string;
  status: "CONNECTED" | "DISCONNECTED" | "ERROR";
  lastSync?: string;
  settings?: Record<string, any>;
}

export default function IntegrationsPage() {
  const [accountingConnections, setAccountingConnections] = useState<IntegrationConnection[]>([]);
  const [ecommerceConnections, setEcommerceConnections] = useState<IntegrationConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("accounting");
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [connectingProvider, setConnectingProvider] = useState<string>("");

  useEffect(() => {
    fetchConnections();
  }, []);

  async function fetchConnections() {
    setLoading(true);
    try {
      const [accountingRes, ecommerceRes] = await Promise.all([
        fetch("/api/integrations/accounting"),
        fetch("/api/integrations/ecommerce"),
      ]);

      if (accountingRes.ok) {
        const data = await accountingRes.json();
        setAccountingConnections(data.connections || []);
      }
      if (ecommerceRes.ok) {
        const data = await ecommerceRes.json();
        setEcommerceConnections(data.stores || []);
      }
    } catch (error) {
      console.error("Failed to fetch connections:", error);
    } finally {
      setLoading(false);
    }
  }

  async function triggerSync(provider: string, type: "accounting" | "ecommerce") {
    try {
      const endpoint = type === "accounting"
        ? "/api/integrations/accounting/sync"
        : "/api/integrations/ecommerce/sync";

      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, syncType: "INCREMENTAL" }),
      });

      fetchConnections();
    } catch (error) {
      console.error("Failed to trigger sync:", error);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "CONNECTED":
        return (
          <Badge className="bg-green-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        );
      case "ERROR":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        );
      default:
        return <Badge variant="outline">Disconnected</Badge>;
    }
  }

  const accountingIntegrations = [
    {
      id: "quickbooks",
      name: "QuickBooks Online",
      description: "Sync invoices, bills, and inventory adjustments",
      logo: "📊",
      features: ["Invoice Sync", "Bill Sync", "Inventory Journal Entries", "Customer/Vendor Sync"],
    },
    {
      id: "xero",
      name: "Xero",
      description: "Comprehensive accounting integration",
      logo: "📈",
      features: ["Invoice Sync", "Bill Sync", "Inventory Tracking", "Bank Reconciliation"],
    },
  ];

  const ecommerceIntegrations = [
    {
      id: "shopify",
      name: "Shopify",
      description: "Sync orders and inventory with your Shopify store",
      logo: "🛍️",
      features: ["Order Import", "Inventory Sync", "Fulfillment Updates", "Product Sync"],
    },
    {
      id: "woocommerce",
      name: "WooCommerce",
      description: "WordPress e-commerce integration",
      logo: "🛒",
      features: ["Order Import", "Inventory Sync", "Product Sync", "Shipping Updates"],
    },
    {
      id: "amazon",
      name: "Amazon",
      description: "Seller Central and FBA integration",
      logo: "📦",
      features: ["Order Import", "FBA Inventory", "Multi-Marketplace", "Prime Fulfillment"],
    },
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Integrations</h1>
          <p className="text-muted-foreground">
            Connect your accounting and e-commerce platforms
          </p>
        </div>
        <Button variant="outline" onClick={fetchConnections} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="accounting">
            <DollarSign className="h-4 w-4 mr-2" />
            Accounting
          </TabsTrigger>
          <TabsTrigger value="ecommerce">
            <ShoppingBag className="h-4 w-4 mr-2" />
            E-commerce
          </TabsTrigger>
          <TabsTrigger value="edi">
            <FileText className="h-4 w-4 mr-2" />
            EDI
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accounting" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {accountingIntegrations.map((integration) => {
              const connection = accountingConnections.find(
                (c) => c.provider.toLowerCase() === integration.id
              );

              return (
                <Card key={integration.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <span className="text-4xl">{integration.logo}</span>
                        <div>
                          <CardTitle>{integration.name}</CardTitle>
                          <CardDescription>{integration.description}</CardDescription>
                        </div>
                      </div>
                      {connection && getStatusBadge(connection.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {integration.features.map((feature) => (
                        <Badge key={feature} variant="outline">
                          {feature}
                        </Badge>
                      ))}
                    </div>

                    {connection?.status === "CONNECTED" ? (
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Last Sync</span>
                          <span>{connection.lastSync || "Never"}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => triggerSync(integration.id, "accounting")}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Sync Now
                          </Button>
                          <Button variant="outline">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        className="w-full"
                        onClick={() => {
                          setConnectingProvider(integration.id);
                          setShowConnectDialog(true);
                        }}
                      >
                        <Link2 className="h-4 w-4 mr-2" />
                        Connect {integration.name}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="ecommerce" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {ecommerceIntegrations.map((integration) => {
              const connection = ecommerceConnections.find(
                (c) => c.provider?.toLowerCase() === integration.id
              );

              return (
                <Card key={integration.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{integration.logo}</span>
                        <div>
                          <CardTitle className="text-lg">{integration.name}</CardTitle>
                        </div>
                      </div>
                      {connection && getStatusBadge(connection.status)}
                    </div>
                    <CardDescription>{integration.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-1">
                      {integration.features.map((feature) => (
                        <Badge key={feature} variant="secondary" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>

                    {connection?.status === "CONNECTED" ? (
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => triggerSync(integration.id, "ecommerce")}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Sync
                          </Button>
                          <Button variant="outline" size="sm">
                            <Settings className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        className="w-full"
                        size="sm"
                        onClick={() => {
                          setConnectingProvider(integration.id);
                          setShowConnectDialog(true);
                        }}
                      >
                        <Link2 className="h-3 w-3 mr-1" />
                        Connect
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Sync Settings */}
          <Card>
            <CardHeader>
              <CardTitle>E-commerce Sync Settings</CardTitle>
              <CardDescription>Configure automatic synchronization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Auto-Import Orders</p>
                  <p className="text-sm text-muted-foreground">
                    Automatically import new orders every 5 minutes
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Inventory Sync</p>
                  <p className="text-sm text-muted-foreground">
                    Push inventory updates to connected stores
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Auto-Fulfill</p>
                  <p className="text-sm text-muted-foreground">
                    Mark orders as fulfilled when shipped
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="edi" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>EDI Integration</CardTitle>
              <CardDescription>
                Electronic Data Interchange for B2B transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Supported Documents</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">EDI 850</p>
                        <p className="text-sm text-muted-foreground">Purchase Order</p>
                      </div>
                      <Badge className="bg-green-500">Inbound</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">EDI 856</p>
                        <p className="text-sm text-muted-foreground">Advance Ship Notice</p>
                      </div>
                      <Badge className="bg-blue-500">Outbound</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">EDI 810</p>
                        <p className="text-sm text-muted-foreground">Invoice</p>
                      </div>
                      <Badge className="bg-blue-500">Outbound</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">EDI 997</p>
                        <p className="text-sm text-muted-foreground">Functional Acknowledgment</p>
                      </div>
                      <Badge variant="secondary">Both</Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Trading Partners</h4>
                  <Button className="w-full">
                    <Link2 className="h-4 w-4 mr-2" />
                    Add Trading Partner
                  </Button>
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No trading partners configured</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Connect Dialog */}
      <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect {connectingProvider}</DialogTitle>
            <DialogDescription>
              Enter your credentials to connect your account
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {connectingProvider === "shopify" && (
              <>
                <div className="grid gap-2">
                  <Label>Shop Domain</Label>
                  <Input placeholder="your-store.myshopify.com" />
                </div>
                <div className="grid gap-2">
                  <Label>Access Token</Label>
                  <Input type="password" placeholder="shpat_..." />
                </div>
              </>
            )}
            {connectingProvider === "quickbooks" && (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-4">
                  You will be redirected to QuickBooks to authorize the connection
                </p>
                <Button>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Connect with QuickBooks
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConnectDialog(false)}>
              Cancel
            </Button>
            <Button>Connect</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
