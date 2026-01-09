"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Lock, Building2 } from "lucide-react";
import { Role, getRoleDisplayName, getRoleTier } from "@shared/permissions";

export default function MobileLogin() {
  const router = useRouter();
  const [badgeNumber, setBadgeNumber] = useState("");
  const [pin, setPin] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Mock departments - in real app, fetch from API
  const departments = [
    { id: "assembly", name: "Assembly", color: "bg-blue-500" },
    { id: "capping", name: "Capping", color: "bg-green-500" },
    { id: "welding", name: "Welding", color: "bg-orange-500" },
    { id: "packaging", name: "Packaging", color: "bg-purple-500" },
    { id: "quality", name: "Quality Control", color: "bg-red-500" },
    { id: "shipping", name: "Shipping", color: "bg-indigo-500" },
  ];

  const handleLogin = async () => {
    if (!badgeNumber || !pin) {
      setError("Please enter your badge number and PIN");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Call login API
      const response = await fetch("/api/auth/mobile-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          badgeNumber,
          pin,
          department: selectedDepartment,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Login failed");
      }

      const { user, token } = await response.json();

      // Store auth info
      localStorage.setItem("mobile_token", token);
      localStorage.setItem("mobile_user", JSON.stringify(user));

      // Redirect based on role
      if (user.role === Role.Operator) {
        router.push("/mobile/operator");
      } else {
        router.push("/mobile/supervisor");
      }
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handlePinInput = (digit: string) => {
    if (pin.length < 4) {
      setPin(pin + digit);
    }
  };

  const handlePinClear = () => {
    setPin("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
            <User className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Production Floor Login</CardTitle>
          <p className="text-sm text-slate-600 mt-2">
            Scan your badge or enter your credentials
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Badge Number Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Badge Number</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                type="text"
                placeholder="Enter or scan badge"
                value={badgeNumber}
                onChange={(e) => setBadgeNumber(e.target.value)}
                className="pl-10 h-12 text-lg"
                autoFocus
              />
            </div>
          </div>

          {/* Department Selection (for Operators) */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Select Your Department
            </label>
            <div className="grid grid-cols-2 gap-2">
              {departments.map((dept) => (
                <button
                  key={dept.id}
                  onClick={() => setSelectedDepartment(dept.id)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedDepartment === dept.id
                      ? "border-blue-600 bg-blue-50 shadow-md"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${dept.color}`} />
                    <span className="text-sm font-medium">{dept.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* PIN Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">PIN</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                type="password"
                placeholder="Enter 4-digit PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value.slice(0, 4))}
                className="pl-10 h-12 text-lg tracking-widest"
                maxLength={4}
              />
            </div>
          </div>

          {/* PIN Pad */}
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "C"].map((digit, idx) => (
              <Button
                key={idx}
                variant={digit === "C" ? "destructive" : "outline"}
                size="lg"
                onClick={() => {
                  if (digit === "C") handlePinClear();
                  else if (digit !== "") handlePinInput(digit.toString());
                }}
                disabled={digit === ""}
                className="h-14 text-xl font-semibold"
              >
                {digit === "C" ? "Clear" : digit}
              </Button>
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Login Button */}
          <Button
            onClick={handleLogin}
            disabled={!badgeNumber || !pin || pin.length < 4 || loading}
            className="w-full h-14 text-lg font-semibold"
            size="lg"
          >
            {loading ? "Logging in..." : "Clock In"}
          </Button>

          {/* Help Text */}
          <p className="text-xs text-center text-slate-500">
            Need help? Contact your supervisor or IT support
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
