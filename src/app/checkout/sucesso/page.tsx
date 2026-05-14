import Link from "next/link";
import { auth } from "@/auth";
import { formatCurrency } from "@/lib/catalog";
import { getPrismaOrNull } from "@/lib/prisma";
import { PageEventTracker } from "@/components/analytics/page-event-tracker";
import { PostCheckoutRegisterCta } from "@/components/checkout/post-checkout-register-cta";

type SuccessPageProps = {
  searchParams: Promise<{ session_id?: string }>;
};

export default async function CheckoutSuccessPage({
  searchParams,
}: SuccessPageProps) {
  const session = await auth();
  const { session_id } = await searchParams;
  const prisma = getPrismaOrNull();

  const order =
    prisma && session_id
      ? await prisma.order.findFirst({
          where: {
            stripeCheckoutSessionId: session_id,
          },
          include: {
            items: true,
          },
        })
      : null;

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
      <div className="rounded-[2rem] bg-[var(--color-ink)] px-5 py-6 text-white sm:rounded-[2.5rem] sm:px-10 sm:py-10">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-white/60">
          Pedido recebido
        </p>
        <h1 className="mt-4 font-display text-4xl font-black tracking-tight">
          Pagamento iniciado com sucesso.
        </h1>
        <p className="mt-4 text-base text-white/75">
          Assim que a Stripe confirmar o pagamento, seu pedido entra no fluxo de expedicao.
        </p>
      </div>

      <section className="rounded-[2rem] border border-[var(--color-line)] bg-white p-6">
        {order ? (
          <>
            <h2 className="font-display text-2xl font-bold text-[var(--color-ink)]">
              Resumo do pedido {order.id}
            </h2>
            <div className="mt-6 space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-[var(--color-ink)]">
                      {item.productName}
                    </p>
                    <p className="text-sm text-[var(--color-muted)]">
                      Quantidade: {item.quantity}
                    </p>
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
