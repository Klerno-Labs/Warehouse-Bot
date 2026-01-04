import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ExportType = "inventory" | "jobs" | "cycle-counts" | "production-orders" | "analytics";
type ExportFormat = "csv" | "excel" | "pdf";

interface ExportButtonProps {
  type: ExportType;
  filters?: {
    dateFrom?: string;
    dateTo?: string;
    siteId?: string;
  };
  label?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function ExportButton({
  type,
  filters = {},
  label = "Export",
  variant = "outline",
  size = "default",
}: ExportButtonProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true);

    try {
      // Build query params
      const params = new URLSearchParams({
        type,
        format,
        ...filters,
      });

      const response = await fetch(`/api/reports/export?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Export failed");
      }

      if (format === "pdf") {
        // For PDF, we get JSON data and generate client-side
        const data = await response.json();
        await generatePDF(data);
      } else {
        // For CSV/Excel, download the file
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${type}-export-${new Date().toISOString().split('T')[0]}.${format === "csv" ? "csv" : "xls"}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }

      toast({
        title: "Export successful",
        description: `Your ${format.toUpperCase()} file has been downloaded`,
      });
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const generatePDF = async (data: any) => {
    // Dynamic import to reduce bundle size
    const jsPDF = (await import("jspdf")).default;
    const autoTable = (await import("jspdf-autotable")).default;

    const doc = new jsPDF();

    // Add title
    doc.setFontSize(18);
    doc.text(data.meta.reportType.toUpperCase().replace(/-/g, " ") + " REPORT", 14, 20);

    // Add metadata
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date(data.meta.generatedAt).toLocaleString()}`, 14, 28);
    doc.text(`Records: ${data.meta.recordCount}`, 14, 34);

    // Add filters if any
    let yPos = 40;
    if (data.meta.filters.dateFrom || data.meta.filters.dateTo) {
      const filterText = [];
      if (data.meta.filters.dateFrom) filterText.push(`From: ${data.meta.filters.dateFrom}`);
      if (data.meta.filters.dateTo) filterText.push(`To: ${data.meta.filters.dateTo}`);
      doc.text(`Filters: ${filterText.join(", ")}`, 14, yPos);
      yPos += 6;
    }

    // Add table
    autoTable(doc, {
      startY: yPos + 5,
      head: [data.headers],
      body: data.data.map((row: any) =>
        data.headers.map((header: string) => row[header] || "")
      ),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [15, 23, 42] }, // Slate-900
    });

    // Save the PDF
    doc.save(`${data.filename}.pdf`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Export Format</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleExport("csv")}>
          <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("excel")}>
          <FileSpreadsheet className="h-4 w-4 mr-2 text-blue-600" />
          Export as Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("pdf")}>
          <FileText className="h-4 w-4 mr-2 text-red-600" />
          Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
