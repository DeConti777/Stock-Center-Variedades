/**
 * Frete em centavos (BRL), mesma regra em carrinho, checkout e API.
 * CEP vazio ou fora da faixa SP (01xxx) usa a faixa mais cara.
 */
export function getShippingInCentsFromCep(cep: string) {
  const sanitized = cep.replace(/\D/g, "");
  return sanitized.startsWith("01") ? 1490 : 2190;
}

export function getShippingReaisFromCep(cep: string) {
  return getShippingInCentsFromCep(cep) / 100;
}
