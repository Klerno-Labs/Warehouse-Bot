"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Building2,
  GitBranch,
  Settings,
  Activity,
  TrendingUp,
  ShieldCheck,
  Palette,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalDepartments: number;
  totalRoutings: number;
  tenantInfo: {
    id: string;
    name: string;
    brandLogo?: string;
    brandColor?: string;
  };
  recentActivity: Array<{
    id: string;
    action: string;
    user: string;
    timestamp: string;
  }>;
}

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ShieldCheck className="h-8 w-8 text-primary" />
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground mt-2">
          System overview and management controls
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.activeUsers || 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalDepartments || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Custom configured
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Routings</CardTitle>
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalRoutings || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Production workflows
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
              Healthy
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              All systems operational
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/admin/users">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-blue-600" />
                User Management
              </CardTitle>
              <CardDescription>
                Manage user accounts, roles, and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {stats?.totalUsers || 0} users
                </span>
                <Badge variant="secondary">Manage</Badge>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/admin/departments">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5 text-green-600" />
                Departments
              </CardTitle>
              <CardDescription>
                Configure custom departments for workflows
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {stats?.totalDepartments || 0} departments
                </span>
                <Badge variant="secondary">Configure</Badge>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/admin/routings">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <GitBranch className="h-5 w-5 text-purple-600" />
                Production Routings
              </CardTitle>
              <CardDescription>
                Define production workflow paths
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {stats?.totalRoutings || 0} routings
                </span>
                <Badge variant="secondary">Design</Badge>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/admin/settings/company">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings className="h-5 w-5 text-orange-600" />
                Company Settings
              </CardTitle>
              <CardDescription>
                Configure regional and business preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Regional & workflow
                </span>
                <Badge variant="secondary">Settings</Badge>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/admin/settings/branding">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Palette className="h-5 w-5 text-pink-600" />
                Branding
              </CardTitle>
              <CardDescription>
                Customize logo, colors, and appearance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Visual identity
                </span>
                <Badge variant="secondary">Customize</Badge>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/admin/workflow-designer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-cyan-600" />
                Workflow Designer
              </CardTitle>
              <CardDescription>
                Visualize and analyze production flows
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Visual workflows
                </span>
                <Badge variant="secondary">View</Badge>
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>

      {/* Company Info */}
      {stats?.tenantInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company Information
            </CardTitle>
            <CardDescription>Current tenant details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                {stats.tenantInfo.brandLogo && (
                  <img
                    src={stats.tenantInfo.brandLogo}
                    alt="Company logo"
                    className="h-12 object-contain"
                  />
                )}
                <div>
                  <div className="font-semibold text-lg">{stats.tenantInfo.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Tenant ID: {stats.tenantInfo.id}
                  </div>
                </div>
              </div>
              {stats.tenantInfo.brandColor && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Brand Color:</span>
                  <div
                    className="h-6 w-6 rounded border"
                    style={{ backgroundColor: stats.tenantInfo.brandColor }}
                  />
                  <code className="text-xs">{stats.tenantInfo.brandColor}</code>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Card */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-lg">Admin Privileges</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-blue-900 dark:text-blue-100">
            As an administrator, you have full access to all system configuration,
            user management, and workflow customization features. Use these tools to
            configure your warehouse management system to match your exact operational needs.
          </p>
          <div className="mt-4 space-y-1">
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
              Quick Start:
            </p>
            <ul className="text-sm text-blue-900 dark:text-blue-100 list-disc list-inside space-y-1">
              <li>Configure custom departments for your operations</li>
              <li>Create production routings for your products</li>
              <li>Add users and assign appropriate roles</li>
              <li>Customize company branding and settings</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
