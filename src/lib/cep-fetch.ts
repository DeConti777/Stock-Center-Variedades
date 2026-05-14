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

type BrasilApiCepV2 = {
  cep?: string;
  state?: string;
  city?: string;
  street?: string;
  neighborhood?: string;
  errors?: unknown;
};

function formatCepFromDigits(d8: string) {
  return `${d8.slice(0, 5)}-${d8.slice(5)}`;
}

/**
 * Endereco pelo CEP (Brasil API). Sem frete.
 */
export async function fetchCepAddress(cepDigits8: string): Promise<{
  cepDigits: string;
  cepFormatted: string;
  state: string;
  city: string;
  street: string;
  neighborhood: string;
} | null> {
  if (cepDigits8.length !== 8) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

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

/**
 * Consulta CEP na Brasil API e cotacao de frete (Melhor Envio quando configurado; senao regra por CEP).
 */
export async function lookupCepWithShipping(
  cepDigits8: string,
): Promise<CepLookupOk | null> {
  const address = await fetchCepAddress(cepDigits8);
  if (!address) return null;

  const quote = await quotePublicShippingCents(cepDigits8);

  return {
    ...address,
    shippingInCents: quote.shippingInCents,
  };
}
