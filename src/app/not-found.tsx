import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-4xl flex-col items-center justify-center px-4 text-center sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--color-primary)]">
        Pagina nao encontrada
      </p>
      <h1 className="mt-4 font-display text-4xl font-bold text-[var(--color-ink)] sm:text-5xl">
        A vitrine mudou de lugar, mas as ofertas continuam aqui.
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--color-muted)]">
        Volte para a home ou navegue pelo catalogo para encontrar utilidades,
        presentes, eletronicos e promocoes da semana.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/"
          className="rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-bold text-white"
        >
          Ir para a home
        </Link>
        <Link
          href="/catalogo"
          className="rounded-full border border-[var(--color-line)] bg-white px-6 py-3 text-sm font-bold text-[var(--color-ink)]"
        >
          Ver catalogo
        </Link>
      </div>
    </div>
  );
}
