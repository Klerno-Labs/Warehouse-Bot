"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Building2, 
  MapPin, 
  Users, 
  Package, 
  ArrowRight, 
  ArrowLeft,
  Check,
  Loader2,
  Plus,
  Trash2
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const STEPS = [
  { id: 0, name: "Company Info", icon: Building2, description: "Tell us about your business" },
  { id: 1, name: "Warehouse Setup", icon: MapPin, description: "Configure your first location" },
  { id: 2, name: "Invite Team", icon: Users, description: "Add your team members" },
  { id: 3, name: "First Item", icon: Package, description: "Create your first inventory item" },
];

interface TeamInvite {
  email: string;
  role: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  // Company info state
  const [companyInfo, setCompanyInfo] = useState({
    industry: "",
    companySize: "",
    address1: "",
    city: "",
    state: "",
    postalCode: "",
    country: "US",
  });

  // Warehouse state
  const [warehouse, setWarehouse] = useState({
    name: "Main Warehouse",
    address: "",
    locations: [
      { label: "RECV-01", type: "RECEIVING" },
      { label: "STOCK-01", type: "STOCK" },
      { label: "SHIP-01", type: "SHIPPING" },
    ],
  });

  // Team invites state
  const [invites, setInvites] = useState<TeamInvite[]>([
    { email: "", role: "Inventory" }
  ]);

  // First item state
  const [firstItem, setFirstItem] = useState({
    sku: "",
    name: "",
    category: "PRODUCTION",
    description: "",
    initialQty: 0,
  });

