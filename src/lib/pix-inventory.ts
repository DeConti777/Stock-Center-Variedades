import type { Prisma, PrismaClient } from "@prisma/client";

export const PIX_RESERVE_TTL_SECONDS = 1_800;

type PrismaTx = Prisma.TransactionClient;

export type ReleaseReason = "PAYMENT_FAILED" | "PAYMENT_EXPIRED" | "CHECKOUT_ERROR";

type ReleaseReservationInput = {
  orderId: string;
  reason: ReleaseReason;
  nextStatus: "FAILED" | "EXPIRED";
  stripeCheckoutSessionId?: string | null;
};

function pixReserveExpirationDate(now = new Date()) {
  return new Date(now.getTime() + PIX_RESERVE_TTL_SECONDS * 1_000);
}

async function reserveInventoryInTx(tx: PrismaTx, orderId: string) {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    throw new Error("Pedido nao encontrado para reservar estoque.");
  }

  if (order.inventoryReserved) {
    return order;
  }

  for (const item of order.items) {
    const updated = await tx.product.updateMany({
      where: {
        id: item.productId,
        stock: {
          gte: item.quantity,
        },
      },
      data: {
        stock: {
          decrement: item.quantity,
        },
      },
    });

    if (updated.count !== 1) {
      throw new Error(
        `Estoque insuficiente para reservar ${item.productName}.`,
      );
    }
  }

  const now = new Date();
  const expiresAt = pixReserveExpirationDate(now);

  return tx.order.update({
    where: { id: order.id },
    data: {
      inventoryReserved: true,
      inventoryReservedAt: now,
      inventoryReserveExpiresAt: expiresAt,
      checkoutEvents: {
        create: {
          userId: order.userId,
          type: "INVENTORY_RESERVED",
          message: "Estoque reservado para pagamento Pix.",
          metadata: JSON.stringify({
            reserveExpiresAt: expiresAt.toISOString(),
          }),
        },
      },
    },
    include: { items: true },
  });
}

async function releaseInventoryInTx(
  tx: PrismaTx,
  orderId: string,
  reason: ReleaseReason,
  nextStatus: "FAILED" | "EXPIRED",
  stripeCheckoutSessionId?: string | null,
) {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) return null;

  if (!order.inventoryReserved) {
    return order;
  }

  for (const item of order.items) {
    await tx.product.update({
      where: { id: item.productId },
      data: {
        stock: {
          increment: item.quantity,
        },
      },
    });
  }

  await tx.paymentAttempt.updateMany({
    where: {
      orderId: order.id,
      ...(stripeCheckoutSessionId
        ? { stripeCheckoutSessionId }
        : {}),
    },
    data: {
      status: nextStatus,
    },
  });

  return tx.order.update({
    where: { id: order.id },
    data: {
      status: nextStatus,
      paymentRetryCount: {
        increment: 1,
      },
      inventoryReserved: false,
      inventoryReservedAt: null,
      inventoryReserveExpiresAt: null,
      checkoutEvents: {
        create: {
          userId: order.userId,
          type: "INVENTORY_RELEASED",
          message: "Reserva de estoque liberada.",
          metadata: JSON.stringify({
            reason,
            stripeCheckoutSessionId: stripeCheckoutSessionId ?? null,
          }),
        },
      },
    },
    include: { items: true },
  });
}

export async function reserveInventoryForPixOrder(
  prisma: PrismaClient,
  orderId: string,
) {
  return prisma.$transaction((tx) => reserveInventoryInTx(tx, orderId));
}

export async function releaseInventoryReservation(
  prisma: PrismaClient,
  input: ReleaseReservationInput,
) {
  return prisma.$transaction((tx) =>
    releaseInventoryInTx(
      tx,
      input.orderId,
      input.reason,
      input.nextStatus,
      input.stripeCheckoutSessionId,
    ),
  );
}

export async function expireReservedPixOrders(
  prisma: PrismaClient,
  now = new Date(),
) {
  const expired = await prisma.order.findMany({
    where: {
      paymentMethodChoice: "PIX",
      status: "PENDING_PAYMENT",
      inventoryReserved: true,
      inventoryReserveExpiresAt: {
        lte: now,
      },
    },
    select: {
      id: true,
    },
  });

  let releasedCount = 0;
  for (const order of expired) {
    const released = await releaseInventoryReservation(prisma, {
      orderId: order.id,
      reason: "PAYMENT_EXPIRED",
      nextStatus: "EXPIRED",
    });
    if (released?.status === "EXPIRED") {
      releasedCount += 1;
    }
  }

  return {
    matched: expired.length,
    released: releasedCount,
  };
}
