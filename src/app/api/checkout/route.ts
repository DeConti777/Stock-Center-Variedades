import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  buildPixCheckoutUrl,
  generatePixAccessToken,
} from "@/lib/pix-checkout-access";
import {
  isValidCpfDigits,
  isValidEmail,
  isValidPhoneBrDigits,
  onlyDigits,
  sanitizeUf,
} from "@/lib/br-fields";
import { lookupCepWithShipping } from "@/lib/cep-fetch";
import { getProductionAppUrlMisconfigurationError } from "@/lib/env";
import { getMercadoPagoConfigError } from "@/lib/mercado-pago";
import { createMercadoPagoCheckoutProPreference } from "@/lib/mercado-pago-checkout-pro";
import { createMercadoPagoPixPayment } from "@/lib/mercado-pago-pix-payment";
import { getPrismaOrNull } from "@/lib/prisma";
import { createDraftOrder, type CheckoutInput } from "@/lib/store-server";
import { orderToEmailOrder, sendOrderEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  releaseInventoryReservation,
  reserveInventoryForPixOrder,
} from "@/lib/pix-inventory";
import type { FulfillmentType, PaymentMethodChoice } from "@/lib/types";

function validateCheckoutFields(
  body: CheckoutInput,
  fulfillmentType: FulfillmentType,
): string | null {
  const s = body.shipping;
  if (!s) return "Dados de entrega ausentes.";

  const cpf = onlyDigits(s.cpf, 11);
  if (!isValidCpfDigits(cpf)) return "CPF invalido.";
  if (!isValidEmail(s.email)) return "E-mail invalido.";
  if (!isValidPhoneBrDigits(s.phone))
    return "Informe telefone com DDD (10 ou 11 digitos).";

  if (fulfillmentType === "PICKUP") {
    if (!s.recipientName?.trim()) return "Informe o nome completo.";
    return null;
  }

  const uf = sanitizeUf(s.state);
  if (uf.length !== 2) return "UF invalida.";

  return null;
}

function getClientIp(request: Request): string {
  const forwarded =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "";
  const firstIp = forwarded
    .split(",")
    .map((part) => part.trim())
    .find(Boolean);
  return firstIp || "unknown";
}

/** Usuario logado: identidade vem do cadastro; o cliente pode enviar so o endereco no body. */
async function shippingWithAccountIdentity(
  prisma: NonNullable<ReturnType<typeof getPrismaOrNull>>,
  userId: string,
  shipping: CheckoutInput["shipping"],
): Promise<{ shipping: CheckoutInput["shipping"]; error: string | null }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, phone: true, cpf: true },
  });

  if (!user) {
    return { shipping, error: "Usuario nao encontrado." };
  }

  const email = user.email?.trim().toLowerCase() ?? "";
  const phone = onlyDigits(user.phone ?? "", 11);
  const cpf = onlyDigits(user.cpf ?? "", 11);
  const recipientName = user.name?.trim() ?? "";

  if (!recipientName) {
    return {
      shipping,
      error: "Complete seu nome em Conta antes de finalizar o pedido.",
    };
  }
  if (!isValidEmail(email)) {
    return {
      shipping,
      error: "E-mail da conta invalido. Atualize em Conta.",
    };
  }
  if (!isValidCpfDigits(cpf)) {
    return {
      shipping,
      error:
        "CPF nao cadastrado ou invalido. Atualize seus dados em Conta antes do checkout.",
    };
  }
  if (!isValidPhoneBrDigits(phone)) {
    return {
      shipping,
      error:
        "Telefone nao cadastrado ou invalido. Atualize seus dados em Conta antes do checkout.",
    };
  }

  return {
    shipping: {
      ...shipping,
      recipientName,
      email,
      phone,
      cpf,
    },
    error: null,
  };
}

async function resolveCheckoutUserId(
  prisma: NonNullable<ReturnType<typeof getPrismaOrNull>>,
  sessionUserId: string | null,
  normalized: CheckoutInput,
) {
  if (sessionUserId) {
    return { userId: sessionUserId, isGuest: false };
  }

  const guestUser = await prisma.user.create({
    data: {
      name: normalized.shipping.recipientName.trim() || "Cliente convidado",
      email: `guest+${crypto.randomUUID()}@stockcenter.local`,
      phone: normalized.shipping.phone,
      cpf: normalized.shipping.cpf,
      role: "CUSTOMER",
    },
    select: { id: true },
  });

  return { userId: guestUser.id, isGuest: true };
}