  // Fetch current user/tenant
  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        router.push("/login");
        return null;
      }
      return res.json();
    },
  });

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const handleNext = async () => {
    setIsLoading(true);
    
    try {
      // Save current step data
      if (currentStep === 0) {
        // Update tenant company info
        await fetch("/api/tenant/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address1: companyInfo.address1,
            city: companyInfo.city,
            state: companyInfo.state,
            postalCode: companyInfo.postalCode,
            country: companyInfo.country,
            onboardingStep: 1,
          }),
        });
      } else if (currentStep === 1) {
        // Create additional locations
        for (const loc of warehouse.locations) {
          await fetch("/api/sites/locations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              label: loc.label,
              type: loc.type,
            }),
          });
        }
      } else if (currentStep === 2) {
        // Send team invites
        const validInvites = invites.filter(i => i.email.trim());
        if (validInvites.length > 0) {
          await fetch("/api/users/invite", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ invites: validInvites }),
          });
        }
      } else if (currentStep === 3) {
        // Create first item
        if (firstItem.sku && firstItem.name) {
          await fetch("/api/items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sku: firstItem.sku,
              name: firstItem.name,
              category: firstItem.category,
              description: firstItem.description,
              baseUom: "EA",
            }),
          });
        }

        // Mark onboarding complete
        await fetch("/api/tenant/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            onboardingCompleted: true,
            onboardingStep: 4,
          }),
        });

        // Redirect to dashboard
        router.push("/");
        return;
      }

      setCurrentStep((prev) => prev + 1);
    } catch (error) {
      console.error("Onboarding error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // Mark onboarding complete and go to dashboard
      await fetch("/api/tenant/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          onboardingCompleted: true,
          onboardingStep: 4,
        }),
      });
      router.push("/");
    }
  };

  const addLocation = () => {
    setWarehouse({
      ...warehouse,
      locations: [...warehouse.locations, { label: "", type: "STOCK" }],
    });
  };

  const removeLocation = (index: number) => {
    setWarehouse({
      ...warehouse,
      locations: warehouse.locations.filter((_, i) => i !== index),
    });
  };

  const addInvite = () => {
    setInvites([...invites, { email: "", role: "Inventory" }]);
  };

  const removeInvite = (index: number) => {
    setInvites(invites.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-white">Welcome to Warehouse Builder!</h1>
            <span className="text-sm text-slate-400">Step {currentStep + 1} of {STEPS.length}</span>
          </div>
          <Progress value={progress} className="h-2 bg-slate-700" />
          
          {/* Step indicators */}
          <div className="flex justify-between mt-4">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = index < currentStep;
              const isCurrent = index === currentStep;
              
              return (
                <div 
                  key={step.id}
                  className={`flex flex-col items-center ${
                    index === 0 ? "items-start" : index === STEPS.length - 1 ? "items-end" : ""
                  }`}
                >
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    ${isCompleted ? "bg-green-600" : isCurrent ? "bg-blue-600" : "bg-slate-700"}
                  `}>
                    {isCompleted ? (
                      <Check className="w-5 h-5 text-white" />
                    ) : (
                      <Icon className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <span className={`text-xs mt-1 hidden sm:block ${
                    isCurrent ? "text-white" : "text-slate-500"
                  }`}>
                    {step.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              {(() => {
                const Icon = STEPS[currentStep].icon;
                return <Icon className="w-5 h-5 text-blue-500" />;
              })()}
              {STEPS[currentStep].name}
            </CardTitle>
            <CardDescription className="text-slate-400">
              {STEPS[currentStep].description}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Step 0: Company Info */}
            {currentStep === 0 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-200">Industry</Label>
                    <select
                      value={companyInfo.industry}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, industry: e.target.value })}
                      className="w-full h-10 px-3 rounded-md bg-slate-900/50 border border-slate-600 text-white"
                    >
                      <option value="">Select industry...</option>
                      <option value="manufacturing">Manufacturing</option>
                      <option value="distribution">Distribution</option>
                      <option value="retail">Retail</option>
                      <option value="ecommerce">E-commerce</option>
                      <option value="food_beverage">Food & Beverage</option>
                      <option value="automotive">Automotive</option>
                      <option value="electronics">Electronics</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-200">Company Size</Label>
                    <select
                      value={companyInfo.companySize}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, companySize: e.target.value })}
                      className="w-full h-10 px-3 rounded-md bg-slate-900/50 border border-slate-600 text-white"
                    >
                      <option value="">Select size...</option>
                      <option value="1-10">1-10 employees</option>
                      <option value="11-50">11-50 employees</option>
                      <option value="51-200">51-200 employees</option>
                      <option value="201-500">201-500 employees</option>
                      <option value="500+">500+ employees</option>
                    </select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-slate-200">Address</Label>
                  <Input
                    placeholder="123 Warehouse St"
                    value={companyInfo.address1}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, address1: e.target.value })}
                    className="bg-slate-900/50 border-slate-600 text-white"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-200">City</Label>
                    <Input
                      placeholder="City"
                      value={companyInfo.city}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, city: e.target.value })}
                      className="bg-slate-900/50 border-slate-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-200">State/Province</Label>
                    <Input
                      placeholder="State"
                      value={companyInfo.state}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, state: e.target.value })}
                      className="bg-slate-900/50 border-slate-600 text-white"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-200">Postal Code</Label>
                    <Input
                      placeholder="12345"
                      value={companyInfo.postalCode}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, postalCode: e.target.value })}
                      className="bg-slate-900/50 border-slate-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-200">Country</Label>
                    <select
                      value={companyInfo.country}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, country: e.target.value })}
                      className="w-full h-10 px-3 rounded-md bg-slate-900/50 border border-slate-600 text-white"
                    >
                      <option value="US">United States</option>
                      <option value="CA">Canada</option>
                      <option value="MX">Mexico</option>
                      <option value="GB">United Kingdom</option>
                      <option value="DE">Germany</option>
                      <option value="FR">France</option>
                      <option value="AU">Australia</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* Step 1: Warehouse Setup */}
            {currentStep === 1 && (
              <>
                <div className="space-y-2">
                  <Label className="text-slate-200">Warehouse Name</Label>
                  <Input
                    placeholder="Main Warehouse"
                    value={warehouse.name}
                    onChange={(e) => setWarehouse({ ...warehouse, name: e.target.value })}
                    className="bg-slate-900/50 border-slate-600 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-200">Address (optional)</Label>
                  <Input
                    placeholder="123 Warehouse Blvd, City, ST 12345"
                    value={warehouse.address}
                    onChange={(e) => setWarehouse({ ...warehouse, address: e.target.value })}
                    className="bg-slate-900/50 border-slate-600 text-white"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-slate-200">Storage Locations</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={addLocation}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      <Plus className="w-4 h-4 mr-1" /> Add Location
                    </Button>
                  </div>
                  
                  {warehouse.locations.map((loc, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder="Location Label (e.g., A-01)"
                        value={loc.label}
                        onChange={(e) => {
                          const updated = [...warehouse.locations];
                          updated[index].label = e.target.value;
                          setWarehouse({ ...warehouse, locations: updated });
                        }}
                        className="bg-slate-900/50 border-slate-600 text-white flex-1"
                      />
                      <select
                        value={loc.type}
                        onChange={(e) => {
                          const updated = [...warehouse.locations];
                          updated[index].type = e.target.value;
                          setWarehouse({ ...warehouse, locations: updated });
                        }}
                        className="w-32 h-10 px-2 rounded-md bg-slate-900/50 border border-slate-600 text-white text-sm"
                      >
                        <option value="RECEIVING">Receiving</option>
                        <option value="STOCK">Stock</option>
                        <option value="WIP">WIP</option>
                        <option value="QC_HOLD">QC Hold</option>
                        <option value="SHIPPING">Shipping</option>
                      </select>
                      {warehouse.locations.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLocation(index)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Step 2: Invite Team */}
            {currentStep === 2 && (
              <>
                <p className="text-slate-400 text-sm">
                  Invite your team members to collaborate. They'll receive an email invitation.
                </p>
                
                <div className="space-y-3">
                  {invites.map((invite, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        type="email"
                        placeholder="colleague@company.com"
                        value={invite.email}
                        onChange={(e) => {
                          const updated = [...invites];
                          updated[index].email = e.target.value;
                          setInvites(updated);
                        }}
                        className="bg-slate-900/50 border-slate-600 text-white flex-1"
                      />
                      <select
                        value={invite.role}
                        onChange={(e) => {
                          const updated = [...invites];
                          updated[index].role = e.target.value;
                          setInvites(updated);
                        }}
                        className="w-32 h-10 px-2 rounded-md bg-slate-900/50 border border-slate-600 text-white text-sm"
                      >
                        <option value="Admin">Admin</option>
                        <option value="Supervisor">Supervisor</option>
                        <option value="Inventory">Inventory</option>
                        <option value="Operator">Operator</option>
                        <option value="Viewer">Viewer</option>
                      </select>
                      {invites.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeInvite(index)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={addInvite}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add Another
                  </Button>
                </div>
              </>
            )}

            {/* Step 3: First Item */}
            {currentStep === 3 && (
              <>
                <p className="text-slate-400 text-sm">
                  Create your first inventory item to get started. You can always add more later.
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-200">SKU</Label>
                    <Input
                      placeholder="ITEM-001"
                      value={firstItem.sku}
                      onChange={(e) => setFirstItem({ ...firstItem, sku: e.target.value })}
                      className="bg-slate-900/50 border-slate-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-200">Category</Label>
                    <select
                      value={firstItem.category}
                      onChange={(e) => setFirstItem({ ...firstItem, category: e.target.value })}
                      className="w-full h-10 px-3 rounded-md bg-slate-900/50 border border-slate-600 text-white"
                    >
                      <option value="PRODUCTION">Production</option>
                      <option value="PACKAGING">Packaging</option>
                      <option value="FACILITY">Facility</option>
                      <option value="CHEMICAL_MRO">Chemical/MRO</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-200">Item Name</Label>
                  <Input
                    placeholder="Widget Assembly"
                    value={firstItem.name}
                    onChange={(e) => setFirstItem({ ...firstItem, name: e.target.value })}
                    className="bg-slate-900/50 border-slate-600 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-200">Description (optional)</Label>
                  <Input
                    placeholder="Main production component"
                    value={firstItem.description}
                    onChange={(e) => setFirstItem({ ...firstItem, description: e.target.value })}
                    className="bg-slate-900/50 border-slate-600 text-white"
                  />
                </div>
              </>
            )}
          </CardContent>

          {/* Navigation */}
          <div className="p-6 pt-0 flex justify-between">
            <div>
              {currentStep > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setCurrentStep((prev) => prev - 1)}
                  className="text-slate-400 hover:text-white"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={handleSkip}
                className="text-slate-400 hover:text-white"
              >
                Skip
              </Button>
              <Button
                onClick={handleNext}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : currentStep === STEPS.length - 1 ? (
                  "Finish Setup"
                ) : (
                  <>
                    Continue <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
