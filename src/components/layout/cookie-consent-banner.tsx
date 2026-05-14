"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  COOKIE_CONSENT_ACCEPTED_EVENT,
  COOKIE_CONSENT_STORAGE_KEY,
} from "@/lib/cookie-consent";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY) !== "1");
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  function accept() {
    try {
      localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    try {
      window.dispatchEvent(new Event(COOKIE_CONSENT_ACCEPTED_EVENT));
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  return (
    <>
      <div className="h-[5.5rem] w-full shrink-0 sm:h-24" aria-hidden />
      <div
        className="fixed inset-x-0 bottom-0 z-[280] border-t border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-4 shadow-[0_-12px_40px_rgba(10,10,10,0.08)] sm:px-6"
        role="dialog"
        aria-labelledby="cookie-banner-title"
        aria-describedby="cookie-banner-desc"
      >
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <p
              id="cookie-banner-title"
              className="font-display text-base font-bold text-[var(--color-ink)]"
            >
              Cookies e privacidade
            </p>
            <p
              id="cookie-banner-desc"
              className="mt-2 text-sm leading-6 text-[var(--color-muted)]"
            >
              Usamos cookies essenciais para o funcionamento do site (sessao, carrinho e
              preferencias). Se houver ferramenta de estatistica configurada (ex.: Google
              Analytics), ela so e ativada apos este aceite. Concorda com o uso conforme
              nossa{" "}
              <Link
                href="/privacidade"
                className="font-semibold text-[var(--color-primary)] underline-offset-2 hover:underline"
              >
                Politica de privacidade
              </Link>
              , em linha com a LGPD.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
            <Link
              href="/privacidade"
              className="inline-flex items-center justify-center rounded-full border border-[var(--color-line)] bg-white px-5 py-2.5 text-sm font-bold text-[var(--color-ink)]"
            >
              Ver detalhes
            </Link>
            <button
              type="button"
              onClick={accept}
              className="inline-flex items-center justify-center rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
            >
              Entendi e continuar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
