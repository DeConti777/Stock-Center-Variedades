import Link from "next/link";
import { auth } from "@/auth";
import { formatCurrency } from "@/lib/catalog";
import { formatPublicOrderId } from "@/lib/format-public-order-id";
import { getPrismaOrNull } from "@/lib/prisma";
import {
  syncPaidOrderFromMercadoPagoPaymentId,
  syncPaidOrderFromOrderIdMercadoPago,
} from "@/lib/mercado-pago-checkout-sync";
import { syncPaidOrderFromCheckoutSessionId } from "@/lib/stripe-checkout-sync";
import { PageEventTracker } from "@/components/analytics/page-event-tracker";
import { OrderItemThumbnail } from "@/components/account/order-items-preview";
import { PostCheckoutRegisterCta } from "@/components/checkout/post-checkout-register-cta";
import { PageHighlight } from "@/components/ui/page-highlight";

type SuccessPageProps = {
  searchParams: Promise<{
    session_id?: string;
    order_id?: string;
    payment_id?: string;
    collection_id?: string;
  }>;
};

function PaymentConfirmedIcon() {
  return (
    <span
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[var(--color-success)] sm:h-14 sm:w-14"
      role="img"
      aria-label="Pagamento confirmado"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-7 w-7 sm:h-8 sm:w-8"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden
      >
        <circle cx="12" cy="12" r="10" />
        <path
          d="M8 12.5 10.5 15 16 9"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2.5}
        />
      </svg>
    </span>
  );
}

export default async function CheckoutSuccessPage({
  searchParams,
}: SuccessPageProps) {
  const session = await auth();
  const { session_id, order_id, payment_id, collection_id } =
    await searchParams;
  const prisma = getPrismaOrNull();

  const mpPaymentId = payment_id?.trim() || collection_id?.trim() || null;

  let order = null;
  if (prisma && mpPaymentId) {
    order = await syncPaidOrderFromMercadoPagoPaymentId(prisma, mpPaymentId);
  } else if (prisma && order_id) {
    order = await syncPaidOrderFromOrderIdMercadoPago(prisma, order_id);
  } else if (prisma && session_id) {
    order = await syncPaidOrderFromCheckoutSessionId(prisma, session_id);
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-12 sm:px-6">
      <PageEventTracker
        eventName="checkout_result"
        payload={{
          status: "success",
          order_id: order?.id ?? null,
          total: order ? order.totalInCents / 100 : null,
        }}
      />
      <PageHighlight
        eyebrow="Pedido recebido"
        title={
          order?.status === "PAID" ? (
            <span className="flex flex-wrap items-center gap-3 sm:gap-4">
              Pagamento Confirmado
              <PaymentConfirmedIcon />
            </span>
          ) : (
            "Pagamento iniciado com sucesso."
          )
        }
        description={
          order?.status === "PAID"
            ? "Pagamento confirmado. Seu pedido entra no fluxo de expedicao."
            : "Assim que o Mercado Pago confirmar o pagamento, seu pedido entra no fluxo de expedicao."
        }
      />

      <section className="rounded-[2rem] border border-[var(--color-line)] bg-white p-6">
        {order ? (
          <>
            <h2 className="font-display text-2xl font-bold text-[var(--color-ink)]">
              Resumo do pedido {formatPublicOrderId(order.id)}
            </h2>
            <div className="mt-6 space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <OrderItemThumbnail
                      image={item.image}
                      productName={item.productName}
                      className="h-9 w-9 shrink-0 rounded-lg text-[10px]"
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--color-ink)]">
                        {item.productName}
                      </p>
                      <p className="text-sm text-[var(--color-muted)]">
                        Quantidade: {item.quantity}
                      </p>
                    </div>
                  </div>
                  <p className="font-bold text-[var(--color-ink)]">
                    {formatCurrency(
                      (item.lineTotalInCents ||
                        item.unitPriceInCents * item.quantity) / 100,
                    )}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-6 border-t border-[var(--color-line)] pt-6">
              <p className="text-lg font-bold text-[var(--color-ink)]">
                Total: {formatCurrency(order.totalInCents / 100)}
              </p>
            </div>
          </>
        ) : (
          <p className="text-sm text-[var(--color-muted)]">
            O pedido foi criado, mas os detalhes so aparecem depois que a sessao e vinculada.
          </p>
        )}
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href={order ? `/conta/pedidos/${order.id}` : "/conta"}
          className="inline-flex items-center justify-center rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-bold text-white"
        >
          Ver pedido
        </Link>
        <Link
          href="/catalogo"
          className="inline-flex items-center justify-center rounded-full border border-[var(--color-line)] px-6 py-3 text-sm font-bold text-[var(--color-ink)]"
        >
          Continuar comprando
        </Link>
        <PostCheckoutRegisterCta
          isAuthenticated={Boolean(session?.user?.id)}
          nextPath={order ? `/conta/pedidos/${order.id}` : "/conta/pedidos"}
          email={order?.customerEmail}
          label="Criar conta e acompanhar pedido"
          variant="secondary"
        />
      </div>
    </div>
  );
}
