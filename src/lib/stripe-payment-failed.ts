import type { PrismaClient } from "@prisma/client";
import { orderToEmailOrder, sendOrderEmail } from "@/lib/email";
import { releaseInventoryReservation } from "@/lib/pix-inventory";

type DbClient = PrismaClient;

export async function markPixPaymentIntentFailed(
  prisma: DbClient,
  input: {
    orderId: string;
    paymentIntentId: string;
    nextStatus: "EXPIRED" | "FAILED";
    eventMessage: string;
    eventType: "PAYMENT_EXPIRED" | "PAYMENT_FAILED";
  },
) {
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: { items: true },
  });

  if (!order || ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"].includes(order.status)) {
    return null;
  }

  let updatedOrder = null;

  if (order.inventoryReserved) {
    updatedOrder = await releaseInventoryReservation(prisma, {
      orderId: input.orderId,
      reason:
        input.nextStatus === "EXPIRED" ? "PAYMENT_EXPIRED" : "PAYMENT_FAILED",
      nextStatus: input.nextStatus,
    });
  } else if (!["FAILED", "EXPIRED", "CANCELED"].includes(order.status)) {
    updatedOrder = await prisma.order.update({
      where: { id: input.orderId },
      data: {
        status: input.nextStatus,
        paymentRetryCount: {
          increment: 1,
        },
        paymentAttempts: {
          updateMany: {
            where: {
              stripePaymentIntentId: input.paymentIntentId,
            },
            data: {
              status: input.nextStatus,
            },
          },
        },
        checkoutEvents: {
          create: {
            type: input.eventType,
            message: input.eventMessage,
            metadata: JSON.stringify({
              stripePaymentIntentId: input.paymentIntentId,
            }),
          },
        },
      },
      include: { items: true },
    });
  }

  if (updatedOrder?.status === "FAILED") {
    await sendOrderEmail("PAYMENT_FAILED", orderToEmailOrder(updatedOrder));
  }

  return updatedOrder;
}
