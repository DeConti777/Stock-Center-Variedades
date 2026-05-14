/** Apenas digitos, opcional limite. */
export function onlyDigits(value: string, maxLen?: number) {
  const d = value.replace(/\D/g, "");
  return maxLen !== undefined ? d.slice(0, maxLen) : d;
}

export function formatCpfDisplay(digits: string) {
  const d = onlyDigits(digits, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function formatCepDisplay(digits: string) {
  const d = onlyDigits(digits, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

/** Celular (11) ou fixo (10): (xx) xxxxx-xxxx ou (xx) xxxx-xxxx */
export function formatPhoneBrDisplay(digits: string) {
  const d = onlyDigits(digits, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** UF: 2 letras A-Z */
export function sanitizeUf(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 2);
}

/** Numero: digitos e S/N, barra, hifen (ex.: 1200, S/N, 12-A) */
export function sanitizeAddressNumber(value: string) {
  return value
    .toUpperCase()
    .replace(/[^0-9SN\/\-\s]/g, "")
    .slice(0, 12)
    .trimStart();
}

export function isValidEmail(value: string) {
  const v = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

/** CPF com 11 digitos e digitos verificadores validos. */
export function isValidCpfDigits(digits11: string) {
  const d = onlyDigits(digits11, 11);
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(d[i]) * (10 - i);
  let mod = (sum * 10) % 11;
  if (mod === 10) mod = 0;
  if (mod !== Number(d[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(d[i]) * (11 - i);
  mod = (sum * 10) % 11;
  if (mod === 10) mod = 0;
  return mod === Number(d[10]);
}

export function isValidPhoneBrDigits(digits: string) {
  const d = onlyDigits(digits);
  return d.length === 10 || d.length === 11;
}
