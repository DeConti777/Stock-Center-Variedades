import { formatPublicOrderId } from "@/lib/format-public-order-id";
import { getAppUrl } from "@/lib/env";
import { getPrismaOrNull } from "@/lib/prisma";

export type OrderEmailKind =
  | "ORDER_CREATED"
  | "PAYMENT_CONFIRMED"
  | "PREPARING"
  | "SHIPPED"
  | "DELIVERED"
  | "PAYMENT_FAILED";

type EmailOrderItem = {
  productName: string;
  quantity: number;
  unitPriceInCents: number;
  lineTotalInCents?: number | null;
};

export type EmailOrder = {
  id: string;
  status: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  customerCpf?: string | null;
  shippingAddress: string;
  subtotalInCents: number;
  shippingInCents: number;
  discountInCents: number;
  totalInCents: number;
  couponCode?: string | null;
  shippingCode?: string | null;
  shippingCarrier?: string | null;
  trackingUrl?: string | null;
  invoiceUrl?: string | null;
  createdAt: Date;
  paidAt?: Date | null;
  items: EmailOrderItem[];
  fulfillmentType?: "SHIP" | "PICKUP";
  pickupCode?: string | null;
};

export function orderToEmailOrder(order: {
  id: string;
  status: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  customerCpf?: string | null;
  shippingAddress: string;
  subtotalInCents: number;
  shippingInCents: number;
  discountInCents: number;
  totalInCents: number;
  couponCode?: string | null;
  shippingCode?: string | null;
  shippingCarrier?: string | null;
  trackingUrl?: string | null;
  invoiceUrl?: string | null;
  createdAt: Date;
  paidAt?: Date | null;
  fulfillmentType?: string | null;
  pickupCode?: string | null;
  items: Array<{
    productName: string;
    quantity: number;
    unitPriceInCents: number;
    lineTotalInCents?: number | null;
  }>;
}): EmailOrder {
  return {
    id: order.id,
    status: order.status,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    customerCpf: order.customerCpf,
    shippingAddress: order.shippingAddress,
    subtotalInCents: order.subtotalInCents,
    shippingInCents: order.shippingInCents,
    discountInCents: order.discountInCents,
    totalInCents: order.totalInCents,
    couponCode: order.couponCode,
    shippingCode: order.shippingCode,
    shippingCarrier: order.shippingCarrier,
    trackingUrl: order.trackingUrl,
    invoiceUrl: order.invoiceUrl,
    createdAt: order.createdAt,
    paidAt: order.paidAt,
    fulfillmentType: order.fulfillmentType === "PICKUP" ? "PICKUP" : "SHIP",
    pickupCode: order.pickupCode ?? null,
    items: order.items.map((item) => ({
      productName: item.productName,
      quantity: item.quantity,
      unitPriceInCents: item.unitPriceInCents,
      lineTotalInCents: item.lineTotalInCents,
    })),
  };
}

function pickupInstructionsPlain(): string {
  const raw = process.env.NEXT_PUBLIC_PICKUP_INSTRUCTIONS?.trim();
  return raw && raw.length > 0
    ? raw
    : "Retire seu pedido na loja apresentando documento com foto. Use o codigo enviado apos a confirmacao do pagamento.";
}

function formatCurrencyFromCents(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value / 100);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function parseShippingAddress(raw: string) {
  try {
    const address = JSON.parse(raw) as Record<string, string | undefined>;
    return [
      `${address.street || ""}, ${address.number || ""}`.trim(),
      address.complement,
      address.neighborhood,
      `${address.city || ""} - ${address.state || ""}`.trim(),
      address.cep,
    ]
      .filter(Boolean)
      .join("<br />");
  } catch {
    return escapeHtml(raw);
  }
}

