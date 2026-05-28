import { randomBytes } from "crypto";
import Stripe from "stripe";
import type { PrismaClient } from "@prisma/client";
import { refundMercadoPagoPayment } from "@/lib/mercado-pago";
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

export function getPaymentIntentIdFromCheckoutSession(
  checkoutSession: Stripe.Checkout.Session,
) {
  return typeof checkoutSession.payment_intent === "string"
    ? checkoutSession.payment_intent
    : checkoutSession.payment_intent &&
        typeof checkoutSession.payment_intent === "object"
      ? checkoutSession.payment_intent.id
      : null;
}

type FulfillPaidOrderInput = {
  orderId: string;
  paymentIntentId: string | null;
  checkoutSessionId?: string | null;
  mercadoPagoPaymentId?: string | null;
  source?: string;
};

async function refundInventoryRacePayment(
  prisma: DbClient,
  input: {
    orderId: string;
    paymentIntentId?: string | null;
    mercadoPagoPaymentId?: string | null;
    checkoutSessionId?: string | null;
    race: NonNullable<ReturnType<typeof parseInventoryRaceError>>;
  },
) {
  let refundProvider: "stripe" | "mercadopago" | null = null;
  let refundExternalId: string | null = null;

  if (input.paymentIntentId) {
    const stripe = getStripe();
    const refund = await stripe.refunds.create({
      payment_intent: input.paymentIntentId,
      reason: "requested_by_customer",
      metadata: {
        orderId: input.orderId,
        checkoutSessionId: input.checkoutSessionId ?? "",
        cause: "OUT_OF_STOCK_RACE",
        productId: input.race.productId,
        productName: input.race.productName,
        requestedQty: String(input.race.requestedQty),
        availableStock: String(input.race.availableStock ?? ""),
      },
    });
    refundProvider = "stripe";
    refundExternalId = refund.id;
  } else if (input.mercadoPagoPaymentId) {
    const refund = await refundMercadoPagoPayment(input.mercadoPagoPaymentId);
    refundProvider = "mercadopago";
    refundExternalId = String(refund.id);
  } else {
    return false;
  }

  await prisma.order.update({
    where: { id: input.orderId },
    data: {
      status: "CANCELED",
      canceledAt: new Date(),
      ...(input.paymentIntentId
        ? { stripePaymentIntentId: input.paymentIntentId }
        : {}),
      ...(input.mercadoPagoPaymentId
        ? { mercadoPagoPaymentId: input.mercadoPagoPaymentId }
        : {}),
      checkoutEvents: {
        create: {
          type: "INVENTORY_RACE_REFUND_SUCCEEDED",
          message:
            "Pagamento estornado automaticamente por indisponibilidade de estoque.",
          metadata: JSON.stringify({
            reason: "OUT_OF_STOCK_RACE",
            refundProvider,
            refundExternalId,
            stripeCheckoutSessionId: input.checkoutSessionId ?? null,
            stripePaymentIntentId: input.paymentIntentId ?? null,
            mercadoPagoPaymentId: input.mercadoPagoPaymentId ?? null,
            race: input.race,
          }),
        },
      },
      paymentAttempts: {
        updateMany: {
          where: input.checkoutSessionId
            ? { stripeCheckoutSessionId: input.checkoutSessionId }
            : input.mercadoPagoPaymentId
              ? { orderId: input.orderId, mercadoPagoPaymentId: input.mercadoPagoPaymentId }
              : input.paymentIntentId
                ? { orderId: input.orderId, stripePaymentIntentId: input.paymentIntentId }
                : { orderId: input.orderId },
          data: {
            status: "REFUNDED",
            ...(input.paymentIntentId
              ? { stripePaymentIntentId: input.paymentIntentId }
              : {}),
            ...(input.mercadoPagoPaymentId
              ? { mercadoPagoPaymentId: input.mercadoPagoPaymentId, provider: "MERCADO_PAGO" }
              : {}),
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

/** Marca pedido como PAID e baixa estoque — nucleo compartilhado Pix e cartao. */
export async function fulfillPaidOrder(
  prisma: DbClient,
  input: FulfillPaidOrderInput,
) {
  const {
    orderId,
    paymentIntentId,
    checkoutSessionId,
    mercadoPagoPaymentId,
    source = "webhook",
  } = input;

  if (!orderId) {
    return null;
  }

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

      const paymentAttemptWhere = checkoutSessionId
        ? { orderId: order.id, stripeCheckoutSessionId: checkoutSessionId }
        : paymentIntentId
          ? { orderId: order.id, stripePaymentIntentId: paymentIntentId }
          : mercadoPagoPaymentId
            ? { orderId: order.id, mercadoPagoPaymentId }
            : { orderId: order.id };

      await tx.paymentAttempt.updateMany({
        where: paymentAttemptWhere,
        data: {
          ...(paymentIntentId ? { stripePaymentIntentId: paymentIntentId } : {}),
          ...(mercadoPagoPaymentId
            ? { mercadoPagoPaymentId, provider: "MERCADO_PAGO" }
            : {}),
          status: "PAID",
        },
      });

      await tx.checkoutEvent.create({
        data: {
          orderId: order.id,
          userId: order.userId,
          type: "PAYMENT_CONFIRMED",
          message: order.inventoryReserved
            ? "Pagamento confirmado e reserva de estoque convertida em baixa definitiva."
            : "Pagamento confirmado e estoque decrementado.",
          metadata: JSON.stringify({
            stripeCheckoutSessionId: checkoutSessionId ?? null,
            stripePaymentIntentId: paymentIntentId,
            mercadoPagoPaymentId: mercadoPagoPaymentId ?? null,
            inventoryReserved: order.inventoryReserved,
            source,
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
          stripePaymentIntentId:
            paymentIntentId ?? order.stripePaymentIntentId ?? undefined,
          mercadoPagoPaymentId:
            mercadoPagoPaymentId ?? order.mercadoPagoPaymentId ?? undefined,
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

    if (isInventoryRace && (paymentIntentId || mercadoPagoPaymentId) && race) {
      try {
        const refunded = await refundInventoryRacePayment(prisma, {
          orderId,
          paymentIntentId,
          mercadoPagoPaymentId,
          checkoutSessionId,
          race,
        });
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
                    stripeCheckoutSessionId: checkoutSessionId ?? null,
                    stripePaymentIntentId: paymentIntentId,
                    race,
                    refundError: refundMessage,
                  }),
                },
              },
              paymentAttempts: {
                updateMany: {
                  where: checkoutSessionId
                    ? { stripeCheckoutSessionId: checkoutSessionId }
                    : { orderId, stripePaymentIntentId: paymentIntentId },
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
          stripePaymentIntentId: paymentIntentId ?? undefined,
          checkoutEvents: {
            create: {
              type: isInventoryRace
                ? "INVENTORY_RACE_DETECTED"
                : "PAYMENT_REQUIRES_REVIEW",
              message,
              metadata: JSON.stringify({
                stripeCheckoutSessionId: checkoutSessionId ?? null,
                stripePaymentIntentId: paymentIntentId,
                reason: isInventoryRace ? "OUT_OF_STOCK_RACE" : "UNKNOWN",
                race,
              }),
            },
          },
          paymentAttempts: {
            updateMany: {
              where: checkoutSessionId
                ? { stripeCheckoutSessionId: checkoutSessionId }
                : paymentIntentId
                  ? { orderId, stripePaymentIntentId: paymentIntentId }
                  : { orderId },
              data: {
                status: "REQUIRES_REVIEW",
                stripePaymentIntentId: paymentIntentId ?? undefined,
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

/** Marca pedido como PAID a partir de Checkout Session (cartao). */
export async function fulfillPaidCheckoutSession(
  prisma: DbClient,
  checkoutSession: Stripe.Checkout.Session,
) {
  const orderId = checkoutSession.metadata?.orderId;
  if (!orderId) {
    return null;
  }

  return fulfillPaidOrder(prisma, {
    orderId,
    paymentIntentId: getPaymentIntentIdFromCheckoutSession(checkoutSession),
    checkoutSessionId: checkoutSession.id,
    source: checkoutSession.metadata?.reconcileSource ?? "webhook",
  });
}

/** Marca pedido como PAID a partir de PaymentIntent (Pix na pagina propria). */
export async function fulfillPaidPaymentIntent(
  prisma: DbClient,
  paymentIntent: Stripe.PaymentIntent,
) {
  const orderId = paymentIntent.metadata?.orderId;
  if (!orderId) {
    return null;
  }

  if (paymentIntent.status !== "succeeded") {
    return null;
  }

  return fulfillPaidOrder(prisma, {
    orderId,
    paymentIntentId: paymentIntent.id,
    source: paymentIntent.metadata?.reconcileSource ?? "payment_intent_webhook",
  });
}
