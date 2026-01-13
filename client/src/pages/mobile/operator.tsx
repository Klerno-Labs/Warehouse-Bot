"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ScanLine,
  CheckCircle,
  AlertTriangle,
  Package,
  ClipboardList,
  User,
  LogOut,
  Camera,
  Save,
  XCircle,
  Clock,
  Info,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { QRScanner } from "@/components/qr-scanner";
import { ConfirmDialog } from "@/components/ui/form-dialog";

interface JobData {
  id: string;
  orderNumber: string;
  itemSku: string;
  itemName: string;
  qtyOrdered: number;
  qtyCompleted: number;
  status: string;
  dueDate: string;
  priority: string;
  components: Array<{
    id: string;
    sku: string;
    name: string;
    qtyNeeded: number;
    qtyAvailable: number;
    uom: string;
    location: string;
  }>;
  instructions: string;
  workstation: string;
  estimatedTime: number;
  notes: Array<{
    id: string;
    timestamp: string;
    user: string;
    content: string;
    type: "info" | "issue" | "part_replacement";
  }>;
}

export default function MobileOperatorApp() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isScanning, setIsScanning] = useState(false);
  const [scannedJobId, setScannedJobId] = useState<string | null>(null);
  const [newNote, setNewNote] = useState("");
  const [noteType, setNoteType] = useState<"info" | "issue" | "part_replacement">("info");
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);

  // Get user department from mobile login
  const [userDepartment, setUserDepartment] = useState<string | null>(null);

  useEffect(() => {
    // Load department from mobile auth
    const mobileUser = localStorage.getItem("mobile_user");
    if (mobileUser) {
      const parsedUser = JSON.parse(mobileUser);
      setUserDepartment(parsedUser.department || null);
    }
  }, []);

  // Manual job number input
  const [manualJobNumber, setManualJobNumber] = useState("");

  // Handle QR scan
  const handleQRScan = (data: string) => {
    setScannedJobId(data);
    setIsScanning(false);
  };

  // Fetch job data
  const { data: jobData, isLoading } = useQuery<JobData>({
    queryKey: ["/api/mobile/job", scannedJobId],
    queryFn: async () => {
      if (!scannedJobId) return null;
      const res = await fetch(`/api/mobile/job/${scannedJobId}`);
      if (!res.ok) throw new Error("Failed to fetch job data");
      return res.json();
    },
    enabled: !!scannedJobId,
  });

  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: async (note: { content: string; type: string }) => {
      const res = await fetch(`/api/mobile/job/${scannedJobId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(note),
      });
      if (!res.ok) throw new Error("Failed to add note");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mobile/job", scannedJobId] });
      setNewNote("");
      toast({
        title: "Note Added",
        description: "Your note has been saved successfully",
      });
    },
  });

  // Complete job mutation
  const completeJobMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/mobile/job/${scannedJobId}/complete`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to complete job");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Job Completed!",
        description: "Great work! The job has been marked as complete.",
      });
      setScannedJobId(null);
    },
  });

  const handleScanJob = () => {
    // Open QR scanner with camera
    setIsScanning(true);
  };

  const handleManualScan = () => {
    if (manualJobNumber) {
      setScannedJobId(manualJobNumber);
      setManualJobNumber("");
    }
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    addNoteMutation.mutate({ content: newNote, type: noteType });
  };

  const handleCompleteJob = () => {
    completeJobMutation.mutate();
    setShowCompleteConfirm(false);
  };

  // No job scanned - Scanner view
  if (!scannedJobId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
        {/* Mobile Header */}
        <div className="sticky top-0 z-50 bg-white border-b shadow-sm">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">{user?.firstName} {user?.lastName}</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">{user?.role || "Operator"}</p>
                  {userDepartment && (
                    <Badge variant="outline" className="text-xs">
                      {userDepartment}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Scanner View */}
        <div className="flex flex-col items-center justify-center p-6 space-y-6 min-h-[calc(100vh-80px)]">
          {!isScanning ? (
            <>
              <div className="flex h-32 w-32 items-center justify-center rounded-full bg-primary/10 animate-pulse">
                <ScanLine className="h-16 w-16 text-primary" />
              </div>
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold">Ready to Work</h1>
                <p className="text-muted-foreground">Scan a job card QR code to begin</p>
              </div>
              <Button size="lg" className="w-full max-w-xs h-14" onClick={handleScanJob}>
                <Camera className="mr-2 h-5 w-5" />
                Scan Job Card
              </Button>
            </>
          ) : (
            <>
              {/* QR Scanner Component */}
              <QRScanner
                onScan={handleQRScan}
                onClose={() => setIsScanning(false)}
              />
            </>
          )}
        </div>
      </div>
    );
  }

  // Job is scanned - Show job details
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 animate-pulse" />
          <p className="text-muted-foreground">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (!jobData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Job Not Found
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              The scanned job could not be found. Please try scanning again or contact your supervisor.
            </p>
            <Button className="w-full" onClick={() => setScannedJobId(null)}>
              Scan Another Job
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Job Details View
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Header with Job Info */}
      <div className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setScannedJobId(null)}>
                <ScanLine className="h-5 w-5" />
              </Button>
              <div>
                <p className="font-bold text-lg">{jobData.orderNumber}</p>
                <p className="text-xs text-muted-foreground">{jobData.workstation}</p>
              </div>
            </div>
            <Badge
              variant={
                jobData.priority === "high" ? "destructive" :
                jobData.priority === "medium" ? "default" :
                "secondary"
              }
            >
              {jobData.priority}
            </Badge>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">
                {jobData.qtyCompleted} / {jobData.qtyOrdered}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{
                  width: `${(jobData.qtyCompleted / jobData.qtyOrdered) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Job Content */}
      <div className="p-4 space-y-4 pb-24">
        {/* What to Make */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              What You're Making
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold">{jobData.itemName}</p>
                <p className="text-sm text-muted-foreground">SKU: {jobData.itemSku}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{jobData.qtyOrdered}</p>
                <p className="text-xs text-muted-foreground">units</p>
              </div>
            </div>

            {/* Due Date */}
            <div className="flex items-center gap-2 text-sm bg-muted px-3 py-2 rounded-md">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Due:</span>
              <span className="font-medium">{new Date(jobData.dueDate).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        {jobData.instructions && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-4 w-4" />
                Instructions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{jobData.instructions}</p>
            </CardContent>
          </Card>
        )}

        {/* Parts Needed */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Parts Needed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {jobData.components.map((component) => (
              <div
                key={component.id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm">{component.name}</p>
                  <p className="text-xs text-muted-foreground">
                    SKU: {component.sku} • Location: {component.location}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">
                    {component.qtyNeeded} {component.uom}
                  </p>
                  {component.qtyAvailable < component.qtyNeeded ? (
                    <Badge variant="destructive" className="text-xs">
                      Short {component.qtyNeeded - component.qtyAvailable}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Available
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Notes Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Notes & Issues
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Previous Notes */}
            {jobData.notes.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Previous Notes</Label>
                {jobData.notes.map((note) => (
                  <div
                    key={note.id}
                    className={`p-3 rounded-lg border-l-4 ${
                      note.type === "issue"
                        ? "border-l-destructive bg-destructive/5"
                        : note.type === "part_replacement"
                        ? "border-l-amber-500 bg-amber-50"
                        : "border-l-primary bg-muted"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <span className="text-xs font-medium">{note.user}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(note.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm">{note.content}</p>
                    <Badge variant="outline" className="text-xs mt-2">
                      {note.type.replace("_", " ")}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Note */}
            <div className="space-y-3 pt-2 border-t">
              <Label>Add a Note</Label>
              <div className="flex gap-2">
                <Button
                  variant={noteType === "info" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNoteType("info")}
                >
                  Info
                </Button>
                <Button
                  variant={noteType === "issue" ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => setNoteType("issue")}
                >
                  Issue
                </Button>
                <Button
                  variant={noteType === "part_replacement" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNoteType("part_replacement")}
                >
                  Part Replaced
                </Button>
              </div>
              <Textarea
                placeholder="Describe what happened, what parts were replaced, or any issues..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={3}
              />
              <Button
                className="w-full"
                onClick={handleAddNote}
                disabled={!newNote.trim() || addNoteMutation.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                Save Note
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fixed Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg">
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 h-12"
            onClick={() => setScannedJobId(null)}
          >
            Scan Different Job
          </Button>
          <Button
            className="flex-1 h-12"
            onClick={() => setShowCompleteConfirm(true)}
            disabled={completeJobMutation.isPending}
          >
            <CheckCircle className="mr-2 h-5 w-5" />
            Complete Job
          </Button>
        </div>
      </div>

      {/* Complete Job Confirmation */}
      <ConfirmDialog
        open={showCompleteConfirm}
        onOpenChange={setShowCompleteConfirm}
        title="Complete Job"
        description="Mark this job as complete? This action will move the job to the next stage."
        onConfirm={handleCompleteJob}
        confirmLabel={completeJobMutation.isPending ? "Completing..." : "Complete"}
        variant="default"
      />
    </div>
  );
}