function getEmailContent(kind: OrderEmailKind, order: EmailOrder) {
  const publicId = formatPublicOrderId(order.id);
  const isPickup = order.fulfillmentType === "PICKUP";

  if (kind === "ORDER_CREATED" && isPickup) {
    return {
      subject: `Recebemos seu pedido ${publicId} (retirada na loja)`,
      eyebrow: "Pedido recebido",
      title: "Seu pedido foi criado e esta aguardando pagamento.",
      lead: "Apos a confirmacao do pagamento, voce recebera neste e-mail o codigo para retirar na loja.",
    };
  }

  if (kind === "PAYMENT_CONFIRMED" && isPickup) {
    return {
      subject: `Pagamento confirmado — retirada ${publicId}`,
      eyebrow: "Retirada na loja",
      title: "Pagamento confirmado. Use o codigo abaixo para retirar seu pedido.",
      lead:
        "Apresente o codigo e um documento com foto na loja. Guarde este e-mail ate retirar os produtos.",
    };
  }

  const content: Record<
    OrderEmailKind,
    { subject: string; eyebrow: string; title: string; lead: string }
  > = {
    ORDER_CREATED: {
      subject: `Recebemos seu pedido ${publicId}`,
      eyebrow: "Pedido recebido",
      title: "Seu pedido foi criado e esta aguardando pagamento.",
      lead: "Assim que o Mercado Pago confirmar o pagamento, a equipe Stock Center inicia a separacao.",
    },
    PAYMENT_CONFIRMED: {
      subject: `Pagamento confirmado do pedido ${publicId}`,
      eyebrow: "Pagamento aprovado",
      title: "Pagamento confirmado. Agora vamos preparar tudo.",
      lead: "Seu pedido entrou na fila de expedicao e voce recebera novas atualizacoes por email.",
    },
    PREPARING: {
      subject: `Pedido ${publicId} em preparacao`,
      eyebrow: "Preparacao",
      title: "Estamos separando seus produtos.",
      lead: "A equipe conferiu o pagamento e esta preparando seu pedido para envio.",
    },
    SHIPPED: {
      subject: `Pedido ${publicId} enviado`,
      eyebrow: "Pedido enviado",
      title: "Seu pedido saiu para transporte.",
      lead: order.trackingUrl
        ? "Use o link de rastreio abaixo para acompanhar a entrega."
        : "O codigo de rastreio foi registrado no pedido.",
    },
    DELIVERED: {
      subject: `Pedido ${publicId} entregue`,
      eyebrow: "Entrega concluida",
      title: "Entrega confirmada. Obrigado pela compra.",
      lead: "Esperamos que sua experiencia com a Stock Center tenha sido excelente.",
    },
    PAYMENT_FAILED: {
      subject: `Nao conseguimos confirmar o pedido ${publicId}`,
      eyebrow: "Pagamento nao confirmado",
      title: "O pagamento nao foi confirmado.",
      lead: "Voce pode voltar ao checkout e tentar novamente com outro metodo de pagamento.",
    },
  };

  return content[kind];
}

