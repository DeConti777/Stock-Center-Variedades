"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--color-primary)]">
        Algo deu errado
      </p>
      <h1 className="mt-4 font-display text-3xl font-bold text-[var(--color-ink)] sm:text-4xl">
        Nao foi possivel carregar esta pagina.
      </h1>
      <p className="mt-4 text-base leading-7 text-[var(--color-muted)]">
        Tente de novo em instantes. Se o problema continuar, volte para a home
        ou fale conosco pelo WhatsApp.
      </p>
      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
        >
          Tentar novamente
        </button>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full border border-[var(--color-line)] bg-white px-6 py-3 text-sm font-bold text-[var(--color-ink)]"
        >
          Ir para a home
        </Link>
      </div>
    </div>
  );
}
