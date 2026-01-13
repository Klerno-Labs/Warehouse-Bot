"use client";

import React, { useState, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";
import {
  GripVertical,
  Plus,
  X,
  Settings,
  Maximize2,
  Minimize2,
  BarChart3,
  Package,
  AlertTriangle,
  TrendingUp,
  Clock,
  Target,
  Truck,
  Users,
  DollarSign,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Customizable Dashboard with Drag-and-Drop Widgets
 *
 * Features:
 * - Drag and drop widget arrangement
 * - Resizable widgets (small, medium, large)
 * - Widget library to add new widgets
 * - Persist layout to user preferences
 * - Responsive grid layout
 * - Widget settings per widget
 */

// Widget definitions
interface WidgetDefinition {
  id: string;
  type: string;
  title: string;
  description: string;
  icon: React.ElementType;
  defaultSize: "sm" | "md" | "lg";
  minSize: "sm" | "md" | "lg";
  component: React.ComponentType<WidgetProps>;
}

interface WidgetInstance {
  id: string;
  type: string;
  size: "sm" | "md" | "lg";
  settings?: Record<string, any>;
}

interface WidgetProps {
  widget: WidgetInstance;
  onSettingsChange?: (settings: Record<string, any>) => void;
}

// Size classes
const sizeClasses = {
  sm: "col-span-1",
  md: "col-span-2",
  lg: "col-span-3 lg:col-span-4",
};

// Sample widget components
function MetricWidget({ widget }: WidgetProps) {
  return (
    <div className="h-full flex flex-col justify-center">
      <p className="text-3xl font-bold">$2.8M</p>
      <p className="text-sm text-muted-foreground">Total Stock Value</p>
      <div className="flex items-center gap-1 mt-2 text-emerald-500 text-sm">
        <TrendingUp className="h-4 w-4" />
        <span>+12.4% vs last month</span>
      </div>
    </div>
  );
}

function ChartWidget({ widget }: WidgetProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex items-end gap-1 pb-2">
        {[40, 65, 45, 70, 55, 80, 75, 90, 85, 95, 70, 85].map((h, i) => (
          <motion.div
            key={i}
            initial={{ height: 0 }}
            animate={{ height: `${h}%` }}
            transition={{ delay: i * 0.05 }}
            className="flex-1 rounded-t bg-gradient-to-t from-blue-500/60 to-blue-500/20"
          />
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t">
        <span>Jan</span>
        <span>Jun</span>
        <span>Dec</span>
      </div>
    </div>
  );
}

function AlertsWidget({ widget }: WidgetProps) {
  const alerts = [
    { type: "critical", message: "3 items out of stock", icon: AlertTriangle },
    { type: "warning", message: "8 items low stock", icon: Package },
    { type: "info", message: "2 POs pending approval", icon: Clock },
  ];

  return (
    <div className="space-y-2">
      {alerts.map((alert, i) => (
        <div
          key={i}
          className={cn(
            "flex items-center gap-2 p-2 rounded-lg text-sm",
            alert.type === "critical" && "bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400",
            alert.type === "warning" && "bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400",
            alert.type === "info" && "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400"
          )}
        >
          <alert.icon className="h-4 w-4 flex-shrink-0" />
          <span>{alert.message}</span>
        </div>
      ))}
    </div>
  );
}

function ActivityWidget({ widget }: WidgetProps) {
  const activities = [
    { action: "Received", item: "Steel Plate 4x8", time: "2m ago" },
    { action: "Shipped", item: "Order #1234", time: "15m ago" },
    { action: "Adjusted", item: "Fastener Kit A", time: "1h ago" },
  ];

  return (
    <div className="space-y-3">
      {activities.map((activity, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{activity.item}</p>
            <p className="text-xs text-muted-foreground">{activity.action}</p>
          </div>
          <span className="text-xs text-muted-foreground">{activity.time}</span>
        </div>
      ))}
    </div>
  );
}

function QuickActionsWidget({ widget }: WidgetProps) {
  const actions = [
    { label: "Receive", icon: Package, color: "bg-emerald-500" },
    { label: "Ship", icon: Truck, color: "bg-blue-500" },
    { label: "Count", icon: Target, color: "bg-purple-500" },
    { label: "Adjust", icon: Activity, color: "bg-amber-500" },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {actions.map((action) => (
        <button
          key={action.label}
          className="flex flex-col items-center gap-2 p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        >
          <div className={cn("p-2 rounded-lg text-white", action.color)}>
            <action.icon className="h-4 w-4" />
          </div>
          <span className="text-xs font-medium">{action.label}</span>
        </button>
      ))}
    </div>
  );
}

// Widget library
const WIDGET_LIBRARY: WidgetDefinition[] = [
  {
    id: "stock-value",
    type: "metric",
    title: "Stock Value",
    description: "Total inventory value with trend",
    icon: DollarSign,
    defaultSize: "sm",
    minSize: "sm",
    component: MetricWidget,
  },
  {
    id: "inventory-chart",
    type: "chart",
    title: "Inventory Trend",
    description: "Stock levels over time",
    icon: BarChart3,
    defaultSize: "md",
    minSize: "md",
    component: ChartWidget,
  },
  {
    id: "alerts",
    type: "alerts",
    title: "Alerts",
    description: "Items needing attention",
    icon: AlertTriangle,
    defaultSize: "sm",
    minSize: "sm",
    component: AlertsWidget,
  },
  {
    id: "activity",
    type: "activity",
    title: "Recent Activity",
    description: "Latest inventory movements",
    icon: Clock,
    defaultSize: "md",
    minSize: "sm",
    component: ActivityWidget,
  },
  {
    id: "quick-actions",
    type: "actions",
    title: "Quick Actions",
    description: "Common operations",
    icon: Target,
    defaultSize: "sm",
    minSize: "sm",
    component: QuickActionsWidget,
  },
];

// Sortable widget component
function SortableWidget({
  widget,
  onRemove,
  onResize,
  isEditing,
}: {
  widget: WidgetInstance;
  onRemove: () => void;
  onResize: (size: "sm" | "md" | "lg") => void;
  isEditing: boolean;
}) {
  const definition = WIDGET_LIBRARY.find((w) => w.id === widget.type);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (!definition) return null;

  const WidgetComponent = definition.component;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      className={cn(
        sizeClasses[widget.size],
        isDragging && "opacity-50 z-50"
      )}
    >
      <Card className={cn(
        "h-full min-h-[180px] relative group",
        isEditing && "ring-2 ring-blue-500/50"
      )}>
        {/* Drag handle and controls */}
        {isEditing && (
          <div className="absolute -top-2 -right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            {/* Size controls */}
            <div className="flex items-center bg-white dark:bg-zinc-900 rounded-lg shadow-lg border p-0.5">
              {(["sm", "md", "lg"] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => onResize(size)}
                  className={cn(
                    "w-6 h-6 flex items-center justify-center rounded text-xs font-medium transition-colors",
                    widget.size === size
                      ? "bg-blue-500 text-white"
                      : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  )}
                >
                  {size.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              onClick={onRemove}
              className="w-6 h-6 flex items-center justify-center bg-red-500 text-white rounded-lg shadow-lg"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            {isEditing && (
              <button
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1 -ml-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <GripVertical className="h-4 w-4 text-zinc-400" />
              </button>
            )}
            <CardTitle className="text-sm font-medium">
              {definition.title}
            </CardTitle>
          </div>
          <definition.icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <WidgetComponent widget={widget} />
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Add widget dialog
function AddWidgetDialog({
  open,
  onClose,
  onAdd,
  existingWidgets,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (widgetType: string) => void;
  existingWidgets: string[];
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Widget</DialogTitle>
          <DialogDescription>
            Choose a widget to add to your dashboard
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-4">
          {WIDGET_LIBRARY.map((widget) => {
            const alreadyAdded = existingWidgets.includes(widget.id);
            return (
              <button
                key={widget.id}
                onClick={() => {
                  onAdd(widget.id);
                  onClose();
                }}
                disabled={alreadyAdded}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border text-left transition-colors",
                  alreadyAdded
                    ? "opacity-50 cursor-not-allowed bg-zinc-50 dark:bg-zinc-900"
                    : "hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:border-blue-500"
                )}
              >
                <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                  <widget.icon className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{widget.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {widget.description}
                  </p>
                </div>
                {alreadyAdded && (
                  <span className="text-xs text-muted-foreground">Added</span>
                )}
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Main customizable dashboard component
export function CustomizableDashboard() {
  const [widgets, setWidgets] = useState<WidgetInstance[]>([
    { id: "1", type: "stock-value", size: "sm" },
    { id: "2", type: "inventory-chart", size: "md" },
    { id: "3", type: "alerts", size: "sm" },
    { id: "4", type: "activity", size: "md" },
    { id: "5", type: "quick-actions", size: "sm" },
  ]);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      setWidgets((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleRemoveWidget = useCallback((id: string) => {
    setWidgets((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const handleResizeWidget = useCallback((id: string, size: "sm" | "md" | "lg") => {
    setWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, size } : w))
    );
  }, []);

  const handleAddWidget = useCallback((type: string) => {
    const definition = WIDGET_LIBRARY.find((w) => w.id === type);
    if (!definition) return;

    setWidgets((prev) => [
      ...prev,
      {
        id: `${type}-${Date.now()}`,
        type,
        size: definition.defaultSize,
      },
    ]);
  }, []);

  const activeWidget = activeId ? widgets.find((w) => w.id === activeId) : null;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Dashboard</h2>
        <div className="flex items-center gap-2">
          {isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddWidget(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Widget
            </Button>
          )}
          <Button
            variant={isEditing ? "default" : "outline"}
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
          >
            <Settings className="h-4 w-4 mr-1" />
            {isEditing ? "Done" : "Customize"}
          </Button>
        </div>
      </div>

      {/* Editing hint */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 text-sm text-blue-600 dark:text-blue-400"
          >
            Drag widgets to rearrange. Hover over a widget to resize or remove it.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Widget grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={widgets.map((w) => w.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {widgets.map((widget) => (
              <SortableWidget
                key={widget.id}
                widget={widget}
                onRemove={() => handleRemoveWidget(widget.id)}
                onResize={(size) => handleResizeWidget(widget.id, size)}
                isEditing={isEditing}
              />
            ))}
          </div>
        </SortableContext>

        {/* Drag overlay */}
        <DragOverlay>
          {activeWidget && (
            <div className={cn(sizeClasses[activeWidget.size], "opacity-80")}>
              <Card className="h-full min-h-[180px] shadow-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    {WIDGET_LIBRARY.find((w) => w.id === activeWidget.type)?.title}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Add widget dialog */}
      <AddWidgetDialog
        open={showAddWidget}
        onClose={() => setShowAddWidget(false)}
        onAdd={handleAddWidget}
        existingWidgets={widgets.map((w) => w.type)}
      />
    </div>
  );
}
