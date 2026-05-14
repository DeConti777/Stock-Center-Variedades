"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState, useTransition } from "react";
import type { OAuthProviderAvailability } from "@/lib/oauth-providers";

type LoginPageViewProps = {
  oauthAvailability: OAuthProviderAvailability;
};

export function LoginPageView({ oauthAvailability }: LoginPageViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("next") || "/conta";
  const [isPending, startTransition] = useTransition();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
      <section className="rounded-[2rem] bg-[var(--color-ink)] p-5 text-white sm:rounded-[2.5rem] sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-white/60">
          Area do cliente
        </p>
        <h1 className="mt-4 font-display text-2xl font-black tracking-tight sm:text-4xl">
          Acesse sua conta para acompanhar pedidos, favoritos e checkout real.
        </h1>
        <p className="mt-5 text-base leading-8 text-white/75">
          O login agora e real, com sessao segura, usuarios em PostgreSQL e
          integracao com os pedidos pagos no checkout.
        </p>
      </section>

      <div className="grid gap-6">
        <form
          className="rounded-[2.5rem] border border-[var(--color-line)] bg-white p-6 sm:p-8"
          onSubmit={(event) => {
            event.preventDefault();
            setLoginError(null);
            const formData = new FormData(event.currentTarget);

            startTransition(async () => {
              const result = await signIn("credentials", {
                email: String(formData.get("email") || ""),
                password: String(formData.get("password") || ""),
                redirect: false,
              });

              if (result?.error) {
                setLoginError("E-mail ou senha invalidos.");
                return;
              }

              router.push(callbackUrl);
              router.refresh();
            });
          }}
        >
          <h2 className="font-display text-2xl font-bold text-[var(--color-ink)]">
            Entrar
          </h2>
          <div className="mt-6 grid gap-4">
            <label className="grid gap-1.5">
              <span className="text-sm font-semibold text-[var(--color-muted)]">E-mail</span>
              <input
                id="login-email"
              name="email"
              type="email"
                autoComplete="email"
              placeholder="Seu e-mail"
                className="rounded-2xl border border-[var(--color-line)] px-4 py-3 text-base outline-none"
              />
            </label>
            <div className="relative">
              <label htmlFor="login-password" className="mb-1.5 block text-sm font-semibold text-[var(--color-muted)]">
                Senha
              </label>
              <input
                id="login-password"
                name="password"
                type={showLoginPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Sua senha"
                className="w-full rounded-2xl border border-[var(--color-line)] px-4 py-3 pr-12 text-base outline-none"
              />
              <button
                type="button"
                onClick={() => setShowLoginPassword((current) => !current)}
                aria-label={showLoginPassword ? "Ocultar senha" : "Mostrar senha"}
                className="touch-target-mobile absolute right-3 top-[calc(50%+0.75rem)] inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-[var(--color-muted)] transition-colors hover:bg-[var(--color-soft)] hover:text-[var(--color-ink)]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                  {showLoginPassword ? null : (
                    <path
                      d="M3 3l18 18"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  )}
                </svg>
              </button>
            </div>
          </div>
          {loginError ? (
            <p className="mt-4 text-sm font-medium text-[var(--color-primary)]">
              {loginError}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={isPending}
            className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-[var(--color-primary)] px-6 py-4 text-sm font-bold text-white disabled:opacity-70"
          >
            {isPending ? "Entrando..." : "Entrar"}
          </button>
          <Link
            href={`/criar-conta?next=${encodeURIComponent(callbackUrl)}`}
            className="mt-3 inline-flex w-full items-center justify-center rounded-full border border-[var(--color-accent)] bg-[var(--color-accent)]/15 px-6 py-4 text-sm font-black text-[var(--color-ink)] transition-colors hover:bg-[var(--color-accent)]/30"
          >
            Criar conta
          </Link>
          {oauthAvailability.google ||
          oauthAvailability.facebook ||
          oauthAvailability.apple ? (
            <div className="mt-8">
              <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)]">
                Ou entre com
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {oauthAvailability.google ? (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      signIn("google", { callbackUrl, redirect: true })
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm font-semibold text-[var(--color-ink)] disabled:opacity-70"
                  >
                    Google
                  </button>
                ) : null}
                {oauthAvailability.facebook ? (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      signIn("facebook", { callbackUrl, redirect: true })
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--color-line)] bg-[#1877F2] px-4 py-3 text-sm font-semibold text-white disabled:opacity-70"
                  >
                    Facebook
                  </button>
                ) : null}
                {oauthAvailability.apple ? (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      signIn("apple", { callbackUrl, redirect: true })
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--color-line)] bg-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-70"
                  >
                    Apple
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
          <div className="mt-6 flex flex-col items-start justify-between gap-3 text-sm text-[var(--color-muted)] sm:flex-row sm:items-center">
            <span>Checkout seguro com Stripe</span>
            <div className="flex items-center gap-4">
              {loginError ? (
                <Link
                  href={`/esqueci-senha?next=${encodeURIComponent(callbackUrl)}`}
                  className="font-semibold text-[var(--color-primary)]"
                >
                  Esqueci minha senha
                </Link>
              ) : null}
              <Link href="/">Voltar para a loja</Link>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
}
