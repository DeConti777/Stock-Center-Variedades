import Link from "next/link";
import { auth } from "@/auth";
import { PageEventTracker } from "@/components/analytics/page-event-tracker";
import { getPrismaOrNull } from "@/lib/prisma";
import { PostCheckoutRegisterCta } from "@/components/checkout/post-checkout-register-cta";
import { PageHighlight } from "@/components/ui/page-highlight";

type CanceledPageProps = {
  searchParams: Promise<{ order_id?: string }>;
};

export default async function CheckoutCanceledPage({
  searchParams,
}: CanceledPageProps) {
  const session = await auth();
  const { order_id } = await searchParams;
  const prisma = getPrismaOrNull();
  const canceledOrder =
    prisma && order_id
      ? await prisma.order.findUnique({
          where: { id: order_id },
          select: { customerEmail: true },
        })
      : null;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-12 sm:px-6">
      <PageEventTracker
        eventName="checkout_result"
        payload={{ status: "canceled", reason: "payment_not_completed" }}
      />
      <PageHighlight
        eyebrow="Checkout cancelado"
        title="Seu carrinho continua salvo para voce tentar de novo."
        description="Revise os itens, ajuste a forma de pagamento e finalize quando quiser."
      />
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/checkout"
          className="inline-flex items-center justify-center rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-bold text-white"
        >
          Voltar ao checkout
        </Link>
        <Link
          href="/carrinho"
          className="inline-flex items-center justify-center rounded-full border border-[var(--color-line)] px-6 py-3 text-sm font-bold text-[var(--color-ink)]"
        >
          Revisar carrinho
        </Link>
        <PostCheckoutRegisterCta
          isAuthenticated={Boolean(session?.user?.id)}
          nextPath="/checkout"
          email={canceledOrder?.customerEmail}
          label="Criar conta para salvar pedidos"
          variant="primary"
        />
      </div>
    </div>
  );
}
