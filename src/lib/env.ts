export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL);
}

export function hasStripeKeys() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY &&
      process.env.STRIPE_WEBHOOK_SECRET,
  );
}

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

/**
 * Em build/runtime de producao, URLs de retorno do Checkout Stripe precisam ser HTTPS
 * e publicas. Retorna mensagem em portugues ou null se aceitavel.
 */
export function getProductionAppUrlMisconfigurationError(): string | null {
  if (process.env.NODE_ENV !== "production") {
    return null;
  }

  const raw = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim();
  if (!raw) {
    return (
      "NEXT_PUBLIC_APP_URL nao esta definida. Em producao defina a URL publica do site " +
      "(https://seu-dominio.com) nas variaveis de ambiente do deploy."
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return "NEXT_PUBLIC_APP_URL nao e uma URL valida. Use o formato https://seu-dominio.com";
  }

  if (parsed.protocol !== "https:") {
    return (
      "NEXT_PUBLIC_APP_URL deve usar https:// em producao (Stripe exige URLs de retorno seguras)."
    );
  }

  const host = parsed.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host === "127.0.0.1" ||
    host === "[::1]"
  ) {
    return (
      "NEXT_PUBLIC_APP_URL nao pode apontar para localhost em producao. " +
      "Defina o dominio publico real do site (https://...)."
    );
  }

  return null;
}
