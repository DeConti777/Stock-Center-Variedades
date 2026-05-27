"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { useStore } from "@/components/store/store-provider";
import { MobileFlashSaleCarousel } from "@/components/home/mobile-flash-sale-carousel";
import { MobileInspiredCarousel } from "@/components/home/mobile-inspired-carousel";
import {
  MobileCompactStripCarousel,
  MobileCompactStripRow,
} from "@/components/home/mobile-compact-strip";
import { formatCurrency, getProductImageUrl } from "@/lib/catalog";
import type { Product } from "@/lib/types";

type MobileHomeShelfProps = {
  products: Product[];
  featuredProducts: Product[];
};

export function MobileHomeShelf({
  products,
  featuredProducts,
}: MobileHomeShelfProps) {
  const { cartProducts, cartCount, subtotal, visitedProductIds } = useStore();

  const visitedStrip = useMemo(() => {
    if (!visitedProductIds.length) return [];
    const byId = new Map(products.map((p) => [p.id, p]));
    return visitedProductIds
      .map((id) => byId.get(id))
      .filter((p): p is Product => p !== undefined && p.stock > 0)
      .slice(0, 10);
  }, [products, visitedProductIds]);

  const inspired = useMemo(() => {
    const inStock = products.filter((product) => product.stock > 0);
    const byId = new Map(inStock.map((product) => [product.id, product]));
    const visited = visitedProductIds
      .map((id) => byId.get(id))
      .filter((product): product is Product => product !== undefined);
    const visitedCategories = new Set(visited.map((product) => product.category));
    const pool: Product[] = [];
    const seen = new Set<string>();

    const addMany = (list: Product[]) => {
      for (const product of list) {
        if (seen.has(product.id)) continue;
        seen.add(product.id);
        pool.push(product);
      }
    };

    if (visitedCategories.size > 0) {
      addMany(
        inStock.filter(
          (product) =>
            !visitedProductIds.includes(product.id) &&
            visitedCategories.has(product.category),
        ),
      );
    }

    addMany(featuredProducts.filter((product) => product.stock > 0));
    addMany(
      inStock.filter(
        (product) =>
          product.tags.includes("bestSeller") || product.tags.includes("promotion"),
      ),
    );
    addMany(inStock);

    return pool.slice(0, 48);
  }, [products, visitedProductIds, featuredProducts]);

  const relatedToVisited = useMemo(() => {
    const latestVisited = products.find((product) => product.id === visitedProductIds[0]);
    if (latestVisited) {
      return products
        .filter(
          (product) =>
            product.stock > 0 &&
            product.id !== latestVisited.id &&
            !visitedProductIds.includes(product.id) &&
            product.category === latestVisited.category,
        )
        .slice(0, 12);
    }
    return products
      .filter((product) => product.stock > 0 && product.tags.includes("new"))
      .slice(0, 12);
  }, [products, visitedProductIds]);

  const cartThumbs = cartProducts.filter((p) => p.stock > 0).slice(0, 3);

  return (
    <section
      aria-label="Atalhos e recomendacoes"
      className="border-b border-[var(--color-line)] bg-[var(--color-surface)] pb-0 pt-3"
    >
      <MobileFlashSaleCarousel products={products} />

      {cartThumbs.length > 0 ? (
        <div className="mx-4 mt-4 rounded-2xl border border-[var(--color-line)] bg-white p-4 shadow-[var(--shadow-soft)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--color-muted)]">
                Seu carrinho
              </p>
              <p className="mt-1 font-display text-lg font-black text-[var(--color-ink)]">
                Compre seu carrinho
              </p>
              <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                {cartCount} {cartCount === 1 ? "item" : "itens"} ·{" "}
                {formatCurrency(subtotal)}
              </p>
            </div>
            <div className="flex shrink-0 -space-x-2">
              {cartThumbs.map((item) => {
                const src = getProductImageUrl(item, 0);
                return (
                  <span
                    key={item.id}
                    className="relative z-0 inline-block h-11 w-11 overflow-hidden rounded-full border-2 border-white bg-[var(--color-soft)] shadow-sm ring-1 ring-[var(--color-line)]"
                  >
                    {src.startsWith("/") ? (
                      <Image
                        src={src}
                        alt={item.name}
                        width={44}
                        height={44}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={src} alt={item.name} className="h-full w-full object-cover" />
                    )}
                  </span>
                );
              })}
            </div>
          </div>
          <Link
            href="/carrinho"
            className="mt-3 inline-flex w-full min-h-11 items-center justify-center rounded-full bg-[var(--color-primary)] px-4 text-sm font-bold text-white"
          >
            Continuar compra
          </Link>
        </div>
      ) : null}

      {visitedStrip.length > 0 ? (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between px-4">
            <h2 className="text-sm font-black text-[var(--color-ink)]">
              Visto recentemente
            </h2>
            <Link
              href="/catalogo"
              className="text-xs font-bold text-[var(--color-primary)]"
            >
              Ver catalogo
            </Link>
          </div>
          <MobileCompactStripRow
            products={visitedStrip}
            ariaLabel="Visto recentemente"
          />
        </div>
      ) : null}

      {inspired.length > 0 ? (
        <div className="mt-5">
          <div className="mb-3 flex items-center justify-between px-4">
            <h2 className="text-sm font-black text-[var(--color-ink)]">
              Inspirado no que voce viu
            </h2>
            <Link
              href="/catalogo?origem=inspirado"
              className="text-xs font-bold text-[var(--color-primary)]"
            >
              Ver mais
            </Link>
          </div>
          <MobileInspiredCarousel products={inspired} />
        </div>
      ) : null}

      {relatedToVisited.length > 0 ? (
        <div className="mt-5 pb-3">
          <div className="mb-3 flex items-center justify-between px-4">
            <h2 className="text-sm font-black text-[var(--color-ink)]">
              Quem viu este, tambem viu
            </h2>
            <Link
              href="/catalogo?origem=quem-viu"
              className="text-xs font-bold text-[var(--color-primary)]"
            >
              Ver mais
            </Link>
          </div>
          <MobileCompactStripCarousel
            products={relatedToVisited}
            ariaLabel="Quem viu este, tambem viu"
          />
        </div>
      ) : null}
    </section>
  );
}
