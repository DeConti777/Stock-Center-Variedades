import { NextResponse } from "next/server";
import { getPrismaOrNull } from "@/lib/prisma";
import { cancelMercadoPagoPayment } from "@/lib/mercado-pago";
import { releaseInventoryReservation } from "@/lib/pix-inventory";
import { isPixAccessAuthorized } from "@/lib/pix-checkout-access";

export async function POST(request: Request) {
  const prisma = getPrismaOrNull();
  if (!prisma) {
    return NextResponse.json(
      { error: "Banco de dados nao configurado." },
      { status: 503 },
    );
  }

  let body: { order?: string; t?: string };
  try {
    body = (await request.json()) as { order?: string; t?: string };
  } catch {
    return NextResponse.json(
      { error: "Formato da requisicao invalido." },
      { status: 400 },
    );
  }

  const orderId = body.order?.trim();
  const token = body.t?.trim();

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
      inventoryReserveExpiresAt: true,
      inventoryReserved: true,
      mercadoPagoPaymentId: true,
    },
  });

  if (!order || order.paymentMethodChoice !== "PIX") {
    return NextResponse.json({ error: "Pedido nao encontrado." }, { status: 404 });
  }

  if (!isPixAccessAuthorized(order, token)) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  if (["PAID", "PROCESSING", "SHIPPED", "DELIVERED"].includes(order.status)) {
    return NextResponse.json({ status: order.status, expired: false });
  }

  if (order.mercadoPagoPaymentId) {
    await cancelMercadoPagoPayment(order.mercadoPagoPaymentId);
  }

  if (order.inventoryReserved) {
    await releaseInventoryReservation(prisma, {
      orderId: order.id,
      reason: "PAYMENT_EXPIRED",
      nextStatus: "EXPIRED",
    });
  } else if (order.status === "PENDING_PAYMENT") {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "EXPIRED" },
    });
  }

  return NextResponse.json({ status: "EXPIRED", expired: true });
}
