"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, Plus, X, Mail, Info } from "lucide-react";

interface TeamMember {
  email: string;
  role: string;
  name: string;
}

interface TeamStepProps {
  data: any;
  onUpdate: (data: any) => void;
  onNext: () => void;
}

const ROLES = [
  { value: "operator", label: "Operator" },
  { value: "supervisor", label: "Supervisor" },
  { value: "inventory", label: "Inventory Manager" },
  { value: "sales", label: "Sales" },
  { value: "executive", label: "Executive" },
];

export function TeamStep({ data, onUpdate, onNext }: TeamStepProps) {
  const [team, setTeam] = useState<TeamMember[]>(
    data?.team || [{ email: "", role: "", name: "" }]
  );

  const updateMember = (index: number, field: string, value: string) => {
    const updated = [...team];
    updated[index] = { ...updated[index], [field]: value };
    setTeam(updated);
    onUpdate({ team: updated });
  };

  const addMember = () => {
    const updated = [...team, { email: "", role: "", name: "" }];
    setTeam(updated);
    onUpdate({ team: updated });
  };

  const removeMember = (index: number) => {
    const updated = team.filter((_, i) => i !== index);
    setTeam(updated);
    onUpdate({ team: updated });
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Invite your team</h2>
            <p className="text-muted-foreground">
              Send email invitations to colleagues
            </p>
          </div>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Optional step:</strong> You can skip this and invite team members later from settings. They'll receive an email with setup instructions.
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        {team.map((member, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor={`member-name-${index}`} className="text-sm">
                    Name
                  </Label>
                  <Input
                    id={`member-name-${index}`}
                    placeholder="John Smith"
                    value={member.name}
                    onChange={(e) =>
                      updateMember(index, "name", e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`member-email-${index}`} className="text-sm">
                    Email
                  </Label>
                  <Input
                    id={`member-email-${index}`}
                    type="email"
                    placeholder="john@company.com"
                    value={member.email}
                    onChange={(e) =>
                      updateMember(index, "email", e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`member-role-${index}`} className="text-sm">
                    Role
                  </Label>
                  <div className="flex gap-2">
                    <Select
                      value={member.role}
                      onValueChange={(value) =>
                        updateMember(index, "role", value)
                      }
                    >
                      <SelectTrigger id={`member-role-${index}`}>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {team.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMember(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button onClick={addMember} variant="outline" className="w-full">
        <Plus className="mr-2 h-4 w-4" />
        Add Team Member
      </Button>
    </div>
  );
}
