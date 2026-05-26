import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { OrderItemsPreview } from "@/components/account/order-items-preview";
import { formatCurrency } from "@/lib/catalog";
import { getOrderStatusLabel } from "@/lib/order-status";
import { getPrismaOrNull } from "@/lib/prisma";
import { RebuyOrderButton } from "@/components/account/rebuy-order-button";
import { PageHighlight } from "@/components/ui/page-highlight";

export const metadata: Metadata = {
  title: "Meus Pedidos",
  description: "Acompanhe pedidos, pagamento, rastreamento e historico de compras.",
};

export default async function CustomerOrdersPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?next=/conta/pedidos");
  }

  const prisma = getPrismaOrNull();
  const orders = prisma
    ? await prisma.order.findMany({
        where: { userId: session.user.id },
        include: { items: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <PageHighlight
        eyebrow="Minha conta"
        title="Meus pedidos"
        description="Historico completo de compras, pagamentos e entregas."
      />

      <section className="rounded-[2rem] border border-[var(--color-line)] bg-white p-6">
        <div className="space-y-4">
          {orders.length ? (
            orders.map((order) => (
              <article
                key={order.id}
                className="rounded-[1.5rem] bg-[var(--color-soft)] p-4 sm:p-5"
              >
                <Link
                  href={`/conta/pedidos/${order.id}`}
                  className="flex min-w-0 flex-col gap-4 overflow-hidden transition hover:-translate-y-0.5 sm:flex-row sm:items-stretch sm:justify-between"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:gap-5">
                    <OrderItemsPreview
                      items={order.items.map((item) => ({
                        id: item.id,
                        productName: item.productName,
                        image: item.image,
                        quantity: item.quantity,
                      }))}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-[var(--color-ink)]">
                        Pedido{" "}
                        <span className="font-mono tracking-wide">
                          {order.id.slice(0, 8).toUpperCase()}
                        </span>
                      </p>
                      <p className="mt-1 text-sm text-[var(--color-muted)]">
                        {new Date(order.createdAt).toLocaleDateString("pt-BR")} · {order.items.length}{" "}
                        item(ns)
                      </p>
                      <p className="mt-2 text-sm font-semibold text-[var(--color-primary)]">
                        {getOrderStatusLabel(order.status)}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col sm:items-end sm:text-right">
                    <p className="text-lg font-black text-[var(--color-ink)]">
                      {formatCurrency(order.totalInCents / 100)}
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">Ver detalhes</p>
                  </div>
                </Link>
                <div className="mt-4">
                  <RebuyOrderButton
                    orderId={order.id}
                    items={order.items.map((item) => ({
                      productId: item.productId,
                      quantity: item.quantity,
                    }))}
                    className="inline-flex items-center justify-center rounded-full border border-[var(--color-line)] px-4 py-2 text-sm font-bold text-[var(--color-ink)]"
                  />
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-[1.5rem] bg-[var(--color-soft)] p-6 text-sm text-[var(--color-muted)]">
              Nenhum pedido encontrado ainda.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
