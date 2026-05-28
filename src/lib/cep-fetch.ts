import { sanitizeUf } from "@/lib/br-fields";
import { quotePublicShippingCents } from "@/lib/shipping-quote";

export type CepLookupOk = {
  cepDigits: string;
  cepFormatted: string;
  state: string;
  city: string;
  street: string;
  neighborhood: string;
  shippingInCents: number;
};

export type CepAddress = {
  cepDigits: string;
  cepFormatted: string;
  state: string;
  city: string;
  street: string;
  neighborhood: string;
};

export type CepAddressHint = {
  city?: string;
  state?: string;
  street?: string;
  neighborhood?: string;
};

type BrasilApiCepV2 = {
  cep?: string;
  state?: string;
  city?: string;
  street?: string;
  neighborhood?: string;
  errors?: unknown;
};

type ViaCepResponse = {
  erro?: boolean;
  uf?: string;
  localidade?: string;
  logradouro?: string;
  bairro?: string;
};

function formatCepFromDigits(d8: string) {
  return `${d8.slice(0, 5)}-${d8.slice(5)}`;
}

async function fetchCepFromBrasilApi(cepDigits8: string): Promise<CepAddress | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);

  try {
    const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${cepDigits8}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    if (!res.ok) return null;

    const data = (await res.json()) as BrasilApiCepV2;
    if (!data.state || !data.city) return null;

    return {
      cepDigits: cepDigits8,
      cepFormatted: formatCepFromDigits(cepDigits8),
      state: data.state,
      city: data.city,
      street: data.street != null ? String(data.street) : "",
      neighborhood: data.neighborhood != null ? String(data.neighborhood) : "",
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchCepFromViaCep(cepDigits8: string): Promise<CepAddress | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const res = await fetch(`https://viacep.com.br/ws/${cepDigits8}/json/`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    if (!res.ok) return null;

    const data = (await res.json()) as ViaCepResponse;
    if (data.erro || !data.uf || !data.localidade) return null;

    return {
      cepDigits: cepDigits8,
      cepFormatted: formatCepFromDigits(cepDigits8),
      state: data.uf,
      city: data.localidade,
      street: data.logradouro != null ? String(data.logradouro) : "",
      neighborhood: data.bairro != null ? String(data.bairro) : "",
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function addressFromHint(cepDigits8: string, hint: CepAddressHint): CepAddress | null {
  const city = hint.city?.trim() ?? "";
  const state = sanitizeUf(hint.state ?? "");
  if (!city || state.length !== 2) return null;

  return {
    cepDigits: cepDigits8,
    cepFormatted: formatCepFromDigits(cepDigits8),
    state,
    city,
    street: hint.street?.trim() ?? "",
    neighborhood: hint.neighborhood?.trim() ?? "",
  };
}

/**
 * Endereco pelo CEP (Brasil API, com fallback ViaCEP).
 */
export async function fetchCepAddress(cepDigits8: string): Promise<CepAddress | null> {
  if (cepDigits8.length !== 8) return null;

  const brasil = await fetchCepFromBrasilApi(cepDigits8);
  if (brasil) return brasil;

  return fetchCepFromViaCep(cepDigits8);
}

/**
 * Resolve endereco para cotacao/checkout: APIs externas e, se falharem,
 * dados ja informados pelo cliente (ex.: endereco salvo no perfil).
 */
export async function resolveCepAddress(
  cepDigits8: string,
  hint?: CepAddressHint,
): Promise<CepAddress | null> {
  if (cepDigits8.length !== 8) return null;

  const fromApi = await fetchCepAddress(cepDigits8);
  if (fromApi) return fromApi;

  if (hint) {
    return addressFromHint(cepDigits8, hint);
  }

  return null;
}

/**
 * Consulta CEP e cotacao de frete (Melhor Envio quando configurado; senao regra por CEP).
 */
export async function lookupCepWithShipping(
  cepDigits8: string,
  hint?: CepAddressHint,
): Promise<CepLookupOk | null> {
  const address = await resolveCepAddress(cepDigits8, hint);
  if (!address) return null;

  const quote = await quotePublicShippingCents(cepDigits8);

  return {
    ...address,
    shippingInCents: quote.shippingInCents,
  };
}
