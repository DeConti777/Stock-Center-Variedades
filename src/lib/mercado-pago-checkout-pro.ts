import { mercadoPagoCheckoutReturnUrls } from "@/lib/env";
import {
  getMercadoPagoWebhookUrl,
  isMercadoPagoTestMode,
  mercadoPagoRequest,
} from "@/lib/mercado-pago";
import { onlyDigits } from "@/lib/br-fields";

type OrderForCheckoutPro = {
  id: string;
  totalInCents: number;
  customerEmail: string;
  customerName: string;
  customerCpf: string;
};

type MercadoPagoPreferenceResponse = {
  id: string;
  init_point: string;
  sandbox_init_point?: string;
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

/** Checkout Pro (redirect) — cartao e debito; Pix fica no fluxo proprio do site. */
export async function createMercadoPagoCheckoutProPreference(
  order: OrderForCheckoutPro,
): Promise<{ preferenceId: string; checkoutUrl: string }> {
  const cpf = onlyDigits(order.customerCpf, 11);
  const returnUrls = mercadoPagoCheckoutReturnUrls(order.id);
  const nameParts = splitCustomerName(order.customerName);
  const notificationUrl = getMercadoPagoWebhookUrl();

  // Um unico item com o total do pedido (produtos + frete - desconto), como na Stripe Checkout.
  const items = [
    {
      id: order.id,
      title: `Pedido Stock Center ${order.id.slice(-8).toUpperCase()}`,
      quantity: 1,
      unit_price: Number((order.totalInCents / 100).toFixed(2)),
      currency_id: "BRL",
    },
  ];

  const preference = await mercadoPagoRequest<MercadoPagoPreferenceResponse>(
    "/checkout/preferences",
    {
      method: "POST",
      body: JSON.stringify({
        items,
        payer: {
          email: order.customerEmail.trim().toLowerCase(),
          name: nameParts.first_name,
          surname: nameParts.last_name,
          ...(cpf.length === 11
            ? {
                identification: {
                  type: "CPF",
                  number: cpf,
                },
              }
            : {}),
        },
        external_reference: order.id,
        statement_descriptor: "STOCK CENTER",
        ...(notificationUrl ? { notification_url: notificationUrl } : {}),
        ...returnUrls,
        payment_methods: {
          excluded_payment_types: [
            { id: "ticket" },
            { id: "bank_transfer" },
            { id: "atm" },
            { id: "digital_currency" },
          ],
          installments: 12,
        },
      }),
    },
  );

  const checkoutUrl = isMercadoPagoTestMode()
    ? preference.sandbox_init_point || preference.init_point
    : preference.init_point;

  if (!checkoutUrl?.trim()) {
    throw new Error("Mercado Pago nao retornou URL de pagamento para o cartao.");
  }

  return {
    preferenceId: preference.id,
    checkoutUrl: checkoutUrl.trim(),
  };
}
