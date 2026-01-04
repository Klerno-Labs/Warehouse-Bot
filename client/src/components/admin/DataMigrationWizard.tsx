import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  Download,
  CheckCircle,
  AlertTriangle,
  FileSpreadsheet,
  Database,
  ArrowRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type DataType =
  | "items"
  | "locations"
  | "suppliers"
  | "customers"
  | "boms"
  | "inventory-balances"
  | "all";

interface ValidationResult {
  valid: boolean;
  errors: Array<{ row: number; field: string; message: string }>;
  warnings: Array<{ row: number; field: string; message: string }>;
  rowCount: number;
}

interface ImportProgress {
  total: number;
  current: number;
  status: "uploading" | "validating" | "importing" | "complete" | "error";
  message: string;
}

export function DataMigrationWizard() {
  const { toast } = useToast();
  const [step, setStep] = useState<"select" | "upload" | "validate" | "import" | "complete">("select");
  const [dataType, setDataType] = useState<DataType>("items");
  const [file, setFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [progress, setProgress] = useState<ImportProgress>({
    total: 0,
    current: 0,
    status: "uploading",
    message: "",
  });

  const dataTypeOptions = [
    { value: "items", label: "Items / Products" },
    { value: "locations", label: "Warehouse Locations" },
    { value: "suppliers", label: "Suppliers / Vendors" },
    { value: "customers", label: "Customers" },
    { value: "boms", label: "Bills of Material" },
    { value: "inventory-balances", label: "Inventory Balances" },
    { value: "all", label: "Complete System Export" },
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleValidate = async () => {
    if (!file) return;

    setStep("validate");
    setProgress({ total: 100, current: 10, status: "validating", message: "Validating file..." });

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("dataType", dataType);

      const response = await fetch("/api/admin/import/validate", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      setValidation(data.validation);
      setProgress({ total: 100, current: 100, status: "validating", message: "Validation complete" });

      if (data.validation.valid) {
        toast({
          title: "Validation successful",
          description: `${data.validation.rowCount} rows ready to import`,
        });
      } else {
        toast({
          title: "Validation failed",
          description: `Found ${data.validation.errors.length} errors`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Validation failed",
        description: error.message,
        variant: "destructive",
      });
      setStep("upload");
    }
  };

  const handleImport = async () => {
    if (!file || !validation?.valid) return;

    setStep("import");
    setProgress({ total: validation.rowCount, current: 0, status: "importing", message: "Starting import..." });

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("dataType", dataType);

      const response = await fetch("/api/admin/import/execute", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setProgress({
          total: validation.rowCount,
          current: validation.rowCount,
          status: "complete",
          message: `Successfully imported ${data.imported} records`,
        });
        setStep("complete");
        toast({
          title: "Import successful",
          description: `${data.imported} records imported successfully`,
        });
      } else {
        throw new Error(data.error || "Import failed");
      }
    } catch (error: any) {
      setProgress({ total: 0, current: 0, status: "error", message: error.message });
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch(`/api/admin/export/template?type=${dataType}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${dataType}-template.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Template downloaded",
        description: `${dataType} template is ready to use`,
      });
    } catch (error: any) {
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch(`/api/admin/export/data?type=${dataType}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${dataType}-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: `${dataType} data exported`,
      });
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold">Data Migration Wizard</h2>
        <p className="text-muted-foreground">Import or export data from external systems</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {["select", "upload", "validate", "import", "complete"].map((s, index) => (
          <div key={s} className="flex items-center">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                step === s
                  ? "border-blue-600 bg-blue-600 text-white"
                  : index < ["select", "upload", "validate", "import", "complete"].indexOf(step)
                  ? "border-green-600 bg-green-600 text-white"
                  : "border-gray-300"
              }`}
            >
              {index < ["select", "upload", "validate", "import", "complete"].indexOf(step) ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                index + 1
              )}
            </div>
            {index < 4 && (
              <div
                className={`w-24 h-0.5 ${
                  index < ["select", "upload", "validate", "import", "complete"].indexOf(step)
                    ? "bg-green-600"
                    : "bg-gray-300"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      {step === "select" && (
        <Card>
          <CardHeader>
            <CardTitle>Select Data Type</CardTitle>
            <CardDescription>Choose what type of data you want to import or export</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="dataType">Data Type</Label>
              <Select value={dataType} onValueChange={(v) => setDataType(v as DataType)}>
                <SelectTrigger id="dataType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dataTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button onClick={handleDownloadTemplate} variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
              <Button onClick={handleExport} variant="outline" className="w-full">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export Current Data
              </Button>
            </div>

            <Button onClick={() => setStep("upload")} className="w-full">
              Continue to Upload
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle>Upload File</CardTitle>
            <CardDescription>Upload a CSV file with your {dataType} data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
              <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <span className="text-blue-600 hover:text-blue-700 font-medium">
                  Click to upload
                </span>{" "}
                or drag and drop
              </label>
              <p className="text-sm text-muted-foreground mt-2">CSV files only</p>
              {file && (
                <div className="mt-4 flex items-center justify-center gap-2 text-sm">
                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                  <span className="font-medium">{file.name}</span>
                  <span className="text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <Button onClick={() => setStep("select")} variant="outline">
                Back
              </Button>
              <Button onClick={handleValidate} disabled={!file} className="flex-1">
                Validate File
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "validate" && validation && (
        <Card>
          <CardHeader>
            <CardTitle>Validation Results</CardTitle>
            <CardDescription>Review validation results before importing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{validation.rowCount}</div>
                <div className="text-sm text-muted-foreground">Total Rows</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">{validation.errors.length}</div>
                <div className="text-sm text-muted-foreground">Errors</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">{validation.warnings.length}</div>
                <div className="text-sm text-muted-foreground">Warnings</div>
              </div>
            </div>

            {validation.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{validation.errors.length} errors found</strong>
                  <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                    {validation.errors.slice(0, 5).map((error, i) => (
                      <div key={i} className="text-xs">
                        Row {error.row}: {error.field} - {error.message}
                      </div>
                    ))}
                    {validation.errors.length > 5 && (
                      <div className="text-xs">...and {validation.errors.length - 5} more</div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {validation.warnings.length > 0 && validation.errors.length === 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{validation.warnings.length} warnings</strong> (can proceed with import)
                </AlertDescription>
              </Alert>
            )}

            {validation.valid && (
              <Alert>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  File is valid and ready to import {validation.rowCount} rows
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-4">
              <Button onClick={() => setStep("upload")} variant="outline">
                Back
              </Button>
              <Button onClick={handleImport} disabled={!validation.valid} className="flex-1">
                Start Import
                <Database className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "import" && (
        <Card>
          <CardHeader>
            <CardTitle>Importing Data</CardTitle>
            <CardDescription>Please wait while we import your data...</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>
                  {progress.current} / {progress.total}
                </span>
              </div>
              <Progress value={(progress.current / progress.total) * 100} />
            </div>

            <div className="text-center text-muted-foreground">
              {progress.message}
            </div>
          </CardContent>
        </Card>
      )}

      {step === "complete" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
              Import Complete
            </CardTitle>
            <CardDescription>Your data has been successfully imported</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                Successfully imported {progress.current} records
              </AlertDescription>
            </Alert>

            <Button onClick={() => {
              setStep("select");
              setFile(null);
              setValidation(null);
            }} className="w-full">
              Import More Data
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