export async function POST(request: Request) {
  const session = await auth();
  const viewerUserId = session?.user?.id || null;
  const limiterKey = viewerUserId
    ? `checkout:user:${viewerUserId}`
    : `checkout:guest:${getClientIp(request)}`;

  const limit = checkRateLimit(limiterKey, {
    limit: 3,
    windowMs: 60_000,
  });

  if (!limit.ok) {
    const retryAfter = Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 1000));
    return NextResponse.json(
      {
        error:
          "Muitas tentativas de checkout em sequencia. Aguarde um minuto e tente novamente.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
        },
      },
    );
  }

  const prisma = getPrismaOrNull();

  if (!prisma) {
    return NextResponse.json(
      { error: "Banco de dados nao configurado." },
      { status: 503 },
    );
  }

  const appUrlConfigError = getProductionAppUrlMisconfigurationError();
  if (appUrlConfigError) {
    return NextResponse.json({ error: appUrlConfigError }, { status: 503 });
  }

  const mpConfigError = getMercadoPagoConfigError();
  if (mpConfigError) {
    return NextResponse.json({ error: mpConfigError }, { status: 503 });
  }

  let body: CheckoutInput;
  try {
    body = (await request.json()) as CheckoutInput;
  } catch {
    return NextResponse.json(
      { error: "Formato da requisicao invalido." },
      { status: 400 },
    );
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "Carrinho vazio." }, { status: 400 });
  }

  const rawMethod = String(body.paymentMethod ?? "").toUpperCase();
  if (rawMethod !== "PIX" && rawMethod !== "CARD") {
    return NextResponse.json(
      { error: "Forma de pagamento invalida (use PIX ou CARD)." },
      { status: 400 },
    );
  }
  body = { ...body, paymentMethod: rawMethod as PaymentMethodChoice };

  const rawFulfillment = String(body.fulfillmentType ?? "SHIP").toUpperCase();
  const fulfillmentType: FulfillmentType =
    rawFulfillment === "PICKUP" ? "PICKUP" : "SHIP";

  if (viewerUserId) {
    const merged = await shippingWithAccountIdentity(
      prisma,
      viewerUserId,
      body.shipping,
    );
    if (merged.error) {
      return NextResponse.json({ error: merged.error }, { status: 400 });
    }
    body = { ...body, shipping: merged.shipping };
  }

  const fieldError = validateCheckoutFields(body, fulfillmentType);
  if (fieldError) {
    return NextResponse.json({ error: fieldError }, { status: 400 });
  }

  let normalized: CheckoutInput;

  if (fulfillmentType === "PICKUP") {
    normalized = {
      ...body,
      fulfillmentType: "PICKUP",
      melhorEnvioServiceId: undefined,
      shipping: {
        ...body.shipping,
        cep: "",
        city: "",
        state: "",
        street: "",
        number: "",
        complement: "",
        neighborhood: "",
        cpf: onlyDigits(body.shipping.cpf, 11),
        phone: onlyDigits(body.shipping.phone, 11),
        email: body.shipping.email.trim().toLowerCase(),
      },
    };
  } else {
    const cepDigits = onlyDigits(body.shipping.cep, 8);
    if (cepDigits.length !== 8) {
      return NextResponse.json({ error: "CEP deve ter 8 digitos." }, { status: 400 });
    }

    const cepOk = await lookupCepWithShipping(cepDigits);
    if (!cepOk) {
      return NextResponse.json(
        { error: "CEP nao encontrado. Confirme o numero na busca de endereco." },
        { status: 400 },
      );
    }

    if (sanitizeUf(body.shipping.state) !== sanitizeUf(cepOk.state)) {
      return NextResponse.json(
        { error: "UF nao confere com o CEP informado." },
        { status: 400 },
      );
    }

    const melhorEnvioServiceId =
      typeof body.melhorEnvioServiceId === "number" &&
      Number.isInteger(body.melhorEnvioServiceId) &&
      body.melhorEnvioServiceId > 0
        ? body.melhorEnvioServiceId
        : undefined;

    normalized = {
      ...body,
      fulfillmentType: "SHIP",
      melhorEnvioServiceId,
      shipping: {
        ...body.shipping,
        cep: cepOk.cepFormatted,
        state: sanitizeUf(cepOk.state),
        cpf: onlyDigits(body.shipping.cpf, 11),
        phone: onlyDigits(body.shipping.phone, 11),
        email: body.shipping.email.trim().toLowerCase(),
      },
    };
  }

  let order: Awaited<ReturnType<typeof createDraftOrder>>;
  let inventoryReservedForPix = false;
  const checkoutUser = await resolveCheckoutUserId(prisma, viewerUserId, normalized);
  try {
    order = await createDraftOrder(checkoutUser.userId, normalized);
    if (normalized.paymentMethod === "PIX") {
      order = await reserveInventoryForPixOrder(prisma, order.id);
      inventoryReservedForPix = true;
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Nao foi possivel criar o pedido.";
    await prisma.checkoutEvent
      .create({
        data: {
          userId: checkoutUser.userId,
          type: "ORDER_CREATE_FAILED",
          message,
          metadata: JSON.stringify({
            paymentMethod: normalized.paymentMethod,
            couponCode: normalized.couponCode || null,
            checkoutType: checkoutUser.isGuest ? "guest" : "authenticated",
          }),
        },
      })
      .catch(() => null);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    if (normalized.paymentMethod === "PIX") {
      const pixAccessToken = generatePixAccessToken();
      let pixPayment;

      try {
        pixPayment = await createMercadoPagoPixPayment({
          id: order.id,
          totalInCents: order.totalInCents,
          customerEmail: order.customerEmail,
          customerName: order.customerName,
          customerCpf: order.customerCpf,
          inventoryReserveExpiresAt: order.inventoryReserveExpiresAt,
        });
      } catch (mpErr) {
        const mpMessage =
          mpErr instanceof Error
            ? mpErr.message
            : "Falha ao criar pagamento Pix no Mercado Pago.";

        if (inventoryReservedForPix) {
          await releaseInventoryReservation(prisma, {
            orderId: order.id,
            reason: "CHECKOUT_ERROR",
            nextStatus: "FAILED",
          }).catch(() => null);
        }

        await prisma.checkoutEvent
          .create({
            data: {
              orderId: order.id,
              userId: checkoutUser.userId,
              type: "MP_PIX_FAILED",
              message: mpMessage,
            },
          })
          .catch(() => null);

        return NextResponse.json(
          {
            error: mpMessage,
          },
          { status: 502 },
        );
      }

      await prisma.order.update({
        where: { id: order.id },
        data: {
          mercadoPagoPaymentId: pixPayment.paymentId,
          pixAccessToken,
          paymentAttempts: {
            create: {
              provider: "MERCADO_PAGO",
              methodChoice: "PIX",
              mercadoPagoPaymentId: pixPayment.paymentId,
              status: "CREATED",
            },
          },
          checkoutEvents: {
            create: {
              userId: checkoutUser.userId,
              type: "MP_PIX_CREATED",
              message: "Pagamento Pix criado no Mercado Pago.",
              metadata: JSON.stringify({
                mercadoPagoPaymentId: pixPayment.paymentId,
                checkoutType: checkoutUser.isGuest ? "guest" : "authenticated",
              }),
            },
          },
        },
      });

      await sendOrderEmail("ORDER_CREATED", orderToEmailOrder(order));

      return NextResponse.json({
        pixUrl: buildPixCheckoutUrl(order.id, pixAccessToken),
      });
    }

    const checkoutPro = await createMercadoPagoCheckoutProPreference({
      id: order.id,
      totalInCents: order.totalInCents,
      customerEmail: order.customerEmail,
      customerName: order.customerName,
      customerCpf: order.customerCpf,
    });

    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentAttempts: {
          create: {
            provider: "MERCADO_PAGO",
            methodChoice: "CARD",
            status: "CREATED",
          },
        },
        checkoutEvents: {
          create: {
            userId: checkoutUser.userId,
            type: "MP_CHECKOUT_PRO_CREATED",
            message: "Preferencia de pagamento (cartao) criada no Mercado Pago.",
            metadata: JSON.stringify({
              mercadoPagoPreferenceId: checkoutPro.preferenceId,
              checkoutType: checkoutUser.isGuest ? "guest" : "authenticated",
            }),
          },
        },
      },
    });

    await sendOrderEmail("ORDER_CREATED", orderToEmailOrder(order));

    return NextResponse.json({
      url: checkoutPro.checkoutUrl,
    });
  } catch (err) {
    const mpMessage =
      err instanceof Error
        ? err.message
        : "Erro ao iniciar pagamento no Mercado Pago.";

    if (inventoryReservedForPix) {
      await releaseInventoryReservation(prisma, {
        orderId: order.id,
        reason: "CHECKOUT_ERROR",
        nextStatus: "FAILED",
      }).catch(() => null);
    }

    await prisma.order
      .update({
        where: { id: order.id },
        data: {
          status: "FAILED",
          ...(!inventoryReservedForPix
            ? { paymentRetryCount: { increment: 1 } }
            : {}),
          paymentAttempts: {
            create: {
              provider: "MERCADO_PAGO",
              methodChoice: normalized.paymentMethod,
              status: "FAILED",
              errorMessage: mpMessage,
            },
          },
          checkoutEvents: {
            create: {
              userId: checkoutUser.userId,
              type: "MP_CHECKOUT_FAILED",
              message: mpMessage,
            },
          },
        },
      })
      .catch(() => null);

    return NextResponse.json({ error: mpMessage }, { status: 502 });
  }
}
