import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware global: aplica headers de seguranca sem alterar o roteamento.
 *
 * Por que sem CSP estrita?
 *   Uma Content-Security-Policy mal calibrada quebra Stripe Checkout, GA4 e
 *   `next/script`. Os comentarios abaixo mostram a baseline recomendada caso voce
 *   queira ativar depois de validar manualmente no ambiente de staging.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const headers = response.headers;

  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  );
  headers.set("X-DNS-Prefetch-Control", "on");

  if (process.env.NODE_ENV === "production") {
    headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }

  // CSP sugerida (descomente apos validar checkout/GA em staging):
  // headers.set(
  //   "Content-Security-Policy",
  //   [
  //     "default-src 'self'",
  //     "script-src 'self' 'unsafe-inline' https://js.stripe.com https://www.googletagmanager.com https://www.google-analytics.com",
  //     "style-src 'self' 'unsafe-inline'",
  //     "img-src 'self' data: blob: https:",
  //     "font-src 'self' data:",
  //     "connect-src 'self' https://api.stripe.com https://www.google-analytics.com",
  //     "frame-src https://js.stripe.com https://hooks.stripe.com",
  //     "object-src 'none'",
  //     "base-uri 'self'",
  //     "form-action 'self' https://checkout.stripe.com",
  //   ].join("; "),
  // );

  return response;
}

export const config = {
  matcher: [
    "/((?!api/webhooks/stripe|_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml).*)",
  ],
};
