import { NextResponse } from "next/server";
import type { PrismaClient } from "@prisma/client";
import { getPrismaOrNull } from "@/lib/prisma";
import { getMercadoPagoPayment } from "@/lib/mercado-pago";
import { isMercadoPagoPaymentApproved } from "@/lib/mercado-pago";
import { isMercadoPagoPixTerminalFailure } from "@/lib/mercado-pago-pix-payment";
import { fulfillPaidOrder } from "@/lib/stripe-checkout-fulfillment";
import { releaseInventoryReservation } from "@/lib/pix-inventory";

function paymentIdFromQuery(request: Request): string | null {
  const url = new URL(request.url);
  const topic = url.searchParams.get("topic") || url.searchParams.get("type");
  const id = url.searchParams.get("id") || url.searchParams.get("data.id");
  if (!id) return null;
  if (topic && topic !== "payment") return null;
  return id;
}

async function paymentIdFromPostBody(request: Request): Promise<string | null> {
  const fromQuery = paymentIdFromQuery(request);
  if (fromQuery) return fromQuery;

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  try {
    const body = (await request.json()) as {
      type?: string;
      action?: string;
      data?: { id?: string | number };
    };
    if (body.type === "payment" || body.action?.startsWith("payment.")) {
      return body.data?.id != null ? String(body.data.id) : null;
    }
  } catch {
    return null;
  }

  return null;
}

async function handleMercadoPagoPaymentNotification(
  prisma: PrismaClient,
  paymentId: string | null,
) {
  if (!paymentId) {
    return NextResponse.json({ received: true });
  }

  let payment;
  try {
    payment = await getMercadoPagoPayment(paymentId);
  } catch {
    return NextResponse.json({ received: true });
  }

  const orderId = payment.external_reference?.trim();
  if (!orderId) {
    return NextResponse.json({ received: true });
  }

  if (isMercadoPagoPaymentApproved(payment.status)) {
    await fulfillPaidOrder(prisma, {
      orderId,
      paymentIntentId: null,
      checkoutSessionId: null,
      mercadoPagoPaymentId: paymentId,
      source: "mercadopago_webhook",
    });
    return NextResponse.json({ received: true });
  }

  if (isMercadoPagoPixTerminalFailure(payment.status)) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        inventoryReserved: true,
        paymentMethodChoice: true,
      },
    });

    if (order && order.status === "PENDING_PAYMENT") {
      if (order.inventoryReserved) {
        await releaseInventoryReservation(prisma, {
          orderId: order.id,
          reason: "PAYMENT_EXPIRED",
          nextStatus: "EXPIRED",
        });
      } else {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            status:
              order.paymentMethodChoice === "PIX" ? "EXPIRED" : "FAILED",
            ...(order.paymentMethodChoice === "PIX"
              ? {}
              : { paymentRetryCount: { increment: 1 } }),
          },
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}

export async function POST(request: Request) {
  const prisma = getPrismaOrNull();
  if (!prisma) {
    return NextResponse.json({ error: "Webhook indisponivel." }, { status: 503 });
  }

  const paymentId = await paymentIdFromPostBody(request);
  return handleMercadoPagoPaymentNotification(prisma, paymentId);
}

/** IPN legado do Mercado Pago pode usar GET. */
export async function GET(request: Request) {
  const prisma = getPrismaOrNull();
  if (!prisma) {
    return NextResponse.json({ error: "Webhook indisponivel." }, { status: 503 });
  }

  return handleMercadoPagoPaymentNotification(
    prisma,
    paymentIdFromQuery(request),
  );
}
