import {
  onlyDigits,
  sanitizeAddressNumber,
  sanitizeUf,
} from "@/lib/br-fields";
import { fetchCepAddress } from "@/lib/cep-fetch";

export type SavedDeliveryPayload = {
  cep: string;
  street: string;
  number: string;
  complement?: string | null;
  neighborhood: string;
  city: string;
  state: string;
};

export type SavedDeliveryDbFields = {
  savedDeliveryCep: string;
  savedDeliveryStreet: string;
  savedDeliveryNumber: string;
  savedDeliveryComplement: string | null;
  savedDeliveryNeighborhood: string;
  savedDeliveryCity: string;
  savedDeliveryState: string;
};

/** Opções de validação ao persistir endereço salvo. */
export type ResolveSavedDeliveryOptions = {
  /**
   * Se true, quando a Brasil API não responder no servidor, ainda assim persiste
   * logradouro/bairro/cidade/UF enviados pelo cliente (CEP com 8 dígitos e campos obrigatórios).
   * Use no PATCH do perfil; no registro mantenha false.
   */
  fallbackWithoutApi?: boolean;
};

/** Normaliza e valida CEP na Brasil API; logradouro/cidade/UF vindos da API quando disponíveis. */
export async function resolveSavedDeliveryForPersist(
  raw: SavedDeliveryPayload,
  options?: ResolveSavedDeliveryOptions,
): Promise<
  { ok: true; data: SavedDeliveryDbFields } | { ok: false; error: string }
> {
  const allowFallback = options?.fallbackWithoutApi === true;
  const cep = onlyDigits(raw.cep, 8);
  if (cep.length !== 8) {
    return { ok: false, error: "CEP invalido." };
  }

  const number = sanitizeAddressNumber(raw.number);
  if (!number) {
    return { ok: false, error: "Informe o numero do endereco." };
  }

  const api = await fetchCepAddress(cep);
  if (!api) {
    if (!allowFallback) {
      return { ok: false, error: "CEP nao encontrado." };
    }
    const street = raw.street.trim();
    const neighborhood = raw.neighborhood.trim();
    const city = raw.city.trim();
    const state = sanitizeUf(raw.state);
    if (!street || !neighborhood || !city || state.length !== 2) {
      return {
        ok: false,
        error:
          "Nao foi possivel consultar o CEP no servidor. Preencha todos os campos e tente de novo.",
      };
    }
    const complement =
      raw.complement != null && String(raw.complement).trim()
        ? String(raw.complement).trim()
        : null;
    return {
      ok: true,
      data: {
        savedDeliveryCep: cep,
        savedDeliveryStreet: street,
        savedDeliveryNumber: number,
        savedDeliveryComplement: complement,
        savedDeliveryNeighborhood: neighborhood,
        savedDeliveryCity: city,
        savedDeliveryState: state,
      },
    };
  }

  const streetFromUser = raw.street.trim();
  const street = api.street.trim() || streetFromUser;
  if (!street) {
    return {
      ok: false,
      error:
        "Informe o logradouro. Alguns CEPs nao retornam rua — confira o CEP ou complete o endereco.",
    };
  }

  const neighborhoodFromUser = raw.neighborhood.trim();
  const neighborhood =
    api.neighborhood.trim() || neighborhoodFromUser;
  if (!neighborhood) {
    return { ok: false, error: "Informe o bairro." };
  }

  const complement =
    raw.complement != null && String(raw.complement).trim()
      ? String(raw.complement).trim()
      : null;

  return {
    ok: true,
    data: {
      savedDeliveryCep: cep,
      savedDeliveryStreet: street,
      savedDeliveryNumber: number,
      savedDeliveryComplement: complement,
      savedDeliveryNeighborhood: neighborhood,
      savedDeliveryCity: api.city.trim(),
      savedDeliveryState: sanitizeUf(api.state),
    },
  };
}

/** Endereço salvo completo para checkout (todos obrigatórios). */
export function pickSavedDeliveryForCheckout(user: {
  savedDeliveryCep: string | null;
  savedDeliveryStreet: string | null;
  savedDeliveryNumber: string | null;
  savedDeliveryComplement: string | null;
  savedDeliveryNeighborhood: string | null;
  savedDeliveryCity: string | null;
  savedDeliveryState: string | null;
}): SavedDeliveryPayload | null {
  const cep = user.savedDeliveryCep?.trim() || "";
  const street = user.savedDeliveryStreet?.trim() || "";
  const number = user.savedDeliveryNumber?.trim() || "";
  const neighborhood = user.savedDeliveryNeighborhood?.trim() || "";
  const city = user.savedDeliveryCity?.trim() || "";
  const state = sanitizeUf(user.savedDeliveryState || "");

  const numberNorm = sanitizeAddressNumber(number);
  if (
    onlyDigits(cep, 8).length !== 8 ||
    !street ||
    !numberNorm ||
    !neighborhood ||
    !city ||
    state.length !== 2
  ) {
    return null;
  }

  return {
    cep: onlyDigits(cep, 8),
    street,
    number: numberNorm,
    complement: user.savedDeliveryComplement?.trim() || null,
    neighborhood,
    city,
    state,
  };
}
