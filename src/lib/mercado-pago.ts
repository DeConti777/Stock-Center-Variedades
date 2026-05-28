import { resolveMercadoPagoNotificationUrl } from "@/lib/env";

const MP_API_BASE = "https://api.mercadopago.com";

export function getMercadoPagoAccessToken(): string {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "MERCADOPAGO_ACCESS_TOKEN nao configurado. Gere em https://www.mercadopago.com.br/developers/panel/credentials",
    );
  }
  return token;
}

export function isMercadoPagoTestMode(): boolean {
  return process.env.MERCADOPAGO_ACCESS_TOKEN?.trim().startsWith("TEST-") ?? false;
}

export function getMercadoPagoConfigError(
  token = process.env.MERCADOPAGO_ACCESS_TOKEN,
): string | null {
  const trimmed = token?.trim();
  if (!trimmed) {
    return "MERCADOPAGO_ACCESS_TOKEN nao configurado. Gere em https://www.mercadopago.com.br/developers/panel/credentials";
  }
  if (
    !trimmed.startsWith("TEST-") &&
    !trimmed.startsWith("APP_USR-")
  ) {
    return "MERCADOPAGO_ACCESS_TOKEN invalido. Use credencial de teste (TEST-...) ou producao (APP_USR-...).";
  }
  return null;
}

export function isMercadoPagoPaymentApproved(status: string) {
  return status === "approved";
}

export async function refundMercadoPagoPayment(paymentId: string) {
  return mercadoPagoRequest<{ id: number; status: string }>(
    `/v1/payments/${encodeURIComponent(paymentId)}/refunds`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
  );
}

export function getMercadoPagoWebhookUrl(): string | null {
  return resolveMercadoPagoNotificationUrl();
}

export type MercadoPagoPaymentApi = {
  id: number;
  status: string;
  external_reference?: string | null;
  date_of_expiration?: string | null;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
    };
  };
};

export async function mercadoPagoRequest<T>(
  path: string,
  init: RequestInit & { idempotencyKey?: string } = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${getMercadoPagoAccessToken()}`);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  if (init.idempotencyKey) {
    headers.set("X-Idempotency-Key", init.idempotencyKey);
  }

  const response = await fetch(`${MP_API_BASE}${path}`, {
    ...init,
    headers,
  });

  const data = (await response.json()) as T & {
    message?: string;
    error?: string;
    cause?: Array<{ description?: string }>;
  };

  if (!response.ok) {
    const detail =
      data.message ||
      data.error ||
      data.cause?.map((c) => c.description).filter(Boolean).join("; ") ||
      `HTTP ${response.status}`;
    throw new Error(detail);
  }

  return data;
}

export async function getMercadoPagoPayment(
  paymentId: string,
): Promise<MercadoPagoPaymentApi> {
  return mercadoPagoRequest<MercadoPagoPaymentApi>(
    `/v1/payments/${encodeURIComponent(paymentId)}`,
    { method: "GET" },
  );
}

export async function cancelMercadoPagoPayment(paymentId: string) {
  try {
    await mercadoPagoRequest<MercadoPagoPaymentApi>(
      `/v1/payments/${encodeURIComponent(paymentId)}`,
      {
        method: "PUT",
        body: JSON.stringify({ status: "cancelled" }),
      },
    );
  } catch {
    // Pagamento ja expirado/cancelado no MP — ignorar.
  }
}
