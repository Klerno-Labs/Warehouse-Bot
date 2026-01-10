"use client";

import { CheckCircle2, Rocket, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CompletionStepProps {
  data: any;
  onComplete: () => void;
}

export function CompletionStep({ data, onComplete }: CompletionStepProps) {
  const stats = [
    { label: "Departments", value: data?.departments?.length || 0 },
    { label: "Devices", value: data?.stations?.filter((s: any) => s.name).length || 0 },
    { label: "Team members", value: data?.team?.filter((t: any) => t.email).length || 0 },
    { label: "Jobs ready", value: data?.firstJob?.name ? 1 : 0 },
  ];

  return (
    <div className="space-y-8">
      {/* Success Icon */}
      <div className="flex flex-col items-center text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 mb-4">
          <CheckCircle2 className="h-12 w-12 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold mb-2">You're all set!</h2>
        <p className="text-lg text-muted-foreground max-w-md">
          Your warehouse management system is configured and ready to go.
        </p>
      </div>

      {/* Setup Summary */}
      <div className="grid gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-primary mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* What's Next */}
      <Alert className="bg-primary/5 border-primary/20">
        <Rocket className="h-4 w-4 text-primary" />
        <AlertDescription>
          <strong>What's next:</strong> You'll see your personalized dashboard with role-based views. Invited team members will receive email invitations within the next few minutes.
        </AlertDescription>
      </Alert>

      {/* Quick Actions */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">Recommended next steps:</h3>
          <div className="space-y-3">
            {[
              "📱 Install the mobile app on tablets for your operators",
              "🏷️ Print QR codes for your first job",
              "👥 Assign operators to their stations",
              "📊 Explore the executive dashboard",
              "⚙️ Customize workflows in settings",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                  {i + 1}
                </div>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Company Info */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="text-sm text-muted-foreground">
          <strong>{data?.company?.name}</strong> •{" "}
          {data?.company?.industry} •{" "}
          {data?.company?.size} employees
        </p>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p>Ready to transform your warehouse operations? 🎉</p>
      </div>
    </div>
  );
}
