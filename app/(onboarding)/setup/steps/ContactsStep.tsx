"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building, Plus, X, Info } from "lucide-react";

interface Contact {
  name: string;
  type: string;
  email: string;
}

interface ContactsStepProps {
  data: any;
  onUpdate: (data: any) => void;
  onNext: () => void;
}

export function ContactsStep({ data, onUpdate, onNext }: ContactsStepProps) {
  const [contacts, setContacts] = useState<Contact[]>(
    data?.contacts || [{ name: "", type: "supplier", email: "" }]
  );

  const updateContact = (index: number, field: string, value: string) => {
    const updated = [...contacts];
    updated[index] = { ...updated[index], [field]: value };
    setContacts(updated);
    onUpdate({ contacts: updated });
  };

  const addContact = () => {
    setContacts([...contacts, { name: "", type: "supplier", email: "" }]);
  };

  const removeContact = (index: number) => {
    const updated = contacts.filter((_, i) => i !== index);
    setContacts(updated);
    onUpdate({ contacts: updated });
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Building className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Add suppliers & customers</h2>
            <p className="text-muted-foreground">
              Build your contact list (optional)
            </p>
          </div>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Optional step:</strong> You can skip this and add contacts later. This helps with purchase orders and sales tracking.
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        {contacts.map((contact, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2 sm:col-span-1">
                  <Label className="text-sm">Name</Label>
                  <Input
                    placeholder="Company name"
                    value={contact.name}
                    onChange={(e) =>
                      updateContact(index, "name", e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Type</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={contact.type === "supplier" ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateContact(index, "type", "supplier")}
                      className="flex-1"
                    >
                      Supplier
                    </Button>
                    <Button
                      type="button"
                      variant={contact.type === "customer" ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateContact(index, "type", "customer")}
                      className="flex-1"
                    >
                      Customer
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Email</Label>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="contact@company.com"
                      value={contact.email}
                      onChange={(e) =>
                        updateContact(index, "email", e.target.value)
                      }
                    />
                    {contacts.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeContact(index)}
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

      <Button onClick={addContact} variant="outline" className="w-full">
        <Plus className="mr-2 h-4 w-4" />
        Add Contact
      </Button>
    </div>
  );
}
