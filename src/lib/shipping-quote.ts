import { getShippingInCentsFromCep } from "@/lib/shipping";
import {
  calculateMelhorEnvioShipment,
  isMelhorEnvioConfigured,
  type MelhorEnvioProduct,
} from "@/lib/melhor-envio";
import { resolveProductsForCart } from "@/lib/store-server";
import type { CartItem } from "@/lib/types";

export type CartShippingQuote = {
  shippingInCents: number;
  shippingServiceId: string | null;
  shippingCarrier: string | null;
  options: Array<{
    id: number;
    name: string;
    company: string;
    priceReais: number;
    deliveryDays: number;
  }>;
  source: "melhor_envio" | "fallback";
};

function defaultPackageDims() {
  const w = Math.max(1, Math.round(Number(process.env.SHIPPING_DEFAULT_WIDTH_CM) || 18));
  const h = Math.max(1, Math.round(Number(process.env.SHIPPING_DEFAULT_HEIGHT_CM) || 11));
  const l = Math.max(1, Math.round(Number(process.env.SHIPPING_DEFAULT_LENGTH_CM) || 22));
  const weight = Math.max(0.01, Number(process.env.SHIPPING_DEFAULT_WEIGHT_KG) || 0.35);
  return { w, h, l, weight };
}

function defaultInsuranceReais() {
  const raw = process.env.SHIPPING_DEFAULT_INSURANCE_REAIS?.trim();
  if (!raw) return 10;
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 10;
}

function buildMelhorEnvioProductsFromResolvedCart(
  lines: Array<{ id: string; price: number; quantity: number }>,
): MelhorEnvioProduct[] {
  const { w, h, l, weight } = defaultPackageDims();

  return lines.map((line) => ({
    id: line.id,
    width: w,
    height: h,
    length: l,
    weight,
    insurance_value: Math.round(line.price * 100) / 100,
    quantity: line.quantity,
  }));
}

function defaultMelhorEnvioProduct(): MelhorEnvioProduct {
  const { w, h, l, weight } = defaultPackageDims();
  return {
    id: "default",
    width: w,
    height: h,
    length: l,
    weight,
    insurance_value: defaultInsuranceReais(),
    quantity: 1,
  };
}

/** Cotacao sem carrinho (ex.: apenas CEP): um volume padrao. */
export async function quotePublicShippingCents(destinationCepDigits8: string): Promise<{
  shippingInCents: number;
  source: "melhor_envio" | "fallback";
  options: CartShippingQuote["options"];
  shippingServiceId: string | null;
  shippingCarrier: string | null;
}> {
  const dest = destinationCepDigits8.replace(/\D/g, "");
  if (dest.length !== 8) {
    return {
      shippingInCents: getShippingInCentsFromCep(dest),
      source: "fallback",
      options: [],
      shippingServiceId: null,
      shippingCarrier: null,
    };
  }

  if (!isMelhorEnvioConfigured()) {
    return {
      shippingInCents: getShippingInCentsFromCep(dest),
      source: "fallback",
      options: [],
      shippingServiceId: null,
      shippingCarrier: null,
    };
  }

  const origin = process.env.SHIPPING_ORIGIN_POSTAL_CODE!.replace(/\D/g, "");

  const me = await calculateMelhorEnvioShipment({
    originPostalCode: origin,
    destinationPostalCode: dest,
    products: [defaultMelhorEnvioProduct()],
  });

  if (!me) {
    return {
      shippingInCents: getShippingInCentsFromCep(dest),
      source: "fallback",
      options: [],
      shippingServiceId: null,
      shippingCarrier: null,
    };
  }

  const label = `${me.companyName} — ${me.serviceName}`;
  return {
    shippingInCents: me.priceCents,
    source: "melhor_envio",
    options: me.options,
    shippingServiceId: me.serviceId,
    shippingCarrier: label,
  };
}

/**
 * Cotacao com itens do carrinho (dimensoes/peso padrao por SKU; seguro = preco de catalogo).
 */
export async function quoteCartShipping(
  destinationCepDigits8: string,
  normalizedItems: CartItem[],
  preferredMelhorEnvioServiceId?: number | null,
): Promise<CartShippingQuote> {
  const dest = destinationCepDigits8.replace(/\D/g, "");
  if (dest.length !== 8) {
    return {
      shippingInCents: getShippingInCentsFromCep(dest),
      shippingServiceId: null,
      shippingCarrier: null,
      options: [],
      source: "fallback",
    };
  }

  const items = normalizedItems.filter((i) => i.quantity > 0);

  if (!isMelhorEnvioConfigured()) {
    return {
      shippingInCents: getShippingInCentsFromCep(dest),
      shippingServiceId: null,
      shippingCarrier: null,
      options: [],
      source: "fallback",
    };
  }

  const origin = process.env.SHIPPING_ORIGIN_POSTAL_CODE!.replace(/\D/g, "");

  const products: MelhorEnvioProduct[] =
    items.length > 0
      ? buildMelhorEnvioProductsFromResolvedCart(
          (await resolveProductsForCart(items)).map((p) => ({
            id: p.id,
            price: p.price,
            quantity: p.quantity,
          })),
        )
      : [defaultMelhorEnvioProduct()];

  if (products.length === 0) {
    return {
      shippingInCents: getShippingInCentsFromCep(dest),
      shippingServiceId: null,
      shippingCarrier: null,
      options: [],
      source: "fallback",
    };
  }

  const me = await calculateMelhorEnvioShipment({
    originPostalCode: origin,
    destinationPostalCode: dest,
    products,
    preferredServiceId: preferredMelhorEnvioServiceId ?? null,
  });

  if (!me) {
    return {
      shippingInCents: getShippingInCentsFromCep(dest),
      shippingServiceId: null,
      shippingCarrier: null,
      options: [],
      source: "fallback",
    };
  }

  const label = `${me.companyName} — ${me.serviceName}`;
  return {
    shippingInCents: me.priceCents,
    shippingServiceId: me.serviceId,
    shippingCarrier: label,
    options: me.options,
    source: "melhor_envio",
  };
}
