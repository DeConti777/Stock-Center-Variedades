import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import Stripe from "stripe";
import type { PrismaClient } from "@prisma/client";
import { getPrismaOrNull } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { orderToEmailOrder, sendOrderEmail } from "@/lib/email";
import { releaseInventoryReservation } from "@/lib/pix-inventory";
import { fulfillPaidCheckoutSession } from "@/lib/stripe-checkout-fulfillment";

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
  checkoutSession?: Stripe.Checkout.Session,
) {
  try {
    await prisma.stripeWebhookEvent.create({
      data: {
        eventId: event.id,
        type: event.type,
        stripeObjectId:
          checkoutSession?.id ??
          ("id" in event.data.object ? (event.data.object as { id: string }).id : null) ??
          null,
        orderId: checkoutSession?.metadata?.orderId,
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

  let checkoutSessionFromEvent: Stripe.Checkout.Session | undefined;

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const checkoutSession = event.data.object as Stripe.Checkout.Session;
    checkoutSessionFromEvent = checkoutSession;
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
      await registerProcessedStripeEvent(prisma, event, checkoutSession);
      return NextResponse.json({ received: true });
    }

    await fulfillPaidCheckoutSession(prisma, checkoutSession);
  }

  if (event.type === "checkout.session.async_payment_failed") {
    const checkoutSession = event.data.object as Stripe.Checkout.Session;
    checkoutSessionFromEvent = checkoutSession;
    await markCheckoutSessionFailed(prisma, checkoutSession);
  }

  await registerProcessedStripeEvent(prisma, event, checkoutSessionFromEvent);

  return NextResponse.json({ received: true });
}
