import { randomBytes } from "crypto";
import Stripe from "stripe";
import type { PrismaClient } from "@prisma/client";
import { getStripe } from "@/lib/stripe";
import { orderToEmailOrder, sendOrderEmail } from "@/lib/email";
import { syncMelhorEnvioForPaidOrder } from "@/lib/melhor-envio-shipment";

type DbClient = PrismaClient;

const INVENTORY_RACE_PREFIX = "OUT_OF_STOCK_RACE:";

class InventoryRaceError extends Error {
  constructor(
    productName: string,
    productId: string,
    requestedQty: number,
    availableStock: number | null = null,
  ) {
    super(
      `${INVENTORY_RACE_PREFIX}${JSON.stringify({
        productName,
        productId,
        requestedQty,
        availableStock,
      })}`,
    );
    this.name = "InventoryRaceError";
  }
}

function parseInventoryRaceError(error: unknown) {
  if (!(error instanceof Error)) return null;
  if (!error.message.startsWith(INVENTORY_RACE_PREFIX)) return null;
  const encoded = error.message.slice(INVENTORY_RACE_PREFIX.length);
  try {
    const parsed = JSON.parse(encoded) as {
      productName?: string;
      productId?: string;
      requestedQty?: number;
      availableStock?: number | null;
    };
    return {
      productName: parsed.productName ?? "Produto desconhecido",
      productId: parsed.productId ?? "unknown",
      requestedQty:
        typeof parsed.requestedQty === "number" ? parsed.requestedQty : 0,
      availableStock:
        typeof parsed.availableStock === "number" ? parsed.availableStock : null,
    };
  } catch {
    return {
      productName: "Produto desconhecido",
      productId: "unknown",
      requestedQty: 0,
      availableStock: null,
    };
  }
}

function getPaymentIntentId(checkoutSession: Stripe.Checkout.Session) {
  return typeof checkoutSession.payment_intent === "string"
    ? checkoutSession.payment_intent
    : checkoutSession.payment_intent &&
        typeof checkoutSession.payment_intent === "object"
      ? checkoutSession.payment_intent.id
      : null;
}

async function refundInventoryRacePayment(
  prisma: DbClient,
  checkoutSession: Stripe.Checkout.Session,
  paymentIntentId: string | null,
  race: ReturnType<typeof parseInventoryRaceError>,
) {
  const orderId = checkoutSession.metadata?.orderId;
  if (!orderId || !race) return false;
  if (!paymentIntentId) {
    throw new Error("Pagamento sem payment_intent para estorno automatico.");
  }

  const stripe = getStripe();
  const refund = await stripe.refunds.create({
    payment_intent: paymentIntentId,
    reason: "requested_by_customer",
    metadata: {
      orderId,
      checkoutSessionId: checkoutSession.id,
      cause: "OUT_OF_STOCK_RACE",
      productId: race.productId,
      productName: race.productName,
      requestedQty: String(race.requestedQty),
      availableStock: String(race.availableStock ?? ""),
    },
  });

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "CANCELED",
      canceledAt: new Date(),
      stripePaymentIntentId: paymentIntentId,
      checkoutEvents: {
        create: {
          type: "INVENTORY_RACE_REFUND_SUCCEEDED",
          message:
            "Pagamento estornado automaticamente por indisponibilidade de estoque.",
          metadata: JSON.stringify({
            reason: "OUT_OF_STOCK_RACE",
            stripeCheckoutSessionId: checkoutSession.id,
            stripePaymentIntentId: paymentIntentId,
            stripeRefundId: refund.id,
            race,
          }),
        },
      },
      paymentAttempts: {
        updateMany: {
          where: {
            stripeCheckoutSessionId: checkoutSession.id,
          },
          data: {
            status: "REFUNDED",
            stripePaymentIntentId: paymentIntentId,
            errorMessage:
              "Pagamento estornado automaticamente por corrida de estoque.",
          },
        },
      },
    },
  });

  return true;
}

const PICKUP_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generatePickupCandidate(): string {
  const bytes = randomBytes(8);
  let candidate = "";
  for (let i = 0; i < 8; i++) {
    candidate += PICKUP_CODE_ALPHABET[bytes[i]! % PICKUP_CODE_ALPHABET.length];
  }
  return candidate;
}