function renderOrderEmail(kind: OrderEmailKind, order: EmailOrder) {
  const content = getEmailContent(kind, order);
  const orderUrl = `${getAppUrl()}/conta/pedidos/${order.id}`;
  const isPickup = order.fulfillmentType === "PICKUP";
  const itemsHtml = order.items
    .map((item) => {
      const total = item.lineTotalInCents || item.unitPriceInCents * item.quantity;
      return `
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid #e5e7eb;">
            <strong style="color:#111827;">${escapeHtml(item.productName)}</strong>
            <div style="color:#6b7280;font-size:13px;">Quantidade: ${item.quantity}</div>
          </td>
          <td align="right" style="padding:14px 0;border-bottom:1px solid #e5e7eb;color:#111827;font-weight:700;">
            ${formatCurrencyFromCents(total)}
          </td>
        </tr>`;
    })
    .join("");

  const trackingHtml =
    !isPickup && (kind === "SHIPPED" || order.shippingCode || order.trackingUrl)
      ? `
        <div style="margin-top:22px;padding:18px;border-radius:18px;background:#f8fafc;border:1px solid #e5e7eb;">
          <div style="font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#6b7280;font-weight:700;">Rastreamento</div>
          <p style="margin:10px 0 0;color:#111827;">
            Entrega<br />
            ${order.shippingCode ? `Codigo: <strong>${escapeHtml(order.shippingCode)}</strong><br />` : ""}
            ${
              order.trackingUrl
                ? `<a href="${escapeHtml(order.trackingUrl)}" style="color:#dc2626;font-weight:700;">Acompanhar entrega</a>`
                : ""
            }
          </p>
        </div>`
      : "";

  const pickupCodeHtml =
    isPickup && order.pickupCode
      ? `
        <div style="margin-top:22px;padding:20px;border-radius:18px;background:#ecfdf5;border:2px solid #10b981;">
          <div style="font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#047857;font-weight:700;">Codigo para retirada na loja</div>
          <p style="margin:12px 0 0;font-size:28px;font-weight:800;letter-spacing:0.12em;color:#065f46;text-align:center;font-family:ui-monospace,monospace;">
            ${escapeHtml(order.pickupCode)}
          </p>
          <p style="margin:14px 0 0;color:#374151;font-size:14px;line-height:1.5;">${escapeHtml(pickupInstructionsPlain())}</p>
        </div>`
      : "";

  const invoiceHtml = order.invoiceUrl
    ? `<p style="margin:18px 0 0;"><a href="${escapeHtml(order.invoiceUrl)}" style="color:#dc2626;font-weight:700;">Acessar nota fiscal</a></p>`
    : "";

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(content.title)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="background:#111827;color:#ffffff;padding:34px 30px;">
                <div style="font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#d1d5db;font-weight:700;">${escapeHtml(content.eyebrow)}</div>
                <h1 style="margin:14px 0 0;font-size:28px;line-height:1.15;">${escapeHtml(content.title)}</h1>
                <p style="margin:14px 0 0;color:#d1d5db;line-height:1.6;">${escapeHtml(content.lead)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:30px;">
                <p style="margin:0;color:#374151;">Ola, <strong>${escapeHtml(order.customerName)}</strong>.</p>
                <p style="margin:12px 0 0;color:#6b7280;line-height:1.6;">
                  Pedido <strong>${escapeHtml(formatPublicOrderId(order.id))}</strong>, criado em ${order.createdAt.toLocaleDateString("pt-BR")}.
                </p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px;">
                  ${itemsHtml}
                </table>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:22px;color:#374151;font-size:14px;">
                  <tr><td style="padding:5px 0;">Produtos</td><td align="right">${formatCurrencyFromCents(order.subtotalInCents)}</td></tr>
                  ${
                    isPickup
                      ? ""
                      : `<tr><td style="padding:5px 0;">Frete</td><td align="right">${formatCurrencyFromCents(order.shippingInCents)}</td></tr>`
                  }
                  <tr><td style="padding:5px 0;">Descontos</td><td align="right">-${formatCurrencyFromCents(order.discountInCents)}</td></tr>
                  <tr><td style="padding:12px 0 0;font-size:18px;font-weight:800;color:#111827;">Total</td><td align="right" style="padding:12px 0 0;font-size:18px;font-weight:800;color:#111827;">${formatCurrencyFromCents(order.totalInCents)}</td></tr>
                </table>
                <div style="margin-top:24px;padding:18px;border-radius:18px;background:#f9fafb;border:1px solid #e5e7eb;">
                  <div style="font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#6b7280;font-weight:700;">${isPickup ? "Retirada" : "Entrega"}</div>
                  <p style="margin:10px 0 0;color:#374151;line-height:1.6;">${
                    isPickup
                      ? escapeHtml(pickupInstructionsPlain())
                      : parseShippingAddress(order.shippingAddress)
                  }</p>
                </div>
                ${pickupCodeHtml}
                ${trackingHtml}
                ${invoiceHtml}
                <p style="margin:26px 0 0;">
                  <a href="${escapeHtml(orderUrl)}" style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;border-radius:999px;padding:13px 22px;font-weight:700;">
                    Ver detalhes do pedido
                  </a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

async function writeNotificationLog(input: {
  orderId: string;
  channel: string;
  kind: string;
  recipient: string;
  subject: string;
  status: string;
  providerId?: string | null;
  error?: string | null;
}) {
  const prisma = getPrismaOrNull();

  if (!prisma) {
    return;
  }

  await prisma.notificationLog
    .create({
      data: input,
    })
    .catch(() => null);
}

export async function sendOrderEmail(kind: OrderEmailKind, order: EmailOrder) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "Stock Center <onboarding@resend.dev>";
  const content = getEmailContent(kind, order);

  if (!apiKey) {
    await writeNotificationLog({
      orderId: order.id,
      channel: "EMAIL",
      kind,
      recipient: order.customerEmail,
      subject: content.subject,
      status: "SKIPPED",
      error: "RESEND_API_KEY nao configurada.",
    });
    return { ok: false, skipped: true };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `${kind}-${order.id}`,
      },
      body: JSON.stringify({
        from,
        to: [order.customerEmail],
        subject: content.subject,
        html: renderOrderEmail(kind, order),
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { id?: string; message?: string; name?: string }
      | null;

    if (!response.ok) {
      const error = payload?.message || payload?.name || "Falha no Resend.";
      await writeNotificationLog({
        orderId: order.id,
        channel: "EMAIL",
        kind,
        recipient: order.customerEmail,
        subject: content.subject,
        status: "FAILED",
        error,
      });
      return { ok: false, error };
    }

    await writeNotificationLog({
      orderId: order.id,
      channel: "EMAIL",
      kind,
      recipient: order.customerEmail,
      subject: content.subject,
      status: "SENT",
      providerId: payload?.id || null,
    });

    return { ok: true, id: payload?.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro de rede.";
    await writeNotificationLog({
      orderId: order.id,
      channel: "EMAIL",
      kind,
      recipient: order.customerEmail,
      subject: content.subject,
      status: "FAILED",
      error: message,
    });
    return { ok: false, error: message };
  }
}

export function getEmailKindForOrderStatus(status: string): OrderEmailKind | null {
  switch (status) {
    case "PAID":
      return "PAYMENT_CONFIRMED";
    case "PROCESSING":
      return "PREPARING";
    case "SHIPPED":
      return "SHIPPED";
    case "DELIVERED":
      return "DELIVERED";
    case "FAILED":
      return "PAYMENT_FAILED";
    default:
      return null;
  }
}

/** E-mail interno (contato, newsletter) para `CONTACT_INBOX_EMAIL` via Resend. */
export async function sendInboxNotification(input: {
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "Stock Center <onboarding@resend.dev>";
  const to = process.env.CONTACT_INBOX_EMAIL?.trim();

  if (!apiKey || !to) {
    return { ok: false, skipped: true };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: input.subject,
        html: input.html,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { id?: string; message?: string; name?: string }
      | null;

    if (!response.ok) {
      const error = payload?.message || payload?.name || "Falha no Resend.";
      return { ok: false, error };
    }

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro de rede.";
    return { ok: false, error: message };
  }
}

export async function sendPasswordResetCodeEmail(input: {
  to: string;
  name?: string | null;
  code: string;
  expiresInMinutes: number;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "Stock Center <onboarding@resend.dev>";

  if (!apiKey) {
    return { ok: false, skipped: true };
  }

  const safeName = escapeHtml(input.name?.trim() || "cliente");
  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="background:#111827;color:#ffffff;padding:30px;">
                <div style="font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#d1d5db;font-weight:700;">Seguranca da conta</div>
                <h1 style="margin:14px 0 0;font-size:26px;line-height:1.2;">Codigo para redefinir sua senha</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:30px;">
                <p style="margin:0;color:#374151;">Ola, <strong>${safeName}</strong>.</p>
                <p style="margin:12px 0 0;color:#6b7280;line-height:1.6;">
                  Use o codigo abaixo para continuar a recuperacao da senha. Ele expira em ${input.expiresInMinutes} minutos.
                </p>
                <div style="margin-top:20px;border:1px dashed #d1d5db;border-radius:14px;padding:18px;text-align:center;">
                  <span style="font-size:34px;letter-spacing:.24em;font-weight:800;color:#111827;">${escapeHtml(input.code)}</span>
                </div>
                <p style="margin:18px 0 0;color:#6b7280;line-height:1.6;">
                  Se voce nao solicitou essa alteracao, ignore este e-mail.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: "Codigo para redefinir sua senha",
        html,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { message?: string; name?: string }
        | null;
      return { ok: false, error: payload?.message || payload?.name || "Falha no Resend." };
    }

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro de rede.";
    return { ok: false, error: message };
  }
}
