import {
  getAdminDashboardMetrics,
  getAdminFinancialReportSummary,
  getBestSellersByQuantity,
  getSalesByCategory,
  getSalesData,
} from "@/lib/admin-server";
import { AdminProductsManager } from "@/components/admin/admin-products-manager";
import { AdminCharts } from "@/components/admin/admin-charts";
import { AdminReports } from "@/components/admin/admin-reports";
import { AdminOrdersManager } from "@/components/admin/admin-orders-manager";
import { AdminCouponsManager } from "@/components/admin/admin-coupons-manager";
import { AdminCollapsibleSection } from "@/components/admin/admin-collapsible-section";

export async function AdminPageView() {
  const [salesData, bestSellers, salesByCategory, dashboardMetrics, financialReport] =
    await Promise.all([
      getSalesData(),
      getBestSellersByQuantity(10),
      getSalesByCategory(),
      getAdminDashboardMetrics(),
      getAdminFinancialReportSummary(),
    ]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] bg-[var(--color-ink)] px-5 py-6 text-white sm:rounded-[2.5rem] sm:px-10 sm:py-10">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-white/60">
          Painel administrativo simples
        </p>
        <h1 className="mt-4 max-w-4xl font-display text-3xl font-black tracking-tight sm:text-5xl">
          Operacao pronta para acompanhar estoque, campanhas e pedidos.
        </h1>
      </div>
      <div className="grid gap-5 lg:grid-cols-4">
        {dashboardMetrics.map((metric) => {
          const body = (
            <>
              <p className="text-sm uppercase tracking-[0.22em] text-[var(--color-muted)]">
                {metric.label}
              </p>
              <p className="mt-3 font-display text-3xl font-black text-[var(--color-ink)] sm:text-4xl">
                {metric.value}
              </p>
              <p className="mt-2 text-sm font-semibold text-[var(--color-success)]">
                {metric.change}
              </p>
            </>
          );

          if (metric.label === "Faturamento do dia") {
            return (
              <a
                key={metric.label}
                href="#admin-gestao-vendas"
                aria-label="Ir para a gestao de vendas"
                className="block cursor-pointer rounded-[2rem] border border-[var(--color-line)] bg-white p-6 text-inherit no-underline transition-[box-shadow,border-color] hover:border-[var(--color-ink)]/25 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]"
              >
                {body}
              </a>
            );
          }

          if (metric.label === "Pedidos pendentes") {
            return (
              <a
                key={metric.label}
                href="#admin-gestao-pedidos"
                aria-label="Ir para a gestao de pedidos"
                className="block cursor-pointer rounded-[2rem] border border-[var(--color-line)] bg-white p-6 text-inherit no-underline transition-[box-shadow,border-color] hover:border-[var(--color-ink)]/25 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]"
              >
                {body}
              </a>
            );
          }

          if (metric.label === "Produtos com baixo estoque") {
            return (
              <a
                key={metric.label}
                href="#admin-gerenciamento-produtos"
                aria-label="Ir para o gerenciamento de produtos"
                className="block cursor-pointer rounded-[2rem] border border-[var(--color-line)] bg-white p-6 text-inherit no-underline transition-[box-shadow,border-color] hover:border-[var(--color-ink)]/25 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink)]"
              >
                {body}
              </a>
            );
          }

          return (
            <article
              key={metric.label}
              className="rounded-[2rem] border border-[var(--color-line)] bg-white p-6"
            >
              {body}
            </article>
          );
        })}
      </div>
      <AdminCollapsibleSection
        id="admin-gestao-pedidos"
        title="Gestao de pedidos"
        description="Atualize status, codigo de rastreio e links fiscais; emails sao enviados nas mudancas de status."
      >
        <AdminOrdersManager embedded />
      </AdminCollapsibleSection>
      <AdminCollapsibleSection
        title="Cupons"
        description="Crie cupons percentuais ou de valor fixo com validade, limite de uso e pedido minimo."
      >
        <AdminCouponsManager embedded />
      </AdminCollapsibleSection>
      <AdminCollapsibleSection
        id="admin-gestao-vendas"
        title="Gestao de Vendas"
        description="Evolucao mensal, ranking por quantidade e participacao da receita por categoria."
      >
        <AdminCharts
          salesData={salesData}
          bestSellers={bestSellers}
          salesByCategory={salesByCategory}
        />
      </AdminCollapsibleSection>
      <AdminCollapsibleSection
        title="Relatorios"
        description="Numeros em pedidos pagos, em processamento, enviados ou entregues. Cadastre o custo (CMV) em cada produto para o lucro e a margem refletirem a realidade."
        defaultCollapsed
      >
        <AdminReports report={financialReport} embedded />
      </AdminCollapsibleSection>
      <AdminCollapsibleSection
        id="admin-gerenciamento-produtos"
        title="Gerenciar produtos"
        description="Atualize estoque em lote e edite os produtos ja cadastrados. A criacao de novos produtos agora fica na pagina de Criacao de Produtos."
      >
        <AdminProductsManager embedded mode="manage" />
      </AdminCollapsibleSection>
    </div>
  );
}
