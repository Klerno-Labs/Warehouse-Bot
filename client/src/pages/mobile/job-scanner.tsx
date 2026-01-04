import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { QRScanner } from "@/components/qr-scanner";
import {
  QrCode,
  Play,
  Pause,
  CheckCircle,
  Clock,
  Package,
  AlertCircle,
  Camera,
} from "lucide-react";
import type { Department, DepartmentView, DEPARTMENT_CONFIGS } from "@shared/job-tracking";

const DEPARTMENTS: Department[] = [
  "PICKING",
  "ASSEMBLY",
  "PLEATING",
  "OVEN",
  "LASER",
  "QC",
  "PACKAGING",
  "SHIPPING",
];

export default function JobScannerPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedDepartment, setSelectedDepartment] = useState<Department>("PICKING");
  const [scanInput, setScanInput] = useState("");
  const [scanMode, setScanMode] = useState<"manual" | "camera">("manual");
  const [showCamera, setShowCamera] = useState(false);
  const [notes, setNotes] = useState("");

  // Fetch active and pending jobs for this department
  const { data: departmentData, isLoading } = useQuery<DepartmentView>({
    queryKey: ["/api/job-tracking/department", selectedDepartment],
    refetchInterval: 5000, // Refresh every 5 seconds for real-time updates
  });

  const activeJobs = departmentData?.activeJobs || [];
  const pendingJobs = departmentData?.pendingJobs || [];

  // Scan mutation - handles start/pause/complete actions
  const scanMutation = useMutation({
    mutationFn: async (payload: {
      qrCode: string;
      scanType: "START" | "PAUSE" | "RESUME" | "COMPLETE";
      department: Department;
      notes?: string;
    }) => {
      return apiRequest("POST", "/api/job-tracking/scan", payload);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-tracking/department"] });
      toast({
        title: "Success",
        description: data.message || "Job scanned successfully",
      });
      setScanInput("");
      setNotes("");
    },
    onError: (error: Error) => {
      toast({
        title: "Scan Error",
        description: error.message || "Failed to process scan",
        variant: "destructive",
      });
    },
  });

  const handleScan = (scanType: "START" | "PAUSE" | "RESUME" | "COMPLETE") => {
    if (!scanInput.trim()) {
      toast({
        title: "Error",
        description: "Please enter or scan a job card QR code",
        variant: "destructive",
      });
      return;
    }

    scanMutation.mutate({
      qrCode: scanInput.trim(),
      scanType,
      department: selectedDepartment,
      notes: notes.trim() || undefined,
    });
  };

  const formatElapsedTime = (seconds?: number) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getScanTypeColor = (scanType: string) => {
    switch (scanType) {
      case "START":
        return "bg-primary text-primary-foreground";
      case "PAUSE":
        return "bg-amber-500 text-white";
      case "COMPLETE":
        return "bg-green-600 text-white";
      default:
        return "bg-secondary";
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">Job Scanner</h1>
          <p className="text-muted-foreground mt-2">Department-Specific Job Tracking</p>
        </div>

        {/* Department Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Select Department
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedDepartment}
              onValueChange={(value: Department) => setSelectedDepartment(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Scanner Input */}
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              Scan Job Card
            </CardTitle>
            <CardDescription>
              Enter job number or scan QR code on the job card
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Scan Mode Toggle */}
            <div className="flex gap-2">
              <Button
                variant={scanMode === "manual" ? "default" : "outline"}
                onClick={() => setScanMode("manual")}
                className="flex-1"
              >
                Manual Entry
              </Button>
              <Button
                variant={scanMode === "camera" ? "default" : "outline"}
                onClick={() => setScanMode("camera")}
                className="flex-1"
              >
                <Camera className="h-4 w-4 mr-2" />
                Camera
              </Button>
            </div>

            {/* Manual Input */}
            {scanMode === "manual" && (
              <div className="space-y-2">
                <Label htmlFor="scanInput">Job Card Number or QR Code</Label>
                <Input
                  id="scanInput"
                  type="text"
                  placeholder="FMP45813"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  className="text-lg font-mono"
                  autoFocus
                />
              </div>
            )}

            {/* Camera Scanner */}
            {scanMode === "camera" && (
              <div className="space-y-3">
                <Button
                  onClick={() => setShowCamera(true)}
                  className="w-full"
                  size="lg"
                >
                  <Camera className="h-5 w-5 mr-2" />
                  Open Camera Scanner
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Works best in Chrome or Edge browser
                </p>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this scan..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => handleScan("START")}
                disabled={scanMutation.isPending}
                className="bg-primary hover:bg-primary/90"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Job
              </Button>
              <Button
                onClick={() => handleScan("COMPLETE")}
                disabled={scanMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete
              </Button>
              <Button
                onClick={() => handleScan("PAUSE")}
                disabled={scanMutation.isPending}
                variant="outline"
              >
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
              <Button
                onClick={() => handleScan("RESUME")}
                disabled={scanMutation.isPending}
                variant="outline"
              >
                <Play className="h-4 w-4 mr-2" />
                Resume
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Active Jobs */}
        {activeJobs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                Active Jobs ({activeJobs.length})
              </CardTitle>
              <CardDescription>Jobs currently in progress</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activeJobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-amber-50 dark:bg-amber-950/20"
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-foreground">
                        {job.orderNumber}
                      </div>
                      <div className="text-sm text-muted-foreground">{job.itemName}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {job.currentOperation}
                        {job.assignedTo && ` • ${job.assignedTo}`}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary" className="font-mono">
                        {formatElapsedTime(job.elapsedTime)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pending Jobs */}
        {pendingJobs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-blue-500" />
                Pending Jobs ({pendingJobs.length})
              </CardTitle>
              <CardDescription>Jobs ready to start</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingJobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => setScanInput(job.orderNumber)}
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-foreground">
                        {job.orderNumber}
                      </div>
                      <div className="text-sm text-muted-foreground">{job.itemName}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Next: {job.nextOperation}
                      </div>
                    </div>
                    <Badge variant="outline">Ready</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && activeJobs.length === 0 && pendingJobs.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                No jobs found for {selectedDepartment}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Scan a job card to get started
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* QR Scanner Modal */}
      {showCamera && (
        <QRScanner
          onScan={(code) => {
            setScanInput(code);
            setShowCamera(false);
            setScanMode("manual");
            toast({
              title: "QR Code Scanned",
              description: `Job: ${code}`,
            });
          }}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
}
