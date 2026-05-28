import type { PrismaClient } from "@prisma/client";
import { getStripe } from "@/lib/stripe";
import {
  fulfillPaidCheckoutSession,
  fulfillPaidPaymentIntent,
} from "@/lib/stripe-checkout-fulfillment";

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

/** Confirma pagamento Pix ao retornar da pagina propria ou sucesso por order_id. */
export async function syncPaidOrderFromOrderId(prisma: DbClient, orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, stripePaymentIntentId: true },
  });

  if (!order) {
    return null;
  }

  if (["PAID", "PROCESSING", "SHIPPED", "DELIVERED"].includes(order.status)) {
    return prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
  }

  if (!order.stripePaymentIntentId) {
    return prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
  }

  const stripe = getStripe();
  const paymentIntent = await stripe.paymentIntents.retrieve(
    order.stripePaymentIntentId,
  );

  if (paymentIntent.status !== "succeeded") {
    return prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
  }

  const paymentIntentWithMeta = {
    ...paymentIntent,
    metadata: {
      ...paymentIntent.metadata,
      orderId: paymentIntent.metadata?.orderId ?? order.id,
      reconcileSource: "checkout_success",
    },
  };

  await fulfillPaidPaymentIntent(prisma, paymentIntentWithMeta);

  return prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
}
