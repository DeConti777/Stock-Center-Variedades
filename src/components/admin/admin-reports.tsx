"use client";

import { useState } from "react";
import type {
  AdminFinancialReportSummary,
  AdminReportPeriodSnapshot,
} from "@/lib/admin-server";
import { adminActionButtonClass } from "@/components/admin/admin-mobile-ui";

async function fetchReportData(type: "orders" | "products") {
  const response = await fetch(
    type === "orders" ? "/api/admin/orders" : "/api/admin/products",
  );

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || "Erro ao exportar relatorio.");
  }

  const payload = await response.json();
  return type === "orders" ? payload.orders || [] : payload.products || [];
}

function generateCSV(data: Record<string, unknown>[]) {
  if (data.length === 0) return "";

  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers
      .map((header) => {
        const value = row[header];
        const normalized =
          typeof value === "object" && value !== null
            ? JSON.stringify(value)
            : String(value ?? "");
        return `"${normalized.replace(/"/g, '""')}"`;
      })
      .join(","),
  );

  return [headers.join(","), ...rows].join("\n");
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function formatBrl(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function Kpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
        {label}
      </p>
      <p className="mt-2 font-display text-lg font-bold tracking-tight text-[var(--color-ink)] sm:text-xl">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted)]">{hint}</p> : null}
    </div>
  );
}

function PeriodBlock({
  title,
  description,
  snap,
}: {
  title: string;
  description: string;
  snap: AdminReportPeriodSnapshot;
}) {
  const marginLabel =
    snap.marginPercent != null
      ? `${snap.marginPercent.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
      : "—";

  const coverageHint =
    snap.lineItemsCount === 0
      ? "Sem linhas de pedido no periodo."
      : snap.lineItemsWithCostCount < snap.lineItemsCount
        ? `${snap.lineItemsWithCostCount} de ${snap.lineItemsCount} linhas com custo cadastrado no produto — CMV pode estar incompleto.`
        : "CMV com base no custo atual de cada produto.";

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-lg font-bold text-[var(--color-ink)]">{title}</h3>
        <p className="mt-1 text-sm text-[var(--color-muted)]">{description}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Kpi label="Pedidos" value={String(snap.ordersCount)} />
        <Kpi label="Itens vendidos (un.)" value={String(snap.itemsQuantity)} />
        <Kpi label="Ticket medio" value={formatBrl(snap.avgTicketBrl)} />
        <Kpi label="Receita (total pago)" value={formatBrl(snap.revenueBrl)} hint="Soma dos totais dos pedidos." />
        <Kpi
          label="Mercadoria (linhas)"
          value={formatBrl(snap.merchandiseFromLinesBrl)}
          hint="Soma dos totais por item vendido."
        />
        <Kpi label="Subtotal pedidos" value={formatBrl(snap.ordersSubtotalBrl)} hint="Antes do desconto do cupom." />
        <Kpi label="Descontos" value={formatBrl(snap.discountsBrl)} />
        <Kpi label="Frete cobrado" value={formatBrl(snap.shippingBrl)} />
        <Kpi label="CMV (custo vendido)" value={formatBrl(snap.cmvBrl)} hint={coverageHint} />
        <Kpi
          label="Lucro bruto"
          value={formatBrl(snap.grossProfitBrl)}
          hint="Mercadoria nas linhas menos CMV (custos cadastrados)."
        />
        <Kpi label="Margem s/ mercadoria" value={marginLabel} hint="Lucro bruto / valor das linhas." />
      </div>
    </div>
  );
}

export function AdminReports({
  report,
  embedded = false,
}: {
  report: AdminFinancialReportSummary;
  embedded?: boolean;
}) {
  const [sectionCollapsed, setSectionCollapsed] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function exportCSV(type: "orders" | "products") {
    setExporting(true);
    setFeedback(null);
    try {
      const data = await fetchReportData(type);
      if (!Array.isArray(data) || data.length === 0) {
        setFeedback({
          type: "err",
          text:
            type === "orders"
              ? "Nao ha pedidos para exportar."
              : "Nao ha produtos para exportar.",
        });
        return;
      }
      const csv = generateCSV(data as Record<string, unknown>[]);
      if (!csv) {
        setFeedback({ type: "err", text: "Nao foi possivel montar o CSV." });
        return;
      }
      const stamp = new Date().toISOString().slice(0, 10);
      downloadCSV(csv, `${type}-${stamp}.csv`);
      setFeedback({ type: "ok", text: "Arquivo CSV gerado com sucesso." });
    } catch (e) {
      setFeedback({
        type: "err",
        text: e instanceof Error ? e.message : "Erro ao exportar.",
      });
    } finally {
      setExporting(false);
    }
  }

  const isCollapsed = embedded ? false : sectionCollapsed;

  return (
    <div className="space-y-5">
      {!embedded ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-2xl font-bold text-[var(--color-ink)]">Relatórios</h2>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              Numeros em pedidos pagos, em processamento, enviados ou entregues. Cadastre o custo (CMV)
              em cada produto para o lucro e a margem refletirem a realidade.
            </p>
            {isCollapsed && report.databaseConfigured ? (
              <p className="mt-2 text-xs font-semibold text-[var(--color-primary)]">
                Ultimos 30 dias: {formatBrl(report.last30Days.revenueBrl)} receita ·{" "}
                {report.last30Days.ordersCount} pedido(s) · Lucro bruto{" "}
                {formatBrl(report.last30Days.grossProfitBrl)}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setSectionCollapsed((c) => !c)}
            className="touch-target-mobile shrink-0 rounded-full border border-[var(--color-line)] px-5 py-2 text-sm font-bold text-[var(--color-ink)] hover:bg-[var(--color-surface)]"
            aria-expanded={!sectionCollapsed}
          >
            {sectionCollapsed ? "Expandir" : "Minimizar"}
          </button>
        </div>
      ) : null}

      {!report.databaseConfigured ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Banco de dados nao configurado — metricas e exportacao indisponiveis ate conectar o Prisma.
        </p>
      ) : null}

      {!isCollapsed ? (
        <div className="space-y-8">
          {report.databaseConfigured ? (
            <>
              <PeriodBlock
                title="Últimos 30 dias"
                description="Janela movel com base na data de pagamento (ou criacao, se ainda nao pago)."
                snap={report.last30Days}
              />
              <div className="border-t border-[var(--color-line)] pt-8">
                <PeriodBlock
                  title="Histórico completo"
                  description="Todos os pedidos contabilizados desde o inicio."
                  snap={report.allTime}
                />
              </div>
            </>
          ) : null}

          <div
            className={
              report.databaseConfigured ? "border-t border-[var(--color-line)] pt-8" : undefined
            }
          >
            <h3 className="font-display text-lg font-bold text-[var(--color-ink)]">Exportar dados</h3>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              Baixe planilhas para analise externa ou backup.
            </p>
            {feedback ? (
              <p
                className={`mt-4 rounded-2xl p-3 text-sm ${
                  feedback.type === "ok"
                    ? "bg-[var(--color-success)]/10 text-[var(--color-ink)]"
                    : "bg-red-50 text-red-800"
                }`}
              >
                {feedback.text}
              </p>
            ) : null}
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => void exportCSV("orders")}
                disabled={exporting || !report.databaseConfigured}
                className={adminActionButtonClass({ tone: "primary" })}
              >
                Exportar pedidos (CSV)
              </button>
              <button
                type="button"
                onClick={() => void exportCSV("products")}
                disabled={exporting || !report.databaseConfigured}
                className={adminActionButtonClass({})}
              >
                Exportar produtos (CSV)
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
