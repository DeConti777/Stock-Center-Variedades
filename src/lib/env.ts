function isLocalDevHost(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h === "localhost" ||
    h.endsWith(".local") ||
    h === "127.0.0.1" ||
    h === "[::1]"
  );
}

function toHttpsUrl(hostOrUrl: string): string {
  const trimmed = hostOrUrl.trim();
  if (trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("http://")) {
    return `https://${trimmed.slice("http://".length)}`;
  }
  return `https://${trimmed}`;
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

/**
 * URL publica do site. Em producao na Vercel, ignora NEXT_PUBLIC_APP_URL invalida
 * (ex.: http://localhost do .env local no deploy) e usa VERCEL_* quando disponivel.
 */
export function resolvePublicAppUrl(): string {
  const explicit = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim();

  if (explicit) {
    try {
      const parsed = new URL(explicit);
      const invalidInProduction =
        process.env.NODE_ENV === "production" &&
        (parsed.protocol !== "https:" || isLocalDevHost(parsed.hostname));
      if (!invalidInProduction) {
        return stripTrailingSlash(explicit);
      }
    } catch {
      /* tenta fallbacks */
    }
  }

  if (process.env.NODE_ENV === "production") {
    const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
    if (vercelProd) {
      return stripTrailingSlash(toHttpsUrl(vercelProd));
    }

    const vercelUrl = process.env.VERCEL_URL?.trim();
    if (vercelUrl) {
      return stripTrailingSlash(toHttpsUrl(vercelUrl));
    }
  }

  return "http://localhost:3000";
}

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
  return resolvePublicAppUrl();
}

/**
 * Em build/runtime de producao, URLs de retorno do Checkout Stripe precisam ser HTTPS
 * e publicas. Retorna mensagem em portugues ou null se aceitavel.
 */
export function getProductionAppUrlMisconfigurationError(): string | null {
  if (process.env.NODE_ENV !== "production") {
    return null;
  }

  const resolved = resolvePublicAppUrl();
  if (resolved === "http://localhost:3000") {
    return (
      "NEXT_PUBLIC_APP_URL nao esta definida. Em producao defina a URL publica do site " +
      "(https://seu-dominio.com) nas variaveis de ambiente do deploy."
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(resolved);
  } catch {
    return "NEXT_PUBLIC_APP_URL nao e uma URL valida. Use o formato https://seu-dominio.com";
  }

  if (parsed.protocol !== "https:") {
    return (
      "NEXT_PUBLIC_APP_URL deve usar https:// em producao (Stripe exige URLs de retorno seguras)."
    );
  }

  if (isLocalDevHost(parsed.hostname)) {
    return (
      "NEXT_PUBLIC_APP_URL nao pode apontar para localhost em producao. " +
      "Defina o dominio publico real do site (https://...)."
    );
  }

  return null;
}
