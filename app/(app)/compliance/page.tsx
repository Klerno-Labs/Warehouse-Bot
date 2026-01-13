"use client";

import { useState, useEffect } from "react";
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
import { Progress } from "@/components/ui/progress";
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Shield,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Clock,
  FileText,
  GraduationCap,
  ClipboardCheck,
} from "lucide-react";

interface ComplianceDashboard {
  overallScore: number;
  byCategory: Array<{
    category: string;
    compliant: number;
    nonCompliant: number;
    pending: number;
  }>;
  upcomingAudits: number;
  openFindings: number;
  expiringTraining: number;
  recentActivity: Array<{
    type: string;
    description: string;
    timestamp: string;
  }>;
}

interface ComplianceRequirement {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string;
  frequency: string;
  isActive: boolean;
}

interface TrainingRequirement {
  id: string;
  name: string;
  category: string;
  description: string;
  frequency: string;
  duration: number;
  passingScore: number;
}

export default function CompliancePage() {
  const [dashboard, setDashboard] = useState<ComplianceDashboard | null>(null);
  const [requirements, setRequirements] = useState<ComplianceRequirement[]>([]);
  const [training, setTraining] = useState<TrainingRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  useEffect(() => {
    fetchDashboard();
    fetchRequirements();
    fetchTraining();
  }, []);

  async function fetchDashboard() {
    setLoading(true);
    try {
      const res = await fetch("/api/compliance");
      if (res.ok) {
        const data = await res.json();
        setDashboard(data.dashboard);
      }
    } catch (error) {
      console.error("Failed to fetch compliance dashboard:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchRequirements() {
    try {
      const res = await fetch("/api/compliance?view=requirements");
      if (res.ok) {
        const data = await res.json();
        setRequirements(data.requirements || []);
      }
    } catch (error) {
      console.error("Failed to fetch requirements:", error);
    }
  }

  async function fetchTraining() {
    try {
      const res = await fetch("/api/compliance?view=training");
      if (res.ok) {
        const data = await res.json();
        setTraining(data.training || []);
      }
    } catch (error) {
      console.error("Failed to fetch training:", error);
    }
  }

  function getCategoryBadge(category: string) {
    const colors: Record<string, string> = {
      FDA: "bg-blue-500",
      OSHA: "bg-red-500",
      CUSTOMS: "bg-green-500",
      EPA: "bg-emerald-500",
      DOT: "bg-orange-500",
      ISO: "bg-purple-500",
    };
    return <Badge className={colors[category] || "bg-gray-500"}>{category}</Badge>;
  }

  function getScoreColor(score: number): string {
    if (score >= 95) return "text-green-600";
    if (score >= 85) return "text-yellow-600";
    return "text-red-600";
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Compliance Management</h1>
          <p className="text-muted-foreground">
            FDA, OSHA, customs, and regulatory compliance tracking
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchDashboard} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button>
            <FileText className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {dashboard && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Overall Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${getScoreColor(dashboard.overallScore)}`}>
                {dashboard.overallScore}%
              </div>
              <Progress value={dashboard.overallScore} className="mt-2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4" />
                Upcoming Audits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{dashboard.upcomingAudits}</div>
              <p className="text-sm text-muted-foreground">next 30 days</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Open Findings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${dashboard.openFindings > 0 ? "text-red-600" : "text-green-600"}`}>
                {dashboard.openFindings}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Expiring Training
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${dashboard.expiringTraining > 0 ? "text-yellow-600" : "text-green-600"}`}>
                {dashboard.expiringTraining}
              </div>
              <p className="text-sm text-muted-foreground">next 30 days</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{dashboard.byCategory.length}</div>
              <p className="text-sm text-muted-foreground">tracked</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">
            <Shield className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="requirements">
            <FileText className="h-4 w-4 mr-2" />
            Requirements
          </TabsTrigger>
          <TabsTrigger value="audits">
            <ClipboardCheck className="h-4 w-4 mr-2" />
            Audits
          </TabsTrigger>
          <TabsTrigger value="training">
            <GraduationCap className="h-4 w-4 mr-2" />
            Training
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Compliance by Category */}
            <Card>
              <CardHeader>
                <CardTitle>Compliance by Category</CardTitle>
              </CardHeader>
              <CardContent>
                {dashboard && (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dashboard.byCategory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="compliant" stackId="a" fill="#22c55e" name="Compliant" />
                      <Bar dataKey="pending" stackId="a" fill="#eab308" name="Pending" />
                      <Bar dataKey="nonCompliant" stackId="a" fill="#ef4444" name="Non-Compliant" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Category Status */}
            <Card>
              <CardHeader>
                <CardTitle>Category Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboard?.byCategory.map((cat) => {
                    const total = cat.compliant + cat.pending + cat.nonCompliant;
                    const score = total > 0 ? (cat.compliant / total) * 100 : 0;
                    return (
                      <div key={cat.category} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span>{getCategoryBadge(cat.category)}</span>
                          <span className={getScoreColor(score)}>{score.toFixed(0)}%</span>
                        </div>
                        <Progress value={score} />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{cat.compliant} compliant</span>
                          <span>{cat.pending} pending</span>
                          <span>{cat.nonCompliant} issues</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="requirements" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="FDA">FDA</SelectItem>
                  <SelectItem value="OSHA">OSHA</SelectItem>
                  <SelectItem value="CUSTOMS">Customs</SelectItem>
                  <SelectItem value="EPA">EPA</SelectItem>
                  <SelectItem value="DOT">DOT</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requirements.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-mono">{req.code}</TableCell>
                      <TableCell className="font-medium">{req.name}</TableCell>
                      <TableCell>{getCategoryBadge(req.category)}</TableCell>
                      <TableCell>{req.frequency}</TableCell>
                      <TableCell>
                        {req.isActive ? (
                          <Badge className="bg-green-500">Active</Badge>
                        ) : (
                          <Badge variant="outline">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline">View</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Audits</CardTitle>
              <CardDescription>Schedule and track internal and external audits</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No upcoming audits scheduled</p>
                <Button className="mt-4">Schedule Audit</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="training" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Training Requirements</CardTitle>
              <CardDescription>Required compliance training by role</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Training</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                    <TableHead className="text-right">Passing Score</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {training.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell>{getCategoryBadge(t.category)}</TableCell>
                      <TableCell>{t.frequency}</TableCell>
                      <TableCell className="text-right">{t.duration} min</TableCell>
                      <TableCell className="text-right">{t.passingScore}%</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline">View Records</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
