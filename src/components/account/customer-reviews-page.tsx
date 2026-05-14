"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type CustomerReviewLine = {
  orderItemId: string;
  orderId: string;
  orderedAt: string;
  productName: string;
  productSlug: string;
  image: string | null;
  quantity: number;
  existing: null | {
    rating: number;
    comment: string | null;
    images: string[];
  };
};

function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Nota de 1 a 5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border text-2xl transition ${
            value >= n
              ? "scale-105 border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_14%,white)] text-[var(--color-accent)] shadow-[0_6px_16px_rgba(212,133,10,0.28)]"
              : "border-[var(--color-line)] bg-white text-[#c9c2b5] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          }`}
          aria-pressed={value === n}
          aria-label={`${n} estrelas`}
        >
          ★
        </button>
      ))}
      <span className="ml-1 rounded-full bg-[var(--color-soft)] px-3 py-1 text-sm font-semibold text-[var(--color-ink)]">{value}/5</span>
    </div>
  );
}

function StaticStars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`Nota ${value} de 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-xl ${
            value >= n
              ? "bg-[color-mix(in_srgb,var(--color-accent)_14%,white)] text-[var(--color-accent)]"
              : "bg-[var(--color-soft)] text-[#c9c2b5]"
          }`}
        >
          ★
        </span>
      ))}
    </div>
  );
}

