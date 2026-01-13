"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  Plus,
  Search,
  Settings,
  Eye,
  Trash2,
  Edit,
  Crown,
  Database,
  Activity,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

/**
 * Super Admin Dashboard - Tier 6
 * Platform owner can manage ALL tenants/warehouses
 */
export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");

  // Mock data - replace with actual API calls
  const platformStats = {
    totalTenants: 45,
    activeTenants: 42,
    totalUsers: 1248,
    monthlyRevenue: 125480,
    activeSubscriptions: 42,
    trialAccounts: 12,
  };

  const tenants = [
    {
      id: "1",
      name: "Acme Manufacturing",
      slug: "acme-mfg",
      users: 45,
      status: "active",
      plan: "Professional",
      mrr: 999,
      createdAt: "2023-06-15",
    },
    {
      id: "2",
      name: "Global Industries Inc",
      slug: "global-ind",
      users: 82,
      status: "active",
      plan: "Enterprise",
      mrr: 1999,
      createdAt: "2023-05-22",
    },
    {
      id: "3",
      name: "Tech Solutions LLC",
      slug: "tech-solutions",
      users: 28,
      status: "trial",
      plan: "Starter",
      mrr: 0,
      createdAt: "2024-01-05",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500 text-white";
      case "trial":
        return "bg-blue-500 text-white";
      case "suspended":
        return "bg-red-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      {/* Super Admin Header */}
      <div className="border-b bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <Crown className="h-8 w-8 text-yellow-300" />
              </div>
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <Shield className="h-7 w-7" />
                  Super Admin Dashboard
                </h1>
                <p className="text-purple-100 mt-1">
                  Platform Control Center • Welcome, {user?.firstName}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm">
                <Database className="mr-2 h-4 w-4" />
                System Health
              </Button>
              <Button variant="secondary" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                New Tenant
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Platform Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card className="border-purple-200">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs">Total Tenants</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{platformStats.totalTenants}</div>
                <Building2 className="h-8 w-8 text-purple-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs">Active Tenants</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-green-600">{platformStats.activeTenants}</div>
                <Activity className="h-8 w-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs">Total Users</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{platformStats.totalUsers}</div>
                <Users className="h-8 w-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-200">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs">Monthly Revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">${(platformStats.monthlyRevenue / 1000).toFixed(1)}k</div>
                <DollarSign className="h-8 w-8 text-emerald-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-indigo-200">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs">Subscriptions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{platformStats.activeSubscriptions}</div>
                <TrendingUp className="h-8 w-8 text-indigo-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-cyan-200">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs">Trial Accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{platformStats.trialAccounts}</div>
                <Users className="h-8 w-8 text-cyan-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tenants">Tenants</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Platform Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>All Tenants</CardTitle>
                    <CardDescription>Manage all warehouse accounts</CardDescription>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search tenants..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 w-64"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tenants.map((tenant) => (
                    <div
                      key={tenant.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50:bg-slate-800 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center">
                          <Building2 className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-lg">{tenant.name}</span>
                            <Badge className={`${getStatusColor(tenant.status)}`}>
                              {tenant.status}
                            </Badge>
                            <Badge variant="outline">{tenant.plan}</Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{tenant.users} users</span>
                            <span>•</span>
                            <span>/{tenant.slug}</span>
                            <span>•</span>
                            <span>Since {tenant.createdAt}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">MRR</div>
                          <div className="text-xl font-bold">
                            {tenant.mrr > 0 ? `$${tenant.mrr}` : "Trial"}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" title="View Tenant">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Edit Tenant">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Settings">
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-600" title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tenants Tab */}
          <TabsContent value="tenants">
            <Card>
              <CardHeader>
                <CardTitle>Tenant Management</CardTitle>
                <CardDescription>Create, edit, and manage tenant accounts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Full tenant management interface coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Platform Analytics</CardTitle>
                <CardDescription>Performance metrics and insights</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Platform-wide analytics dashboard coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Platform Settings</CardTitle>
                <CardDescription>Configure platform-wide settings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Platform configuration interface coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
