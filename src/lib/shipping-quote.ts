import { getShippingInCentsFromCep } from "@/lib/shipping";
import {
  calculateMelhorEnvioShipment,
  isMelhorEnvioConfigured,
} from "@/lib/melhor-envio";
import {
  buildMelhorEnvioProductsFromCartLines,
  type PackageSource,
} from "@/lib/package-dimensions";
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

function defaultInsuranceReais() {
  const raw = process.env.SHIPPING_DEFAULT_INSURANCE_REAIS?.trim();
  if (!raw) return 10;
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 10;
}

/** Cotacao sem carrinho (ex.: pagina do produto): medidas do SKU ou padrao da loja. */
export async function quotePublicShippingCents(
  destinationCepDigits8: string,
  packageSource?: PackageSource | null,
): Promise<{
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
  const products = buildMelhorEnvioProductsFromCartLines([
    {
      id: "default",
      price: defaultInsuranceReais(),
      quantity: 1,
      package: packageSource,
    },
  ]);

  const me = await calculateMelhorEnvioShipment({
    originPostalCode: origin,
    destinationPostalCode: dest,
    products,
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

/** Cotacao com itens do carrinho (medidas por SKU; seguro = preco de catalogo). */
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
  const resolved = items.length > 0 ? await resolveProductsForCart(items) : [];

  const products =
    resolved.length > 0
      ? buildMelhorEnvioProductsFromCartLines(
          resolved.map((p) => ({
            id: p.id,
            price: p.price,
            quantity: p.quantity,
            package: {
              packageWidthCm: p.packageWidthCm,
              packageHeightCm: p.packageHeightCm,
              packageLengthCm: p.packageLengthCm,
              packageWeightKg: p.packageWeightKg,
            },
          })),
        )
      : buildMelhorEnvioProductsFromCartLines([
          {
            id: "default",
            price: defaultInsuranceReais(),
            quantity: 1,
            package: null,
          },
        ]);

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
