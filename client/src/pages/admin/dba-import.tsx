import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Database,
  Download,
} from "lucide-react";

export default function DBAImportPage() {
  const { toast } = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [dataType, setDataType] = useState("items");
  const [siteId, setSiteId] = useState("");
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [validateOnly, setValidateOnly] = useState(false);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [importResults, setImportResults] = useState<any>(null);

  const importMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiRequest("POST", "/api/import/dba", payload);
    },
    onSuccess: (data: any) => {
      setImportResults(data);
      toast({
        title: validateOnly ? "Validation Complete" : "Import Complete",
        description: `${data.summary.imported} imported, ${data.summary.updated} updated, ${data.summary.skipped} skipped`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    // Parse CSV
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = parseCSV(text);
      setParsedData(rows);
      toast({
        title: "File Loaded",
        description: `${rows.length} rows detected`,
      });
    };
    reader.readAsText(selectedFile);
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split("\n");
    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""));
      const row: any = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx];
      });
      rows.push(row);
    }

    return rows;
  };

  const handleImport = () => {
    if (!parsedData.length) {
      toast({
        title: "No Data",
        description: "Please upload a CSV file first",
        variant: "destructive",
      });
      return;
    }

    if (!siteId) {
      toast({
        title: "No Site Selected",
        description: "Please select a site",
        variant: "destructive",
      });
      return;
    }

    importMutation.mutate({
      dataType,
      data: parsedData,
      siteId,
      options: {
        skipDuplicates,
        updateExisting,
        validateOnly,
      },
    });
  };

  const downloadTemplate = (type: string) => {
    const templates: Record<string, string> = {
      items: "PartNumber,Description,Category,UOM,StandardCost,ReorderPoint,Barcode\nPART-001,Sample Part,RAW_MATERIAL,EA,10.50,100,123456789",
      locations: "Location,Zone,Bin,Type\nA-1-1,A,1,STORAGE\nA-1-2,A,2,STORAGE",
      inventory: "PartNumber,Location,QtyOnHand,LotNumber\nPART-001,A-1-1,500,LOT123",
      boms: "ParentPart,ComponentPart,Quantity,Sequence\nASM-001,PART-001,2,1\nASM-001,PART-002,1,2",
    };

    const content = templates[type] || "";
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground flex items-center justify-center gap-3">
          <Database className="h-8 w-8 text-primary" />
          DBA Manufacturing Import
        </h1>
        <p className="text-muted-foreground mt-2">
          Seamlessly migrate your data from DBA Manufacturing
        </p>
      </div>

      {/* Instructions */}
      <Card className="border-blue-500/50 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-700">
            Migration Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>1. Export from DBA:</strong> Go to your DBA system and export data as CSV files</p>
          <p><strong>2. Download Templates:</strong> Use our templates to ensure correct format</p>
          <p><strong>3. Map Fields:</strong> Ensure column names match our templates</p>
          <p><strong>4. Validate First:</strong> Run with "Validate Only" to check for errors</p>
          <p><strong>5. Import:</strong> Once validated, uncheck "Validate Only" and import</p>
        </CardContent>
      </Card>

      {/* Template Downloads */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Download CSV Templates
          </CardTitle>
          <CardDescription>Download template files with correct column format</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {["items", "locations", "inventory", "boms"].map((type) => (
              <Button
                key={type}
                variant="outline"
                onClick={() => downloadTemplate(type)}
                className="flex items-center gap-2"
              >
                <FileSpreadsheet className="h-4 w-4" />
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upload & Configure */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Upload & Configure Import
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload */}
          <div className="space-y-2">
            <Label>Upload CSV File</Label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="flex-1 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
              {file && (
                <Badge variant="secondary">
                  {parsedData.length} rows
                </Badge>
              )}
            </div>
          </div>

          {/* Data Type */}
          <div className="space-y-2">
            <Label>Data Type</Label>
            <Select value={dataType} onValueChange={setDataType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="items">Items/Products</SelectItem>
                <SelectItem value="locations">Locations</SelectItem>
                <SelectItem value="inventory">Inventory Balances</SelectItem>
                <SelectItem value="boms">Bills of Materials (BOMs)</SelectItem>
                <SelectItem value="purchaseOrders">Purchase Orders</SelectItem>
                <SelectItem value="productionOrders">Production Orders</SelectItem>
                <SelectItem value="all">All (Multi-type file)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Site Selection */}
          <div className="space-y-2">
            <Label>Target Site</Label>
            <Select value={siteId} onValueChange={setSiteId}>
              <SelectTrigger>
                <SelectValue placeholder="Select site..." />
              </SelectTrigger>
              <SelectContent>
                {/* Would be populated from API */}
                <SelectItem value="site-1">Main Facility</SelectItem>
                <SelectItem value="site-2">Warehouse A</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Options */}
          <div className="space-y-3 border-t pt-4">
            <Label className="text-base font-semibold">Import Options</Label>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="skipDuplicates"
                checked={skipDuplicates}
                onCheckedChange={(checked) => setSkipDuplicates(checked as boolean)}
              />
              <label htmlFor="skipDuplicates" className="text-sm cursor-pointer">
                Skip Duplicates (don't import if SKU/Code already exists)
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="updateExisting"
                checked={updateExisting}
                onCheckedChange={(checked) => setUpdateExisting(checked as boolean)}
              />
              <label htmlFor="updateExisting" className="text-sm cursor-pointer">
                Update Existing (overwrite existing records)
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="validateOnly"
                checked={validateOnly}
                onCheckedChange={(checked) => setValidateOnly(checked as boolean)}
              />
              <label htmlFor="validateOnly" className="text-sm cursor-pointer">
                Validate Only (dry run - no changes to database)
              </label>
            </div>
          </div>

          {/* Import Button */}
          <Button
            onClick={handleImport}
            disabled={!parsedData.length || !siteId || importMutation.isPending}
            size="lg"
            className="w-full"
          >
            {importMutation.isPending ? (
              "Processing..."
            ) : validateOnly ? (
              <>
                <CheckCircle2 className="h-5 w-5 mr-2" />
                Validate Data
              </>
            ) : (
              <>
                <Upload className="h-5 w-5 mr-2" />
                Import Data
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {importResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {importResults.summary.errorCount === 0 ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-600" />
              )}
              {importResults.validateOnly ? "Validation" : "Import"} Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-3xl font-bold text-green-600">
                  {importResults.summary.imported}
                </div>
                <div className="text-sm text-muted-foreground">Imported</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-3xl font-bold text-blue-600">
                  {importResults.summary.updated}
                </div>
                <div className="text-sm text-muted-foreground">Updated</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-3xl font-bold text-gray-600">
                  {importResults.summary.skipped}
                </div>
                <div className="text-sm text-muted-foreground">Skipped</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-3xl font-bold text-red-600">
                  {importResults.summary.errorCount}
                </div>
                <div className="text-sm text-muted-foreground">Errors</div>
              </div>
            </div>

            {/* Errors */}
            {importResults.errors.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-destructive">Errors:</h3>
                <div className="max-h-64 overflow-auto space-y-2">
                  {importResults.errors.map((err: any, idx: number) => (
                    <div key={idx} className="p-3 bg-destructive/10 border border-destructive/30 rounded text-sm">
                      <div className="font-semibold">Row {err.row}: {err.error}</div>
                      <pre className="text-xs mt-1 text-muted-foreground overflow-auto">
                        {JSON.stringify(err.data, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
