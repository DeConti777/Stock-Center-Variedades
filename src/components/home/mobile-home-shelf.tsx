"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { useStore } from "@/components/store/store-provider";
import { ProductCard } from "@/components/ui/product-card";
import { MobileFlashSaleCarousel } from "@/components/home/mobile-flash-sale-carousel";
import {
  calculatePixPrice,
  formatCurrency,
  getProductImageUrl,
} from "@/lib/catalog";
import type { Product } from "@/lib/types";

type MobileHomeShelfProps = {
  products: Product[];
  featuredProducts: Product[];
};

function CompactProductStripItem({ product }: { product: Product }) {
  const href = `/produto/${product.slug}`;
  const pixPrice = calculatePixPrice(product);
  const img = getProductImageUrl(product, 0);

  return (
    <Link
      href={href}
      className="flex w-[9.5rem] shrink-0 flex-col overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white shadow-[var(--shadow-soft)] transition hover:border-[var(--color-primary)]"
    >
      <div className="relative aspect-square w-full bg-[var(--color-soft)]">
        {img.startsWith("/") ? (
          <Image
            src={img}
            alt={product.name}
            fill
            className="object-cover"
            sizes="152px"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- URLs externas
          <img src={img} alt={product.name} className="h-full w-full object-cover" />
        )}
      </div>
      <div className="flex flex-1 flex-col p-2">
        <p className="line-clamp-2 text-xs font-bold leading-snug text-[var(--color-ink)]">
          {product.name}
        </p>
        <p className="mt-1 text-sm font-black text-[var(--color-ink)]">
          {formatCurrency(product.price)}
        </p>
        <p className="text-[10px] font-semibold text-[var(--color-success)]">
          Pix {formatCurrency(pixPrice)}
        </p>
      </div>
    </Link>
  );
}

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
    const list = featuredProducts.filter((p) => p.stock > 0);
    if (list.length >= 4) return list.slice(0, 4);
    const extras = products.filter((p) => p.stock > 0 && !list.some((x) => x.id === p.id));
    return [...list, ...extras].slice(0, 4);
  }, [featuredProducts, products]);

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
      className="border-b border-[var(--color-line)] bg-[var(--color-surface)] pb-4 pt-3"
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
        <div className="mt-4 px-4">
          <div className="mb-2 flex items-center justify-between">
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
          <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {visitedStrip.map((product) => (
              <CompactProductStripItem key={product.id} product={product} />
            ))}
          </div>
        </div>
      ) : null}

      {inspired.length > 0 ? (
        <div className="mt-5 px-4">
          <h2 className="mb-3 text-sm font-black text-[var(--color-ink)]">
            Inspirado no que voce viu
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {inspired.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      ) : null}

      {relatedToVisited.length > 0 ? (
        <div className="mt-5 px-4">
          <h2 className="mb-3 text-sm font-black text-[var(--color-ink)]">
            Quem viu este, tambem viu
          </h2>
          <div className="grid grid-flow-col auto-cols-[9.5rem] grid-rows-2 gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {relatedToVisited.map((product) => (
              <CompactProductStripItem key={product.id} product={product} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
