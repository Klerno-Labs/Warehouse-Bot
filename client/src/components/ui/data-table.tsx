"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  Column,
  HeaderGroup,
  Header,
  Row,
  Cell,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  SlidersHorizontal,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  onExport?: () => void;
  onRowClick?: (row: TData) => void;
  pageSize?: number;
  showColumnToggle?: boolean;
  showPagination?: boolean;
  isLoading?: boolean;
  emptyMessage?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Search...",
  onExport,
  onRowClick,
  pageSize = 10,
  showColumnToggle = true,
  showPagination = true,
  isLoading = false,
  emptyMessage = "No results found.",
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    initialState: {
      pagination: {
        pageSize,
      },
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          {searchKey && (
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
                onChange={(event) =>
                  table.getColumn(searchKey)?.setFilterValue(event.target.value)
                }
                className="pl-9"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}

          {showColumnToggle && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[180px]">
                {table
                  .getAllColumns()
                  .filter((column: Column<TData, unknown>) => column.getCanHide())
                  .map((column: Column<TData, unknown>) => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                      >
                        {column.id.replace(/([A-Z])/g, " $1").trim()}
                      </DropdownMenuCheckboxItem>
                    );
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup: HeaderGroup<TData>) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header: Header<TData, unknown>) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row: Row<TData>) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={cn(onRowClick && "cursor-pointer hover:bg-muted/50")}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell: Cell<TData, unknown>) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {showPagination && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {table.getFilteredSelectedRowModel().rows.length > 0 && (
              <>
                {table.getFilteredSelectedRowModel().rows.length} of{" "}
                {table.getFilteredRowModel().rows.length} row(s) selected.
              </>
            )}
            {table.getFilteredSelectedRowModel().rows.length === 0 && (
              <>
                Showing{" "}
                {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{" "}
                {Math.min(
                  (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                  table.getFilteredRowModel().rows.length
                )}{" "}
                of {table.getFilteredRowModel().rows.length} rows
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">Rows per page</span>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => table.setPageSize(Number(value))}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue placeholder={table.getState().pagination.pageSize} />
                </SelectTrigger>
                <SelectContent side="top">
                  {[10, 20, 30, 40, 50].map((size) => (
                    <SelectItem key={size} value={`${size}`}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm mx-2">
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper component for sortable column headers
interface SortableHeaderProps {
  column: {
    getIsSorted: () => false | "asc" | "desc";
    toggleSorting: (desc?: boolean) => void;
  };
  title: string;
}

export function SortableHeader({ column, title }: SortableHeaderProps) {
  const isSorted = column.getIsSorted();

  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(isSorted === "asc")}
      className="-ml-4 h-8"
    >
      {title}
      {isSorted === "asc" && <ArrowUp className="ml-2 h-4 w-4" />}
      {isSorted === "desc" && <ArrowDown className="ml-2 h-4 w-4" />}
      {!isSorted && <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground/50" />}
    </Button>
  );
}

// Helper for status badges using centralized status colors
interface StatusCellProps {
  status: string;
  statusColors?: Record<string, string>;
}

export function StatusCell({ status, statusColors }: StatusCellProps) {
  // Using centralized color scheme with dark mode support
  const defaultColors: Record<string, string> = {
    // Draft/Initial states
    DRAFT: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
    NEW: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",

    // Pending/Waiting states
    PENDING: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
    AWAITING_APPROVAL: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
    ON_HOLD: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",

    // Active/In Progress states
    APPROVED: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
    CONFIRMED: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
    ACTIVE: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
    IN_PROGRESS: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
    PROCESSING: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
    PICKING: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
    ORDERED: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",

    // Shipping states
    SHIPPED: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
    IN_TRANSIT: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
    DELIVERED: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",

    // Completion states
    COMPLETED: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
    RECEIVED: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
    CLOSED: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",

    // Negative states
    CANCELLED: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
    REJECTED: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
    FAILED: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",

    // Partial states
    PARTIAL: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  };

  const colors = { ...defaultColors, ...statusColors };
  const colorClass = colors[status] || "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300";

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        colorClass
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

// Helper for currency formatting
export function CurrencyCell({ value, currency = "USD" }: { value: number; currency?: string }) {
  return (
    <span className="tabular-nums">
      {new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
      }).format(value)}
    </span>
  );
}

// Helper for date formatting
export function DateCell({ date, format: fmt = "short" }: { date: string | Date; format?: "short" | "long" | "relative" }) {
  const d = new Date(date);
  
  if (fmt === "relative") {
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return <span>Today</span>;
    if (days === 1) return <span>Yesterday</span>;
    if (days < 7) return <span>{days} days ago</span>;
  }

  return (
    <span>
      {d.toLocaleDateString("en-US", {
        year: "numeric",
        month: fmt === "long" ? "long" : "short",
        day: "numeric",
      })}
    </span>
  );
}
