import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartItem } from "@/types/pesquisa";

const COLORS = [
  "#19224a",
  "#3b5bdb",
  "#22c55e",
  "#eab308",
  "#ef4444",
  "#a855f7",
  "#64748b",
  "#f97316",
  "#06b6d4",
  "#ec4899",
];

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function ChartCard({ title, children, className = "" }: ChartCardProps) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 ${className}`}>
      <h3 className="mb-4 text-sm font-semibold text-slate-700">{title}</h3>
      {children}
    </div>
  );
}

function formatPercent(value: number) {
  return `${Number(value).toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  })}%`;
}

function toPercentData(data: ChartItem[], percentBase?: number) {
  const base =
    percentBase && percentBase > 0
      ? percentBase
      : data.reduce((sum, item) => sum + (Number(item.total) || 0), 0);

  if (!base) {
    return data.map((item) => ({ ...item, percent: 0, count: Number(item.total) || 0 }));
  }

  return data.map((item) => {
    const count = Number(item.total) || 0;
    return {
      ...item,
      count,
      percent: Math.round((count / base) * 1000) / 10,
    };
  });
}

interface BarChartPanelProps {
  data: ChartItem[];
  layout?: "horizontal" | "vertical";
  color?: string;
  /** Quando informado, a % é sobre esse total (ex.: respondentes). Senão, sobre a soma da série. */
  percentBase?: number;
}

export function BarChartPanel({
  data,
  layout = "vertical",
  color = "#3b5bdb",
  percentBase,
}: BarChartPanelProps) {
  if (!data.length) {
    return <p className="py-8 text-center text-sm text-slate-400">Sem dados</p>;
  }

  const percentData = toPercentData(data, percentBase);

  return (
    <ResponsiveContainer width="100%" height={Math.max(220, percentData.length * 36)}>
      <BarChart
        data={percentData}
        layout={layout === "horizontal" ? "vertical" : "horizontal"}
        margin={{ top: 5, right: 16, left: layout === "horizontal" ? 80 : 0, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        {layout === "horizontal" ? (
          <>
            <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={formatPercent} unit="" />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={75} />
          </>
        ) : (
          <>
            <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={formatPercent} />
          </>
        )}
        <Tooltip
          formatter={(value: number, _name, item) => {
            const count = (item?.payload as { count?: number })?.count;
            const label = count != null ? `${formatPercent(value)} (${count})` : formatPercent(value);
            return [label, "Participação"];
          }}
        />
        <Bar dataKey="percent" fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PieChartPanel({
  data,
  percentBase,
}: {
  data: ChartItem[];
  percentBase?: number;
}) {
  if (!data.length) {
    return <p className="py-8 text-center text-sm text-slate-400">Sem dados</p>;
  }

  const percentData = toPercentData(data, percentBase);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={percentData}
          dataKey="percent"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={90}
          label={({ name, percent }) => `${name} (${((Number(percent) || 0) * 100).toFixed(1)}%)`}
          labelLine={false}
        >
          {percentData.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number, _name, item) => {
            const count = (item?.payload as { count?: number })?.count;
            const label = count != null ? `${formatPercent(value)} (${count})` : formatPercent(value);
            return [label, "Participação"];
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-brand-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}
