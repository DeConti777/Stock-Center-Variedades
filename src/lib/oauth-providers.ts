import Apple from "next-auth/providers/apple";
import Facebook from "next-auth/providers/facebook";
import Google from "next-auth/providers/google";

export function getOAuthProviderAvailability() {
  return {
    google: Boolean(
      process.env.AUTH_GOOGLE_ID?.trim() &&
        process.env.AUTH_GOOGLE_SECRET?.trim(),
    ),
    facebook: Boolean(
      process.env.AUTH_FACEBOOK_ID?.trim() &&
        process.env.AUTH_FACEBOOK_SECRET?.trim(),
    ),
    apple: Boolean(
      process.env.AUTH_APPLE_ID?.trim() &&
        process.env.AUTH_APPLE_SECRET?.trim(),
    ),
  } as const;
}

export type OAuthProviderAvailability = ReturnType<
  typeof getOAuthProviderAvailability
>;

/** OAuth providers enabled via env; used by NextAuth `providers` array. */
export function getConfiguredOAuthProviders() {
  const a = getOAuthProviderAvailability();
  const providers = [];

  if (a.google) {
    providers.push(
      Google({
        clientId: process.env.AUTH_GOOGLE_ID!,
        clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      }),
    );
  }

  if (a.facebook) {
    providers.push(
      Facebook({
        clientId: process.env.AUTH_FACEBOOK_ID!,
        clientSecret: process.env.AUTH_FACEBOOK_SECRET!,
      }),
    );
  }

  if (a.apple) {
    providers.push(
      Apple({
        clientId: process.env.AUTH_APPLE_ID!,
        clientSecret: process.env.AUTH_APPLE_SECRET!,
      }),
    );
  }

  return providers;
}
