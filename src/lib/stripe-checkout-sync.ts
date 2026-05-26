import type { PrismaClient } from "@prisma/client";
import { getStripe } from "@/lib/stripe";
import { fulfillPaidCheckoutSession } from "@/lib/stripe-checkout-fulfillment";

type DbClient = PrismaClient;

/**
 * Confirma pagamento quando o cliente volta do Checkout Stripe.
 * Cobre dev sem `stripe listen` e atrasos do webhook.
 */
export async function syncPaidOrderFromCheckoutSessionId(
  prisma: DbClient,
  stripeCheckoutSessionId: string,
) {
  const order = await prisma.order.findFirst({
    where: { stripeCheckoutSessionId },
    select: { id: true, status: true },
  });

  if (!order) {
    return null;
  }

  if (["PAID", "PROCESSING", "SHIPPED", "DELIVERED"].includes(order.status)) {
    return prisma.order.findFirst({
      where: { stripeCheckoutSessionId },
      include: { items: true },
    });
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(stripeCheckoutSessionId, {
    expand: ["payment_intent"],
  });

  if (session.payment_status !== "paid") {
    return prisma.order.findFirst({
      where: { stripeCheckoutSessionId },
      include: { items: true },
    });
  }

  const sessionWithMeta = {
    ...session,
    metadata: {
      ...session.metadata,
      orderId: session.metadata?.orderId ?? order.id,
      reconcileSource: "checkout_success",
    },
  };

  await fulfillPaidCheckoutSession(prisma, sessionWithMeta);

  return prisma.order.findFirst({
    where: { stripeCheckoutSessionId },
    include: { items: true },
  });
}
