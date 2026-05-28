import { randomUUID } from "crypto";
import { onlyDigits } from "@/lib/br-fields";
import { PIX_RESERVE_TTL_SECONDS } from "@/lib/pix-inventory";
import {
  getMercadoPagoPayment,
  getMercadoPagoWebhookUrl,
  isMercadoPagoPaymentApproved,
  mercadoPagoRequest,
  type MercadoPagoPaymentApi,
} from "@/lib/mercado-pago";

export type MercadoPagoPixPayload = {
  paymentId: string;
  qrImageUrl: string;
  copyPasteCode: string;
  expiresAt: string;
};

type OrderForMercadoPagoPix = {
  id: string;
  totalInCents: number;
  customerEmail: string;
  customerName: string;
  customerCpf: string;
  inventoryReserveExpiresAt: Date | null;
};

function splitCustomerName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { first_name: "Cliente", last_name: "Stock Center" };
  }
  if (parts.length === 1) {
    return { first_name: parts[0]!, last_name: parts[0]! };
  }
  return {
    first_name: parts[0]!,
    last_name: parts.slice(1).join(" "),
  };
}

function extractPixPayload(
  payment: MercadoPagoPaymentApi,
  fallbackExpiresAt: Date | null,
): MercadoPagoPixPayload {
  const tx = payment.point_of_interaction?.transaction_data;
  if (!tx?.qr_code) {
    throw new Error("Mercado Pago nao retornou QR Code Pix para este pagamento.");
  }

  const expiresAt =
    payment.date_of_expiration ??
    fallbackExpiresAt?.toISOString() ??
    new Date(Date.now() + PIX_RESERVE_TTL_SECONDS * 1000).toISOString();

  const qrBase64 = tx.qr_code_base64?.trim();
  const qrImageUrl = qrBase64
    ? qrBase64.startsWith("data:")
      ? qrBase64
      : `data:image/png;base64,${qrBase64}`
    : "";

  return {
    paymentId: String(payment.id),
    qrImageUrl,
    copyPasteCode: tx.qr_code,
    expiresAt,
  };
}

export function isMercadoPagoPixApproved(status: string) {
  return isMercadoPagoPaymentApproved(status);
}

export function isMercadoPagoPixTerminalFailure(status: string) {
  return ["cancelled", "rejected", "refunded", "charged_back"].includes(status);
}

export async function createMercadoPagoPixPayment(
  order: OrderForMercadoPagoPix,
): Promise<MercadoPagoPixPayload> {
  const expiresAt =
    order.inventoryReserveExpiresAt ??
    new Date(Date.now() + PIX_RESERVE_TTL_SECONDS * 1000);

  const cpf = onlyDigits(order.customerCpf, 11);
  const nameParts = splitCustomerName(order.customerName);

  const notificationUrl = getMercadoPagoWebhookUrl();

  const payment = await mercadoPagoRequest<MercadoPagoPaymentApi>("/v1/payments", {
    method: "POST",
    idempotencyKey: randomUUID(),
    body: JSON.stringify({
      transaction_amount: Number((order.totalInCents / 100).toFixed(2)),
      description: `Pedido Stock Center ${order.id.slice(-8).toUpperCase()}`,
      payment_method_id: "pix",
      external_reference: order.id,
      date_of_expiration: expiresAt.toISOString(),
      ...(notificationUrl ? { notification_url: notificationUrl } : {}),
      payer: {
        email: order.customerEmail.trim().toLowerCase(),
        first_name: nameParts.first_name,
        last_name: nameParts.last_name,
        ...(cpf.length === 11
          ? {
              identification: {
                type: "CPF",
                number: cpf,
              },
            }
          : {}),
      },
    }),
  });

  return extractPixPayload(payment, expiresAt);
}

export async function retrieveMercadoPagoPixPayload(
  paymentId: string,
  fallbackExpiresAt: Date | null,
): Promise<MercadoPagoPixPayload | null> {
  const payment = await getMercadoPagoPayment(paymentId);

  if (isMercadoPagoPixApproved(payment.status)) {
    return null;
  }

  if (isMercadoPagoPixTerminalFailure(payment.status)) {
    return null;
  }

  try {
    return extractPixPayload(payment, fallbackExpiresAt);
  } catch {
    return null;
  }
}
