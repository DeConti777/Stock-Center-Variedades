/** Dados publicos da loja (exibidos no rodape). Usar apenas NEXT_PUBLIC_*. */
export function getStoreLegalLines(): {
  legalName: string | undefined;
  cnpj: string | undefined;
} {
  const legalName = process.env.NEXT_PUBLIC_STORE_LEGAL_NAME?.trim() || undefined;
  const cnpj = process.env.NEXT_PUBLIC_STORE_CNPJ?.trim() || undefined;
  return { legalName, cnpj };
}
