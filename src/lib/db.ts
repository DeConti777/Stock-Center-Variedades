type DbStatus = {
  provider: "postgresql";
  ready: boolean;
  connectionStringPresent: boolean;
  authConfigured: boolean;
  stripeConfigured: boolean;
};

let cachedStatus: DbStatus | null = null;

export function getDbStatus(): DbStatus {
  if (!cachedStatus) {
    cachedStatus = {
      provider: "postgresql",
      ready: Boolean(process.env.DATABASE_URL),
      connectionStringPresent: Boolean(process.env.DATABASE_URL),
      authConfigured: Boolean(process.env.AUTH_SECRET),
      stripeConfigured: Boolean(
        process.env.STRIPE_SECRET_KEY &&
          process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY &&
          process.env.STRIPE_WEBHOOK_SECRET,
      ),
    };
  }

  return cachedStatus;
}
