"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { RelatedProductsResponse } from "@/app/api/store/related/route";
import { useStore } from "@/components/store/store-provider";
import { ProductCard } from "@/components/ui/product-card";
import { prioritizeVisitedProducts } from "@/lib/catalog";
import type { Product } from "@/lib/types";

const SKELETON_COUNT = 8;

function RelatedProductSkeleton() {
  return (
    <div className="premium-card overflow-hidden rounded-[1.25rem] border border-[var(--color-line)]">
      <div className="aspect-square animate-pulse bg-[var(--color-soft)]" />
      <div className="space-y-2 p-3">
        <div className="h-3 w-3/4 animate-pulse rounded bg-[var(--color-soft)]" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-[var(--color-soft)]" />
        <div className="h-3 w-2/5 animate-pulse rounded bg-[var(--color-soft)]" />
      </div>
    </div>
  );
}

export function ProductRelatedShelf({ productId }: { productId: string }) {
  const sectionRef = useRef<HTMLElement>(null);
  const { visitedProductIds } = useStore();
  const [shouldLoad, setShouldLoad] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RelatedProductsResponse | null>(null);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node || shouldLoad) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "400px", threshold: 0 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [shouldLoad]);

  useEffect(() => {
    if (!shouldLoad) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

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
          setError(json.error || "Nao foi possivel carregar produtos relacionados.");
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
  }, [shouldLoad, productId]);

  const relatedOrdered = useMemo(() => {
    if (!data?.products?.length) return [] as Product[];
    return prioritizeVisitedProducts(data.products, visitedProductIds);
  }, [data?.products, visitedProductIds]);

  const categoryHref = data?.category
    ? `/catalogo?categoria=${encodeURIComponent(data.category)}`
    : "/catalogo";

  const showSkeleton = shouldLoad && loading && !data;
  const showGrid = relatedOrdered.length > 0;

  return (
    <section ref={sectionRef} aria-labelledby="related-products-heading">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--color-primary)]">
          Produtos relacionados
        </p>
        <h2
          id="related-products-heading"
          className="mt-3 font-display text-3xl font-bold text-[var(--color-ink)]"
        >
          Continue navegando por itens com alto potencial de compra.
        </h2>
        {data?.category ? (
          <p className="mt-3 text-sm text-[var(--color-muted)]">
            <Link
              href={categoryHref}
              className="font-semibold text-[var(--color-primary)] hover:underline"
            >
              Ver mais em {data.category}
            </Link>
          </p>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-[1.5rem] border border-[var(--color-line)] bg-[var(--color-soft)] p-5 text-sm text-[var(--color-muted)]">
          <p>{error}</p>
          <Link
            href={categoryHref}
            className="mt-3 inline-block font-semibold text-[var(--color-primary)] hover:underline"
          >
            Explorar catalogo
          </Link>
        </div>
      ) : null}

      {showSkeleton ? (
        <div className="product-grid-mobile grid gap-2 md:grid-cols-2 md:gap-5 xl:grid-cols-4">
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <RelatedProductSkeleton key={`related-skeleton-${i}`} />
          ))}
        </div>
      ) : null}

      {showGrid ? (
        <div className="product-grid-mobile grid gap-2 md:grid-cols-2 md:gap-5 xl:grid-cols-4">
          {relatedOrdered.map((relatedProduct) => (
            <ProductCard key={relatedProduct.id} product={relatedProduct} />
          ))}
        </div>
      ) : null}

      {shouldLoad && !loading && !error && relatedOrdered.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">
          Nenhum produto relacionado no momento.{" "}
          <Link href={categoryHref} className="font-semibold text-[var(--color-primary)] hover:underline">
            Ver catalogo
          </Link>
        </p>
      ) : null}
    </section>
  );
}
