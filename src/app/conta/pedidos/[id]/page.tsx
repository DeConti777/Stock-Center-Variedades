import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { formatCurrency } from "@/lib/catalog";
import {
  customerOrderTimeline,
  getOrderStatusLabel,
  getReachedOrderStatusIndex,
} from "@/lib/order-status";
import { getPrismaOrNull } from "@/lib/prisma";
import { syncPaidOrderFromCheckoutSessionId } from "@/lib/stripe-checkout-sync";
import { whatsappLink } from "@/lib/site-data";
import { OrderItemThumbnail } from "@/components/account/order-items-preview";
import { RebuyOrderButton } from "@/components/account/rebuy-order-button";
import { PageHighlight } from "@/components/ui/page-highlight";

type OrderDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: OrderDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Pedido ${id.slice(0, 8).toUpperCase()}`,
    description: "Detalhes do pedido, rastreamento, pagamento e nota fiscal.",
  };
}

function parseShippingAddress(raw: string) {
  try {
    return JSON.parse(raw) as {
      recipientName?: string;
      cep?: string;
      city?: string;
      state?: string;
      street?: string;
      number?: string;
      complement?: string;
      neighborhood?: string;
    };
  } catch {
    return {};
  }
}

function pickupHelpText() {
  return (
    process.env.NEXT_PUBLIC_PICKUP_INSTRUCTIONS?.trim() ||
    "Retire na loja com documento com foto e o codigo enviado por e-mail apos a confirmacao do pagamento."
  );
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.id) {
    redirect(`/login?next=/conta/pedidos/${id}`);
  }

  const prisma = getPrismaOrNull();

  if (!prisma) {
    notFound();
  }

  let order = await prisma.order.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
    include: {
      items: true,
      notificationLogs: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!order) {
    notFound();
  }

  if (
    order.status === "PENDING_PAYMENT" &&
    order.stripeCheckoutSessionId
  ) {
    await syncPaidOrderFromCheckoutSessionId(prisma, order.stripeCheckoutSessionId);
    order =
      (await prisma.order.findFirst({
        where: { id, userId: session.user.id },
        include: {
          items: true,
          notificationLogs: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
        },
      })) ?? order;
  }

  const address = parseShippingAddress(order.shippingAddress);
  const reachedIndex = getReachedOrderStatusIndex(order.status);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <PageHighlight
        eyebrow={`Pedido ${order.id.slice(0, 8).toUpperCase()}`}
        title={getOrderStatusLabel(order.status)}
        description={`Criado em ${order.createdAt.toLocaleDateString("pt-BR")} · Total ${formatCurrency(order.totalInCents / 100)}`}
      >
        <RebuyOrderButton
          orderId={order.id}
          items={order.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          }))}
          className="inline-flex items-center justify-center rounded-full bg-[var(--color-primary)] px-5 py-3 text-sm font-bold text-white"
        />
      </PageHighlight>

      <section className="rounded-[2rem] border border-[var(--color-line)] bg-white p-6">
        <h2 className="font-display text-2xl font-bold text-[var(--color-ink)]">
          Linha do tempo
        </h2>
        <div className="mt-6 md:hidden">
          <ol className="relative grid grid-cols-5 items-start gap-0">
            <div
              className="pointer-events-none absolute left-[10%] right-[10%] top-[5px] h-0.5 bg-[var(--color-line)]"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute left-[10%] top-[5px] h-0.5 bg-[var(--color-primary)] transition-[width]"
              style={{
                width:
                  reachedIndex <= 0
                    ? "0%"
                    : `${(reachedIndex / (customerOrderTimeline.length - 1)) * 80}%`,
              }}
              aria-hidden
            />
            {customerOrderTimeline.map((step, index) => {
              const active = index <= reachedIndex;
              return (
                <li
                  key={step.status}
                  title={step.label}
                  className="relative z-10 flex flex-col items-center px-0.5 text-center"
                >
                  <span
                    className={`inline-flex h-3 w-3 shrink-0 rounded-full ring-2 ring-white ${
                      active ? "bg-[var(--color-primary)]" : "bg-[var(--color-line)]"
                    }`}
                    aria-hidden
                  />
                  <p
                    className={`mt-2 text-[10px] font-bold leading-tight ${
                      active ? "text-[var(--color-ink)]" : "text-[var(--color-muted)]"
                    }`}
                  >
                    {step.shortLabel}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
        <div className="mt-6 hidden gap-3 md:grid md:grid-cols-5">
          {customerOrderTimeline.map((step, index) => {
            const active = index <= reachedIndex;
            return (
              <div
                key={step.status}
                className={`rounded-[1.4rem] border p-4 ${
                  active
                    ? "border-[var(--color-primary)] bg-[var(--color-soft)]"
                    : "border-[var(--color-line)]"
                }`}
              >
                <div
                  className={`h-3 w-3 rounded-full ${
                    active ? "bg-[var(--color-primary)]" : "bg-[var(--color-line)]"
                  }`}
                />
                <p className="mt-3 text-sm font-bold text-[var(--color-ink)]">
                  {step.label}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-[2rem] border border-[var(--color-line)] bg-white p-6">
          <h2 className="font-display text-2xl font-bold text-[var(--color-ink)]">
            Itens
          </h2>
          <div className="mt-6 space-y-4">
            {order.items.map((item) => {
              const total =
                item.lineTotalInCents || item.unitPriceInCents * item.quantity;

              return (
                <div
                  key={item.id}
                  className="grid gap-4 rounded-[1.5rem] bg-[var(--color-soft)] p-4 sm:grid-cols-[86px_1fr_auto] sm:items-center"
                >
                  <OrderItemThumbnail
                    image={item.image}
                    productName={item.productName}
                    className="h-20 w-20 justify-self-start rounded-[1.2rem]"
                  />
                  <div>
                    <p className="font-bold text-[var(--color-ink)]">
                      {item.productName}
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">
                      Quantidade: {item.quantity}
                    </p>
                  </div>
                  <p className="font-black text-[var(--color-ink)]">
                    {formatCurrency(total / 100)}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-6 space-y-3 border-t border-[var(--color-line)] pt-6 text-sm">
            <div className="flex justify-between text-[var(--color-muted)]">
              <span>Produtos</span>
              <span>{formatCurrency(order.subtotalInCents / 100)}</span>
            </div>
            {order.fulfillmentType !== "PICKUP" ? (
              <div className="flex justify-between text-[var(--color-muted)]">
                <span>Frete</span>
                <span>{formatCurrency(order.shippingInCents / 100)}</span>
              </div>
            ) : null}
            <div className="flex justify-between text-[var(--color-muted)]">
              <span>Descontos</span>
              <span>- {formatCurrency(order.discountInCents / 100)}</span>
            </div>
            <div className="flex justify-between text-lg font-black text-[var(--color-ink)]">
              <span>Total</span>
              <span>{formatCurrency(order.totalInCents / 100)}</span>
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-[2rem] border border-[var(--color-line)] bg-white p-6">
            <h2 className="font-display text-xl font-bold text-[var(--color-ink)]">
              {order.fulfillmentType === "PICKUP" ? "Retirada na loja" : "Entrega"}
            </h2>
            {order.fulfillmentType === "PICKUP" ? (
              <div className="mt-4 text-sm leading-6 text-[var(--color-muted)]">
                <p>{pickupHelpText()}</p>
                {order.pickupCode &&
                ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"].includes(order.status) ? (
                  <div className="mt-5 rounded-[1.4rem] border-2 border-emerald-200 bg-emerald-50 p-4 text-[var(--color-ink)]">
                    <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">
                      Codigo de retirada
                    </p>
                    <p className="mt-2 font-mono text-2xl font-black tracking-[0.18em] text-emerald-950">
                      {order.pickupCode}
                    </p>
                  </div>
                ) : (
                  <p className="mt-4 text-sm">
                    Assim que o pagamento for confirmado, o codigo de retirada aparecera aqui e sera
                    enviado para seu e-mail.
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className="mt-4 text-sm leading-6 text-[var(--color-muted)]">
                  <p>
                    {address.street}, {address.number}
                  </p>
                  {address.complement ? <p>{address.complement}</p> : null}
                  <p>{address.neighborhood}</p>
                  <p>
                    {address.city} - {address.state}
                  </p>
                  <p>CEP {address.cep}</p>
                </div>
                {order.shippingCode || order.trackingUrl ? (
                  <div className="mt-5 rounded-[1.4rem] bg-[var(--color-soft)] p-4 text-sm">
                    {order.shippingCarrier ? <p>Transportadora: {order.shippingCarrier}</p> : null}
                    {order.shippingCode ? <p>Codigo: {order.shippingCode}</p> : null}
                    {order.trackingUrl ? (
                      <a
                        href={order.trackingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex rounded-full bg-[var(--color-primary)] px-4 py-2 text-xs font-bold text-white"
                      >
                        Rastrear entrega
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </>
            )}
          </section>

          <section className="rounded-[2rem] border border-[var(--color-line)] bg-white p-6">
            <h2 className="font-display text-xl font-bold text-[var(--color-ink)]">
              Documentos e suporte
            </h2>
            <div className="mt-5 grid gap-3">
              {order.invoiceUrl ? (
                <a
                  href={order.invoiceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex justify-center rounded-full border border-[var(--color-line)] px-5 py-3 text-sm font-bold text-[var(--color-ink)]"
                >
                  Reimprimir nota fiscal
                </a>
              ) : (
                <span className="inline-flex justify-center rounded-full border border-[var(--color-line)] px-5 py-3 text-sm font-bold text-[var(--color-muted)]">
                  Nota fiscal em processamento
                </span>
              )}
              <a
                href={`${whatsappLink}%20Pedido:%20${order.id}`}
                className="inline-flex justify-center rounded-full bg-[var(--color-primary)] px-5 py-3 text-sm font-bold text-white"
              >
                Solicitar suporte ou devolucao
              </a>
            </div>
          </section>
        </aside>
      </div>

      <Link
        href="/conta/pedidos"
        className="inline-flex w-fit rounded-full border border-[var(--color-line)] px-6 py-3 text-sm font-bold text-[var(--color-ink)]"
      >
        Voltar para pedidos
      </Link>
    </div>
  );
}
