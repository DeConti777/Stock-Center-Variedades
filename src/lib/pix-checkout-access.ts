import { randomBytes } from "crypto";
import type { PrismaClient } from "@prisma/client";
import { releaseInventoryReservation } from "@/lib/pix-inventory";

export function generatePixAccessToken(): string {
  return randomBytes(32).toString("hex");
}

export function buildPixCheckoutUrl(orderId: string, token: string): string {
  const params = new URLSearchParams({ order: orderId, t: token });
  return `/checkout/pix?${params.toString()}`;
}

type PixOrderAccess = {
  id: string;
  status: string;
  paymentMethodChoice: string;
  pixAccessToken: string | null;
  inventoryReserveExpiresAt: Date | null;
  inventoryReserved: boolean;
};

export function isPixAccessAuthorized(
  order: PixOrderAccess,
  token: string | null | undefined,
): boolean {
  if (!token || !order.pixAccessToken) return false;
  return order.pixAccessToken === token;
}

export function isPixPaymentWindowExpired(
  order: Pick<PixOrderAccess, "inventoryReserveExpiresAt">,
  now = new Date(),
): boolean {
  if (!order.inventoryReserveExpiresAt) return false;
  return order.inventoryReserveExpiresAt.getTime() <= now.getTime();
}

export async function expirePixOrderIfDue(
  prisma: PrismaClient,
  order: PixOrderAccess,
  now = new Date(),
): Promise<"expired" | "not_due" | "already_final"> {
  if (order.status !== "PENDING_PAYMENT") {
    return "already_final";
  }

  if (
    order.paymentMethodChoice !== "PIX" ||
    !isPixPaymentWindowExpired(order, now)
  ) {
    return "not_due";
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

  return "expired";
}
