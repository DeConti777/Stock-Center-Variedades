/**
 * Cotação de frete via Melhor Envio (Correios, Jadlog e outras transportadoras).
 * @see https://docs.melhorenvio.com.br/reference/calculo-de-fretes-por-produtos
 */

export type MelhorEnvioProduct = {
  id: string;
  width: number;
  height: number;
  length: number;
  weight: number;
  insurance_value: number;
  quantity: number;
};

export type MelhorEnvioQuoteRow = {
  id: number;
  name: string;
  price?: string;
  custom_price?: string;
  error?: string;
  delivery_time?: number;
  custom_delivery_time?: number;
  company?: { id?: number; name?: string };
};

export type MelhorEnvioBestQuote = {
  priceReais: number;
  priceCents: number;
  serviceId: string;
  serviceName: string;
  companyName: string;
  deliveryDays: number;
  options: Array<{
    id: number;
    name: string;
    company: string;
    priceReais: number;
    deliveryDays: number;
  }>;
};

function parsePriceToReais(value: string | undefined): number | null {
  if (value == null || value === "") return null;
  const normalized = String(value).replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function melhorEnvioBaseUrl() {
  const raw = process.env.MELHOR_ENVIO_API_BASE_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  return process.env.MELHOR_ENVIO_USE_SANDBOX === "true"
    ? "https://sandbox.melhorenvio.com.br"
    : "https://melhorenvio.com.br";
}

export function isMelhorEnvioConfigured() {
  const token = process.env.MELHOR_ENVIO_TOKEN?.trim();
  const origin = process.env.SHIPPING_ORIGIN_POSTAL_CODE?.replace(/\D/g, "") ?? "";
  return Boolean(token && origin.length === 8);
}

export function getMelhorEnvioUserAgent() {
  const email = process.env.MELHOR_ENVIO_CONTACT_EMAIL?.trim();
  if (email) {
    return `StockCenter (${email})`;
  }
  return "StockCenter (suporte@stockcenter.local)";
}

/**
 * Cotacao na API Melhor Envio; retorna null se token/origem ausentes ou resposta invalida.
 */
export async function calculateMelhorEnvioShipment(params: {
  originPostalCode: string;
  destinationPostalCode: string;
  products: MelhorEnvioProduct[];
  servicesFilter?: string;
  /** Quando informado e retornado pela API, usa preço/prazo desse serviço em vez do mais barato. */
  preferredServiceId?: number | null;
}): Promise<MelhorEnvioBestQuote | null> {
  const token = process.env.MELHOR_ENVIO_TOKEN?.trim();
  const origin = params.originPostalCode.replace(/\D/g, "");
  const dest = params.destinationPostalCode.replace(/\D/g, "");

  if (!token || origin.length !== 8 || dest.length !== 8 || params.products.length === 0) {
    return null;
  }

  const body: Record<string, unknown> = {
    from: { postal_code: origin },
    to: { postal_code: dest },
    products: params.products,
    options: {
      receipt: false,
      own_hand: false,
    },
  };

  const services = process.env.MELHOR_ENVIO_SERVICE_IDS?.trim();
  if (services) {
    body.services = services;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18_000);

  async function fetchCalculate(baseUrl: string) {
    return fetch(`${baseUrl}/api/v2/me/shipment/calculate`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "User-Agent": getMelhorEnvioUserAgent(),
      },
      body: JSON.stringify(body),
    });
  }

  try {
    const primaryBase = melhorEnvioBaseUrl();
    let res = await fetchCalculate(primaryBase);

    if (
      res.status === 401 &&
      primaryBase.includes("sandbox") &&
      process.env.MELHOR_ENVIO_USE_SANDBOX === "true"
    ) {
      res = await fetchCalculate("https://melhorenvio.com.br");
    }

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as unknown;
    if (!Array.isArray(data)) {
      return null;
    }

    type Parsed = {
      row: MelhorEnvioQuoteRow;
      priceReais: number;
      companyName: string;
      deliveryDays: number;
    };
    const parsed: Parsed[] = [];

    for (const raw of data) {
      const row = raw as MelhorEnvioQuoteRow;
      if (row?.error && String(row.error).trim()) {
        continue;
      }
      const priceReais =
        parsePriceToReais(row.custom_price) ?? parsePriceToReais(row.price);
      if (priceReais == null) {
        continue;
      }

      const companyName = row.company?.name?.trim() || "Transportadora";
      const deliveryDays =
        typeof row.custom_delivery_time === "number"
          ? row.custom_delivery_time
          : typeof row.delivery_time === "number"
            ? row.delivery_time
            : 0;

      parsed.push({ row, priceReais, companyName, deliveryDays });
    }

    if (parsed.length === 0) {
      return null;
    }

    const options: MelhorEnvioBestQuote["options"] = parsed.map((p) => ({
      id: p.row.id,
      name: p.row.name || "Servico",
      company: p.companyName,
      priceReais: p.priceReais,
      deliveryDays: p.deliveryDays,
    }));

    let best = parsed[0];
    for (const p of parsed) {
      if (p.priceReais < best.priceReais) {
        best = p;
      }
    }

    const preferredId = params.preferredServiceId;
    const chosen =
      preferredId != null && Number.isFinite(preferredId)
        ? parsed.find((p) => p.row.id === preferredId) ?? best
        : best;

    const row = chosen.row;
    const companyName = chosen.companyName;
    const deliveryDays = chosen.deliveryDays;
    const priceReaisChosen = chosen.priceReais;
    const priceCents = Math.max(0, Math.round(priceReaisChosen * 100));

    return {
      priceReais: priceReaisChosen,
      priceCents,
      serviceId: String(row.id),
      serviceName: row.name || "Servico",
      companyName,
      deliveryDays,
      options: options.sort((a, b) => a.priceReais - b.priceReais),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
