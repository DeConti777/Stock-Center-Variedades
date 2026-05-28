import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import Stripe from "stripe";
import type { PrismaClient } from "@prisma/client";
import { getPrismaOrNull } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { orderToEmailOrder, sendOrderEmail } from "@/lib/email";
import { releaseInventoryReservation } from "@/lib/pix-inventory";
import {
  fulfillPaidCheckoutSession,
  fulfillPaidPaymentIntent,
} from "@/lib/stripe-checkout-fulfillment";
import { markPixPaymentIntentFailed } from "@/lib/stripe-payment-failed";

type DbClient = PrismaClient;

async function markCheckoutSessionFailed(
  prisma: DbClient,
  checkoutSession: Stripe.Checkout.Session,
) {
  const orderId = checkoutSession.metadata?.orderId;

  if (!orderId) {
    return;
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order || ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"].includes(order.status)) {
    return;
  }

  const nextStatus = checkoutSession.status === "expired" ? "EXPIRED" : "FAILED";
  const eventType =
    nextStatus === "EXPIRED" ? "PAYMENT_EXPIRED" : "PAYMENT_FAILED";
  const eventMessage =
    nextStatus === "EXPIRED"
      ? "Stripe informou expiracao do Pix."
      : "Stripe informou falha no pagamento assincrono.";

  let updatedOrder = null;

  if (order.inventoryReserved) {
    updatedOrder = await releaseInventoryReservation(prisma, {
      orderId,
      reason: nextStatus === "EXPIRED" ? "PAYMENT_EXPIRED" : "PAYMENT_FAILED",
      nextStatus,
      stripeCheckoutSessionId: checkoutSession.id,
    });
  } else if (!["FAILED", "EXPIRED", "CANCELED"].includes(order.status)) {
    updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: nextStatus,
        paymentRetryCount: {
          increment: 1,
        },
        paymentAttempts: {
          updateMany: {
            where: {
              stripeCheckoutSessionId: checkoutSession.id,
            },
            data: {
              status: nextStatus,
            },
          },
        },
        checkoutEvents: {
          create: {
            type: eventType,
            message: eventMessage,
            metadata: JSON.stringify({
              stripeCheckoutSessionId: checkoutSession.id,
            }),
          },
        },
      },
      include: { items: true },
    });
  }

  if (updatedOrder?.status === "FAILED" || updatedOrder?.status === "EXPIRED") {
    await sendOrderEmail("PAYMENT_FAILED", orderToEmailOrder(updatedOrder));
  }
}

async function wasStripeEventAlreadyProcessed(prisma: DbClient, eventId: string) {
  const event = await prisma.stripeWebhookEvent.findUnique({
    where: { eventId },
    select: { id: true },
  });

  return Boolean(event);
}

async function registerProcessedStripeEvent(
  prisma: DbClient,
  event: Stripe.Event,
  context?: { stripeObjectId?: string | null; orderId?: string | null },
) {
  try {
    await prisma.stripeWebhookEvent.create({
      data: {
        eventId: event.id,
        type: event.type,
        stripeObjectId:
          context?.stripeObjectId ??
          ("id" in event.data.object
            ? (event.data.object as { id: string }).id
            : null) ??
          null,
        orderId: context?.orderId ?? null,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return;
    }
    throw error;
  }
}

export async function POST(request: Request) {
  const prisma = getPrismaOrNull();

  if (!prisma || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook indisponivel." }, { status: 503 });
  }

  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Assinatura ausente." }, { status: 400 });
  }

  const payload = await request.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return NextResponse.json({ error: "Assinatura invalida." }, { status: 400 });
  }

  if (await wasStripeEventAlreadyProcessed(prisma, event.id)) {
    return NextResponse.json({ received: true });
  }

  let eventContext: { stripeObjectId?: string | null; orderId?: string | null } =
    {};

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const checkoutSession = event.data.object as Stripe.Checkout.Session;
    eventContext = {
      stripeObjectId: checkoutSession.id,
      orderId: checkoutSession.metadata?.orderId,
    };
    if (
      event.type === "checkout.session.completed" &&
      checkoutSession.payment_status !== "paid"
    ) {
      await prisma.checkoutEvent
        .create({
          data: {
            orderId: checkoutSession.metadata?.orderId,
            userId: checkoutSession.metadata?.userId,
            type: "PAYMENT_AWAITING_ASYNC_CONFIRMATION",
            message:
              "Checkout concluido, aguardando confirmacao assincrona da Stripe.",
            metadata: JSON.stringify({
              stripeCheckoutSessionId: checkoutSession.id,
              paymentStatus: checkoutSession.payment_status,
            }),
          },
        })
        .catch(() => null);
      await registerProcessedStripeEvent(prisma, event, eventContext);
      return NextResponse.json({ received: true });
    }

    await fulfillPaidCheckoutSession(prisma, checkoutSession);
  }

  if (event.type === "checkout.session.async_payment_failed") {
    const checkoutSession = event.data.object as Stripe.Checkout.Session;
    eventContext = {
      stripeObjectId: checkoutSession.id,
      orderId: checkoutSession.metadata?.orderId,
    };
    await markCheckoutSessionFailed(prisma, checkoutSession);
  }

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    eventContext = {
      stripeObjectId: paymentIntent.id,
      orderId: paymentIntent.metadata?.orderId,
    };
    await fulfillPaidPaymentIntent(prisma, paymentIntent);
  }

  if (event.type === "payment_intent.canceled") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const orderId = paymentIntent.metadata?.orderId;
    eventContext = {
      stripeObjectId: paymentIntent.id,
      orderId,
    };
    if (orderId) {
      await markPixPaymentIntentFailed(prisma, {
        orderId,
        paymentIntentId: paymentIntent.id,
        nextStatus: "EXPIRED",
        eventType: "PAYMENT_EXPIRED",
        eventMessage: "Stripe informou cancelamento do Pix.",
      });
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const orderId = paymentIntent.metadata?.orderId;
    eventContext = {
      stripeObjectId: paymentIntent.id,
      orderId,
    };
    if (orderId) {
      await markPixPaymentIntentFailed(prisma, {
        orderId,
        paymentIntentId: paymentIntent.id,
        nextStatus: "FAILED",
        eventType: "PAYMENT_FAILED",
        eventMessage: "Stripe informou falha no pagamento Pix.",
      });
    }
  }

  await registerProcessedStripeEvent(prisma, event, eventContext);

  return NextResponse.json({ received: true });
}
