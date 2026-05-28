import { NextResponse } from "next/server";
import { formatCurrency } from "@/lib/catalog";
import { getPrismaOrNull } from "@/lib/prisma";
import {
  expirePixOrderIfDue,
  isPixAccessAuthorized,
  isPixPaymentWindowExpired,
} from "@/lib/pix-checkout-access";
import {
  isMercadoPagoPixApproved,
  isMercadoPagoPixTerminalFailure,
  retrieveMercadoPagoPixPayload,
} from "@/lib/mercado-pago-pix-payment";
import { getMercadoPagoPayment } from "@/lib/mercado-pago";
import { fulfillPaidOrder } from "@/lib/stripe-checkout-fulfillment";

export async function GET(request: Request) {
  const prisma = getPrismaOrNull();
  if (!prisma) {
    return NextResponse.json(
      { error: "Banco de dados nao configurado." },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("order")?.trim();
  const token = searchParams.get("t")?.trim();

  if (!orderId || !token) {
    return NextResponse.json(
      { error: "Pedido ou token invalido." },
      { status: 400 },
    );
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      paymentMethodChoice: true,
      pixAccessToken: true,
      totalInCents: true,
      inventoryReserveExpiresAt: true,
      inventoryReserved: true,
      mercadoPagoPaymentId: true,
      customerName: true,
    },
  });

  if (!order || order.paymentMethodChoice !== "PIX") {
    return NextResponse.json({ error: "Pedido nao encontrado." }, { status: 404 });
  }

  if (!isPixAccessAuthorized(order, token)) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  if (["PAID", "PROCESSING", "SHIPPED", "DELIVERED"].includes(order.status)) {
    return NextResponse.json({
      status: order.status,
      orderId: order.id,
      paid: true,
    });
  }

  if (["EXPIRED", "FAILED", "CANCELED"].includes(order.status)) {
    return NextResponse.json(
      { error: "Pagamento expirado ou cancelado.", status: order.status },
      { status: 410 },
    );
  }

  const expiration = await expirePixOrderIfDue(prisma, order);
  if (expiration === "expired") {
    return NextResponse.json(
      { error: "O prazo de 10 minutos para pagamento expirou.", status: "EXPIRED" },
      { status: 410 },
    );
  }

  if (isPixPaymentWindowExpired(order)) {
    return NextResponse.json(
      { error: "O prazo de 10 minutos para pagamento expirou.", status: "EXPIRED" },
      { status: 410 },
    );
  }

  if (!order.mercadoPagoPaymentId) {
    return NextResponse.json(
      { error: "Pagamento Pix nao iniciado para este pedido." },
      { status: 409 },
    );
  }

  const mpPayment = await getMercadoPagoPayment(order.mercadoPagoPaymentId);

  if (isMercadoPagoPixApproved(mpPayment.status)) {
    await fulfillPaidOrder(prisma, {
      orderId: order.id,
      paymentIntentId: null,
      checkoutSessionId: null,
      mercadoPagoPaymentId: order.mercadoPagoPaymentId,
      source: "mercadopago_poll",
    });
    return NextResponse.json({
      status: "PAID",
      orderId: order.id,
      paid: true,
    });
  }

  if (isMercadoPagoPixTerminalFailure(mpPayment.status)) {
    await expirePixOrderIfDue(prisma, order);
    return NextResponse.json(
      { error: "Pagamento Pix cancelado ou expirado.", status: "EXPIRED" },
      { status: 410 },
    );
  }

  const pixPayload = await retrieveMercadoPagoPixPayload(
    order.mercadoPagoPaymentId,
    order.inventoryReserveExpiresAt,
  );

  if (!pixPayload) {
    return NextResponse.json(
      { error: "QR Code Pix indisponivel. Tente novamente em instantes." },
      { status: 503 },
    );
  }

  return NextResponse.json({
    status: order.status,
    orderId: order.id,
    paid: false,
    totalFormatted: formatCurrency(order.totalInCents / 100),
    totalInCents: order.totalInCents,
    customerName: order.customerName,
    expiresAt:
      order.inventoryReserveExpiresAt?.toISOString() ?? pixPayload.expiresAt,
    qrImageUrl: pixPayload.qrImageUrl,
    copyPasteCode: pixPayload.copyPasteCode,
  });
}
