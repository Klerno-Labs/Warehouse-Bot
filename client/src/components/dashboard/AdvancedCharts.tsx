import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const COLORS = {
  primary: "#0f172a",    // Slate-900
  secondary: "#475569",  // Slate-600
  success: "#16a34a",    // Green-600
  warning: "#ea580c",    // Orange-600
  danger: "#dc2626",     // Red-600
  info: "#2563eb",       // Blue-600
  purple: "#9333ea",     // Purple-600
  teal: "#0d9488",       // Teal-600
};

interface InventoryTrendData {
  date: string;
  value: number;
  quantity: number;
}

interface StockMovementData {
  name: string;
  receives: number;
  moves: number;
  adjustments: number;
}

interface CategoryDistributionData {
  name: string;
  value: number;
  count: number;
}

interface AdvancedChartsProps {
  inventoryTrend?: InventoryTrendData[];
  stockMovement?: StockMovementData[];
  categoryDistribution?: CategoryDistributionData[];
  abcAnalysis?: { A: number; B: number; C: number };
}

export function InventoryValueTrend({ data }: { data: InventoryTrendData[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory Value Trend (30 Days)</CardTitle>
        <CardDescription>Track your inventory value over time</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8} />
                <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
            />
            <YAxis
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
              }}
              formatter={(value: number) => [`$${value.toLocaleString()}`, "Value"]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={COLORS.primary}
              fillOpacity={1}
              fill="url(#colorValue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function StockMovementChart({ data }: { data: StockMovementData[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock Movement (7 Days)</CardTitle>
        <CardDescription>Receives, moves, and adjustments by day</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="name"
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
            />
            <YAxis stroke="#6b7280" fontSize={12} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
              }}
            />
            <Legend />
            <Bar dataKey="receives" fill={COLORS.success} radius={[4, 4, 0, 0]} />
            <Bar dataKey="moves" fill={COLORS.info} radius={[4, 4, 0, 0]} />
            <Bar dataKey="adjustments" fill={COLORS.warning} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function CategoryDistributionChart({ data }: { data: CategoryDistributionData[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory by Category</CardTitle>
        <CardDescription>Distribution of inventory value across categories</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={Object.values(COLORS)[index % Object.values(COLORS).length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
              }}
              formatter={(value: number, name, props) => [
                `$${value.toLocaleString()} (${props.payload.count} items)`,
                name,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function ABCAnalysisChart({ data }: { data: { A: number; B: number; C: number } }) {
  const chartData = [
    {
      name: "A Items",
      value: data.A,
      description: "High value",
      fill: COLORS.success,
    },
    {
      name: "B Items",
      value: data.B,
      description: "Medium value",
      fill: COLORS.warning,
    },
    {
      name: "C Items",
      value: data.C,
      description: "Low value",
      fill: COLORS.danger,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>ABC Analysis</CardTitle>
        <CardDescription>Inventory classification by value</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis type="number" stroke="#6b7280" fontSize={12} tickLine={false} />
            <YAxis
              type="category"
              dataKey="name"
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              width={100}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
              }}
              formatter={(value: number, name, props) => [
                `${value} items - ${props.payload.description}`,
                props.payload.name,
              ]}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function ProductionStatusChart({
  active,
  planned,
  completed,
}: {
  active: number;
  planned: number;
  completed: number;
}) {
  const data = [
    { name: "Active", value: active, fill: COLORS.info },
    { name: "Planned", value: planned, fill: COLORS.secondary },
    { name: "Completed", value: completed, fill: COLORS.success },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Production Status</CardTitle>
        <CardDescription>Current state of production orders</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">{active}</div>
            <div className="text-xs text-muted-foreground">Active</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-600">{planned}</div>
            <div className="text-xs text-muted-foreground">Planned</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">{completed}</div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
