"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ProductCard } from "@/components/ui/product-card";
import { prioritizeVisitedProducts } from "@/lib/catalog";
import { mobileHorizontalScrollRowClass } from "@/lib/mobile-scroll-row";
import { getProductHeroSrc, isProductMediaUrl } from "@/lib/product-media";
import type { Product } from "@/lib/types";
import type { RelatedProductsResponse } from "@/app/api/store/related/route";

type AddToCartModalProps = {
  productId: string;
  quantityAdded: number;
  visitedProductIds: string[];
  onClose: () => void;
};

function CheckBadge() {
  return (
    <span
      className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[var(--color-success)] text-white shadow-sm"
      aria-hidden
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M20 6L9 17l-5-5"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function AddToCartModal({
  productId,
  quantityAdded,
  visitedProductIds,
  onClose,
}: AddToCartModalProps) {
  const router = useRouter();
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RelatedProductsResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);

    void (async () => {
      try {
        const res = await fetch("/api/store/related", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        });
        const json = (await res.json()) as RelatedProductsResponse & { error?: string };
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error || "Nao foi possivel carregar sugestoes.");
          setLoading(false);
          return;
        }
        setData(json);
      } catch {
        if (!cancelled) {
          setError("Erro de rede. Tente de novo.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [productId]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const relatedOrdered =
    data?.products?.length
      ? prioritizeVisitedProducts(data.products, visitedProductIds)
      : [];

  const heroSrc = data?.baseProduct
    ? getProductHeroSrc(data.baseProduct)
    : null;

  const categoryHref = data?.category
    ? `/catalogo?categoria=${encodeURIComponent(data.category)}`
    : "/catalogo";

  const goCategory = useCallback(() => {
    onClose();
    router.push(categoryHref);
  }, [categoryHref, onClose, router]);

  const goCart = useCallback(() => {
    onClose();
    router.push("/carrinho");
  }, [onClose, router]);

  const qtyLabel =
    quantityAdded === 1 ? "1 unidade" : `${quantityAdded} unidades`;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-to-cart-modal-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[min(92vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.75rem] border border-[var(--color-line)] bg-white shadow-[0_30px_90px_rgba(15,23,42,0.18)] sm:max-h-[85vh] sm:rounded-[1.75rem]">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--color-line)] px-5 pb-4 pt-5">
          <div className="flex min-w-0 flex-1 gap-3">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-[var(--color-line)] bg-[var(--color-soft)]">
              {heroSrc && isProductMediaUrl(heroSrc) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={heroSrc}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div
                  className="h-full w-full bg-gradient-to-br from-[var(--color-soft)] to-[var(--color-line)]"
                  aria-hidden
                />
              )}
              <CheckBadge />
            </div>
            <div className="min-w-0">
              <p
                id="add-to-cart-modal-title"
                className="font-display text-base font-black text-[var(--color-ink)]"
              >
                Adicionado ao carrinho
              </p>
              <p className="mt-1 line-clamp-2 text-sm font-semibold text-[var(--color-muted)]">
                {data?.baseProduct?.name ?? "Produto"}
              </p>
              <p className="mt-0.5 text-xs text-[var(--color-muted)]">{qtyLabel}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--color-line)] text-lg font-bold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-soft)]"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-primary)]">
            Voce tambem pode gostar
          </p>
          {loading ? (
            <div className="flex h-40 items-center justify-center rounded-2xl bg-[var(--color-soft)] text-sm text-[var(--color-muted)]">
              Carregando sugestoes...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-soft)] px-4 py-6 text-center text-sm text-[var(--color-muted)]">
              {error}
            </div>
          ) : relatedOrdered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--color-line)] bg-[var(--color-soft)] px-4 py-8 text-center text-sm text-[var(--color-muted)]">
              Nenhum produto relacionado no momento.
            </div>
          ) : (
            <div
              className={`-mx-1 gap-4! pb-2 pt-1 scrollbar-thin ${mobileHorizontalScrollRowClass}`}
            >
              {relatedOrdered.map((p: Product) => (
                <div
                  key={p.id}
                  className="w-[min(85vw,280px)] shrink-0 snap-start sm:w-[260px]"
                >
                  <ProductCard
                    product={p}
                    compact
                    onBeforeProductNavigate={onClose}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-[var(--color-line)] bg-[var(--color-soft)]/40 px-5 py-4">
          <button
            type="button"
            onClick={goCategory}
            className="inline-flex w-full items-center justify-center rounded-full bg-[var(--color-primary)] px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:opacity-95"
          >
            Ver mais produtos
          </button>
          <button
            type="button"
            onClick={goCart}
            className="inline-flex w-full items-center justify-center rounded-full border border-[var(--color-line)] bg-white px-5 py-3.5 text-sm font-bold text-[var(--color-primary)] transition hover:bg-[var(--color-soft)]"
          >
            Ir para o carrinho
          </button>
        </div>
      </div>
    </div>
  );
}
