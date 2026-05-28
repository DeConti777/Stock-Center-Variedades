import type { PrismaClient } from "@prisma/client";
import { fulfillPaidOrder } from "@/lib/stripe-checkout-fulfillment";
import { getMercadoPagoPayment } from "@/lib/mercado-pago";
import { isMercadoPagoPixApproved } from "@/lib/mercado-pago-pix-payment";

type DbClient = PrismaClient;

/** Confirma pagamento Pix do Mercado Pago ao voltar da pagina ou abrir pedido. */
export async function syncPaidOrderFromMercadoPagoPaymentId(
  prisma: DbClient,
  mercadoPagoPaymentId: string,
) {
  const order = await prisma.order.findFirst({
    where: { mercadoPagoPaymentId },
    select: { id: true, status: true },
  });

  if (!order) {
    return null;
  }

  if (["PAID", "PROCESSING", "SHIPPED", "DELIVERED"].includes(order.status)) {
    return prisma.order.findUnique({
      where: { id: order.id },
      include: { items: true },
    });
  }

  const payment = await getMercadoPagoPayment(mercadoPagoPaymentId);

  if (!isMercadoPagoPixApproved(payment.status)) {
    return prisma.order.findUnique({
      where: { id: order.id },
      include: { items: true },
    });
  }

  await fulfillPaidOrder(prisma, {
    orderId: order.id,
    paymentIntentId: null,
    checkoutSessionId: null,
    mercadoPagoPaymentId,
    source: "mercadopago_reconcile",
  });

  return prisma.order.findUnique({
    where: { id: order.id },
    include: { items: true },
  });
}

export async function syncPaidOrderFromOrderIdMercadoPago(
  prisma: DbClient,
  orderId: string,
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, mercadoPagoPaymentId: true },
  });

  if (!order?.mercadoPagoPaymentId) {
    return null;
  }

  return syncPaidOrderFromMercadoPagoPaymentId(
    prisma,
    order.mercadoPagoPaymentId,
  );
}
