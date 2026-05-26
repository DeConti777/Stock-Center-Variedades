"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

export type AdminSalesData = {
  totalSales: number;
  salesByMonth: { month: string; sales: number }[];
};

export type AdminBestSeller = { name: string; sales: number };

export type AdminSalesByCategory = { name: string; value: number };

const CATEGORY_SLICE_COLORS = [
  "#2563eb",
  "#16a34a",
  "#d97706",
  "#7c3aed",
  "#db2777",
  "#0d9488",
  "#4f46e5",
  "#ca8a04",
  "#64748b",
  "#0ea5e9",
];

export function AdminCharts({
  salesData,
  bestSellers,
  salesByCategory,
}: {
  salesData: AdminSalesData;
  bestSellers: AdminBestSeller[];
  salesByCategory: AdminSalesByCategory[];
}) {
  const compactBestSellers = bestSellers.slice(0, 5);
  const compactSalesByCategory = salesByCategory.slice(0, 6);
  const formatBrl = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <div className="flex flex-col gap-10">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="min-h-[280px]">
          <h3 className="mb-4 text-lg font-semibold">Vendas por mes (12 meses)</h3>
          {salesData.salesByMonth.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">
              Sem pedidos pagos no periodo para exibir o grafico.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={salesData.salesByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis width={70} tick={{ fontSize: 11 }} tickFormatter={(v) => formatBrl(Number(v))} />
                <Tooltip formatter={(value) => formatBrl(Number(value))} />
                <Line type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="min-h-[280px]">
          <h3 className="mb-4 text-lg font-semibold">Itens mais vendidos (quantidade)</h3>
          {bestSellers.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">
              Ainda nao ha itens em pedidos pagos para ranquear.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={compactBestSellers} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={86}
                  tick={{ fontSize: 10 }}
                  interval={0}
                  tickFormatter={(value) =>
                    String(value).length > 12 ? `${String(value).slice(0, 12)}...` : String(value)
                  }
                />
                <Tooltip />
                <Bar dataKey="sales" fill="#16a34a" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="min-h-[260px]">
        <h3 className="mb-1 text-lg font-semibold">Vendas por categoria</h3>
        <p className="mb-4 text-sm text-[var(--color-muted)]">
          Participacao da receita por categoria em pedidos pagos, enviados ou entregues.
        </p>
        {compactSalesByCategory.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">
            Ainda nao ha itens em pedidos pagos para agrupar por categoria.
          </p>
        ) : (
          <div className="mx-auto w-full max-w-lg">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={compactSalesByCategory}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={72}
                  outerRadius={112}
                  paddingAngle={2}
                  label={({ percent }) =>
                    typeof percent === "number" && percent >= 0.04
                      ? `${Math.round(percent * 100)}%`
                      : ""
                  }
                >
                  {compactSalesByCategory.map((_, index) => (
                    <Cell
                      key={`cat-${compactSalesByCategory[index]?.name ?? index}`}
                      fill={CATEGORY_SLICE_COLORS[index % CATEGORY_SLICE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatBrl(Number(value))} />
                <Legend
                  layout="horizontal"
                  align="center"
                  verticalAlign="bottom"
                  formatter={(value) =>
                    value.length > 14 ? `${value.slice(0, 12)}…` : value
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