/** Marca pedido como PAID e baixa estoque — mesma logica do webhook Stripe. */
export async function fulfillPaidCheckoutSession(
  prisma: DbClient,
  checkoutSession: Stripe.Checkout.Session,
) {
  const orderId = checkoutSession.metadata?.orderId;

  if (!orderId) {
    return;
  }

  const paymentIntentId = getPaymentIntentId(checkoutSession);

  try {
    const paidOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order) {
        return null;
      }

      if (["PAID", "PROCESSING", "SHIPPED", "DELIVERED"].includes(order.status)) {
        return null;
      }

      if (!order.inventoryReserved) {
        for (const item of order.items) {
          const stockUpdate = await tx.product.updateMany({
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

          if (stockUpdate.count !== 1) {
            const productSnapshot = await tx.product.findUnique({
              where: { id: item.productId },
              select: { stock: true },
            });
            throw new InventoryRaceError(
              item.productName,
              item.productId,
              item.quantity,
              productSnapshot?.stock ?? null,
            );
          }
        }
      }

      if (order.couponId) {
        const coupon = await tx.coupon.findUnique({
          where: { id: order.couponId },
        });

        if (coupon?.maxUses != null && coupon.usedCount >= coupon.maxUses) {
          throw new Error("Cupom esgotado no momento da confirmacao.");
        }

        await tx.coupon.update({
          where: { id: order.couponId },
          data: {
            usedCount: {
              increment: 1,
            },
          },
        });

        await tx.couponRedemption.upsert({
          where: {
            couponId_orderId: {
              couponId: order.couponId,
              orderId: order.id,
            },
          },
          create: {
            couponId: order.couponId,
            orderId: order.id,
            userId: order.userId,
          },
          update: {},
        });
      }

      await tx.cart.updateMany({
        where: { userId: order.userId },
        data: {
          lastRecoveredAt: new Date(),
        },
      });

      await tx.cartItem.deleteMany({
        where: {
          cart: {
            userId: order.userId,
          },
        },
      });

      await tx.paymentAttempt.updateMany({
        where: {
          orderId: order.id,
          stripeCheckoutSessionId: checkoutSession.id,
        },
        data: {
          stripePaymentIntentId: paymentIntentId,
          status: "PAID",
        },
      });

      await tx.checkoutEvent.create({
        data: {
          orderId: order.id,
          userId: order.userId,
          type: "PAYMENT_CONFIRMED",
          message: order.inventoryReserved
            ? "Stripe confirmou pagamento e converteu reserva em baixa definitiva."
            : "Stripe confirmou pagamento e estoque foi decrementado.",
          metadata: JSON.stringify({
            stripeCheckoutSessionId: checkoutSession.id,
            stripePaymentIntentId: paymentIntentId,
            inventoryReserved: order.inventoryReserved,
            source: checkoutSession.metadata?.reconcileSource ?? "webhook",
          }),
        },
      });

      let newPickupCode: string | undefined;
      if (order.fulfillmentType === "PICKUP" && !order.pickupCode) {
        for (let attempt = 0; attempt < 12; attempt++) {
          const candidate = generatePickupCandidate();
          const clash = await tx.order.findFirst({
            where: { pickupCode: candidate },
            select: { id: true },
          });
          if (!clash) {
            newPickupCode = candidate;
            break;
          }
        }
        if (!newPickupCode) {
          throw new Error("Nao foi possivel gerar codigo unico de retirada.");
        }
      }

      return tx.order.update({
        where: { id: order.id },
        data: {
          status: "PAID",
          paidAt: new Date(),
          stripePaymentIntentId: paymentIntentId,
          inventoryReserved: false,
          inventoryReservedAt: null,
          inventoryReserveExpiresAt: null,
          ...(newPickupCode ? { pickupCode: newPickupCode } : {}),
        },
        include: { items: true },
      });
    });

    if (paidOrder) {
      await sendOrderEmail("PAYMENT_CONFIRMED", orderToEmailOrder(paidOrder));
      const meResult = await syncMelhorEnvioForPaidOrder(prisma, paidOrder);
      if (!meResult.ok && !meResult.skipped) {
        await prisma.checkoutEvent
          .create({
            data: {
              orderId: paidOrder.id,
              userId: paidOrder.userId,
              type: "MELHOR_ENVIO_SYNC_FAILED",
              message: meResult.error,
              metadata: JSON.stringify({ source: "payment_webhook" }),
            },
          })
          .catch(() => null);
      }
    }

    return paidOrder;
  } catch (error) {
    const race = parseInventoryRaceError(error);
    const isInventoryRace = Boolean(race);
    const message = isInventoryRace
      ? "Pagamento confirmado, mas estoque indisponivel por concorrencia."
      : error instanceof Error
        ? error.message
        : "Falha ao confirmar estoque no webhook.";

    if (isInventoryRace) {
      try {
        const refunded = await refundInventoryRacePayment(
          prisma,
          checkoutSession,
          paymentIntentId,
          race,
        );
        if (refunded) {
          return null;
        }
      } catch (refundError) {
        const refundMessage =
          refundError instanceof Error
            ? refundError.message
            : "Falha ao estornar pagamento apos corrida de estoque.";
        await prisma.order
          .update({
            where: { id: orderId },
            data: {
              status: "REQUIRES_REVIEW",
              stripePaymentIntentId: paymentIntentId,
              checkoutEvents: {
                create: {
                  type: "INVENTORY_RACE_REFUND_FAILED",
                  message: `${message} Estorno automatico falhou.`,
                  metadata: JSON.stringify({
                    reason: "OUT_OF_STOCK_RACE",
                    stripeCheckoutSessionId: checkoutSession.id,
                    stripePaymentIntentId: paymentIntentId,
                    race,
                    refundError: refundMessage,
                  }),
                },
              },
              paymentAttempts: {
                updateMany: {
                  where: {
                    stripeCheckoutSessionId: checkoutSession.id,
                  },
                  data: {
                    status: "REQUIRES_REVIEW",
                    stripePaymentIntentId: paymentIntentId,
                    errorMessage: refundMessage,
                  },
                },
              },
            },
          })
          .catch(() => null);
        return null;
      }
    }

    await prisma.order
      .update({
        where: { id: orderId },
        data: {
          status: "REQUIRES_REVIEW",
          stripePaymentIntentId: paymentIntentId,
          checkoutEvents: {
            create: {
              type: isInventoryRace
                ? "INVENTORY_RACE_DETECTED"
                : "PAYMENT_REQUIRES_REVIEW",
              message,
              metadata: JSON.stringify({
                stripeCheckoutSessionId: checkoutSession.id,
                stripePaymentIntentId: paymentIntentId,
                reason: isInventoryRace ? "OUT_OF_STOCK_RACE" : "UNKNOWN",
                race,
              }),
            },
          },
          paymentAttempts: {
            updateMany: {
              where: {
                stripeCheckoutSessionId: checkoutSession.id,
              },
              data: {
                status: "REQUIRES_REVIEW",
                stripePaymentIntentId: paymentIntentId,
                errorMessage: message,
              },
            },
          },
        },
      })
      .catch(() => null);

    return null;
  }
}