function ReviewCard({ line }: { line: CustomerReviewLine }) {
  const [rating, setRating] = useState(line.existing?.rating ?? 5);
  const [comment, setComment] = useState(line.existing?.comment ?? "");
  const [urls, setUrls] = useState<string[]>(line.existing?.images ?? []);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneFlash, setDoneFlash] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!line.existing);
  const [hasSaved, setHasSaved] = useState(Boolean(line.existing));

  const onPickFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    const room = 4 - urls.length;
    const list = Array.from(files).slice(0, Math.max(0, room));
    setUploading(true);
    try {
      const next: string[] = [];
      for (const file of list) {
        const body = new FormData();
        body.set("file", file);
        const res = await fetch("/api/store/reviews/upload", {
          method: "POST",
          body,
        });
        const data = (await res.json()) as { url?: string; error?: string };
        if (!res.ok) {
          throw new Error(data.error || "Falha no upload.");
        }
        if (data.url) next.push(data.url);
      }
      setUrls((u) => [...u, ...next]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha no upload.");
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/store/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderItemId: line.orderItemId,
          rating,
          comment,
          images: urls,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Nao foi possivel salvar.");
      }
      setHasSaved(true);
      setIsExpanded(false);
      setDoneFlash(true);
      window.setTimeout(() => setDoneFlash(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="rounded-[1.75rem] border border-[var(--color-line)] bg-white p-5 shadow-[var(--shadow-soft)]">
      <div className="flex flex-col gap-4 sm:flex-row">
        <Link
          href={`/produto/${line.productSlug}`}
          className="relative flex h-28 w-full shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[var(--color-soft)] sm:h-32 sm:w-32"
        >
          {line.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={line.image} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="font-display text-3xl font-black text-[var(--color-muted)]">
              {line.productName.charAt(0).toUpperCase()}
            </span>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={`/produto/${line.productSlug}`} className="font-display text-lg font-bold text-[var(--color-ink)] hover:underline">
            {line.productName}
          </Link>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Pedido em {new Date(line.orderedAt).toLocaleDateString("pt-BR")} · {line.quantity}{" "}
            unidade(s)
          </p>
          <Link
            href={`/conta/pedidos/${line.orderId}`}
            className="mt-2 inline-flex text-xs font-bold text-[var(--color-primary)] hover:underline"
          >
            Ver pedido
          </Link>
        </div>
      </div>

      <div className="mt-5 border-t border-[var(--color-line)] pt-5">
        {!isExpanded ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--color-ink)]">Sua avaliacao</p>
                <div className="mt-2 flex items-center gap-3">
                  <StaticStars value={rating} />
                  <span className="rounded-full bg-[var(--color-soft)] px-3 py-1 text-sm font-semibold text-[var(--color-ink)]">{rating}/5</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExpanded(true)}
                className="inline-flex items-center justify-center rounded-full border border-[var(--color-line)] px-4 py-2 text-sm font-semibold text-[var(--color-primary)] hover:bg-[var(--color-soft)]"
              >
                Editar avaliacao
              </button>
            </div>

            {comment.trim() ? (
              <p className="mt-4 rounded-2xl bg-[var(--color-soft)] px-4 py-3 text-sm text-[var(--color-ink)]">{comment}</p>
            ) : null}

            {urls.length ? (
              <div className="mt-4 flex flex-wrap gap-3">
                {urls.map((url) => (
                  <div key={url} className="h-16 w-16 overflow-hidden rounded-xl border border-[var(--color-line)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            ) : null}

            {doneFlash ? <p className="mt-3 text-sm font-semibold text-[var(--color-success)]">Avaliacao salva!</p> : null}
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-[var(--color-ink)]">Sua avaliacao</p>
            <div className="mt-3">
              <StarPicker value={rating} onChange={setRating} />
            </div>
            <label className="mt-4 block text-sm font-semibold text-[var(--color-ink)]" htmlFor={`c-${line.orderItemId}`}>
              Comentario
            </label>
            <textarea
              id={`c-${line.orderItemId}`}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              className="mt-2 w-full rounded-2xl border border-[var(--color-line)] bg-[var(--color-soft)] px-4 py-3 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]"
              placeholder="Conte como foi a experiencia com o produto..."
            />

            <p className="mt-4 text-sm font-semibold text-[var(--color-ink)]">Fotos (opcional, ate 4)</p>
            <div className="mt-2 flex flex-wrap gap-3">
              {urls.map((url) => (
                <div key={url} className="relative h-20 w-20 overflow-hidden rounded-xl border border-[var(--color-line)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 text-xs text-white"
                    onClick={() => setUrls((u) => u.filter((x) => x !== url))}
                    aria-label="Remover foto"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            {urls.length < 4 ? (
              <label className="mt-3 inline-flex cursor-pointer items-center justify-center rounded-full border border-dashed border-[var(--color-line)] px-4 py-2 text-sm font-semibold text-[var(--color-primary)] hover:bg-[var(--color-soft)]">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  className="sr-only"
                  disabled={uploading}
                  onChange={(e) => void onPickFiles(e.target.files)}
                />
                {uploading ? "Enviando..." : "Anexar imagens"}
              </label>
            ) : null}

            {error ? <p className="mt-3 text-sm font-semibold text-red-600">{error}</p> : null}
            {doneFlash ? <p className="mt-3 text-sm font-semibold text-[var(--color-success)]">Avaliacao salva!</p> : null}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              {hasSaved ? (
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="inline-flex items-center justify-center rounded-full border border-[var(--color-line)] px-5 py-3 text-sm font-bold text-[var(--color-primary)]"
                >
                  Minimizar
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void onSubmit()}
                disabled={saving || uploading}
                className="inline-flex items-center justify-center rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-bold text-white disabled:opacity-60"
              >
                {saving ? "Salvando..." : hasSaved ? "Atualizar avaliacao" : "Publicar avaliacao"}
              </button>
            </div>
          </>
        )}
      </div>
    </article>
  );
}

export function CustomerReviewsPage({ lines }: { lines: CustomerReviewLine[] }) {
  const { pending, done } = useMemo(() => {
    const pendingList: CustomerReviewLine[] = [];
    const doneList: CustomerReviewLine[] = [];
    for (const line of lines) {
      if (line.existing) doneList.push(line);
      else pendingList.push(line);
    }
    return { pending: pendingList, done: doneList };
  }, [lines]);

  if (!lines.length) {
    return (
      <div className="rounded-[2rem] border border-[var(--color-line)] bg-white p-8 text-center shadow-[var(--shadow-soft)]">
        <p className="text-[var(--color-muted)]">
          Quando um pedido estiver pago ou em separacao, seus produtos aparecem aqui para avaliacao.
        </p>
        <Link
          href="/catalogo"
          className="mt-6 inline-flex rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-bold text-white"
        >
          Ir ao catalogo
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      {pending.length ? (
        <section>
          <h2 className="font-display text-xl font-bold text-[var(--color-ink)]">Aguardando sua opiniao</h2>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Avaliacoes ajudam outros clientes e melhoram o catalogo da Stock Center.
          </p>
          <div className="mt-6 flex flex-col gap-6">
            {pending.map((line) => (
              <ReviewCard key={line.orderItemId} line={line} />
            ))}
          </div>
        </section>
      ) : null}

      {done.length ? (
        <section>
          <h2 className="font-display text-xl font-bold text-[var(--color-ink)]">Avaliacoes publicadas</h2>
          <p className="mt-2 text-sm text-[var(--color-muted)]">Voce pode editar nota, texto e fotos quando quiser.</p>
          <div className="mt-6 flex flex-col gap-6">
            {done.map((line) => (
              <ReviewCard key={line.orderItemId} line={line} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
