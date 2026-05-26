/**
 * Garante DIRECT_URL para Prisma (migrate/generate) quando só DATABASE_URL está definida.
 * No Neon, a URL pooled costuma ter host "*-pooler.*" e query ?pgbouncer=true.
 */
export function deriveDirectUrl(databaseUrl) {
  const normalized = databaseUrl.replace(/^postgres:\/\//, "postgresql://");
  let parsed;
  try {
    parsed = new URL(normalized);
  } catch {
    return databaseUrl;
  }

  parsed.hostname = parsed.hostname.replace(/-pooler(?=\.)/i, "");
  parsed.searchParams.delete("pgbouncer");
  parsed.searchParams.delete("connection_limit");

  return parsed.toString();
}

export function ensurePrismaDatabaseEnv() {
  if (process.env.DIRECT_URL?.trim()) {
    return { derived: false };
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    console.error(
      "[build] DATABASE_URL ausente. Configure no painel da Vercel (Neon: conexao Pooled).",
    );
    process.exit(1);
  }

  process.env.DIRECT_URL = deriveDirectUrl(databaseUrl);
  console.warn(
    "[build] DIRECT_URL ausente — usando URL derivada de DATABASE_URL.",
  );
  console.warn(
    "[build] No Neon, copie a string Direct para DIRECT_URL na Vercel (mais confiavel para migrate).",
  );
  return { derived: true };
}
