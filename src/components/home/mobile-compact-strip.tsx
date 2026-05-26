"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import {
  calculatePixPrice,
  formatCurrency,
  getProductImageUrl,
} from "@/lib/catalog";
import { getProductHeroSrc } from "@/lib/product-media";
import type { Product } from "@/lib/types";

export const STRIP_CARD_WIDTH = "9.5rem";
const STRIP_IMAGE_SIZE = "9.5rem";

const compactStripScrollRowClass =
  "flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-1 pl-4 pr-4 [-ms-overflow-style:none] [scrollbar-width:none] [touch-action:pan-x] [&::-webkit-scrollbar]:hidden";

function StripProductImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div
      className="relative shrink-0 overflow-hidden bg-[var(--color-soft)]"
      style={{ width: STRIP_IMAGE_SIZE, height: STRIP_IMAGE_SIZE }}
    >
      {src.startsWith("/") ? (
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
          sizes="152px"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- URLs externas
        <img
          src={src}
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </div>
  );
}

export function CompactProductStripItem({ product }: { product: Product }) {
  const href = `/produto/${product.slug}`;
  const pixPrice = calculatePixPrice(product);
  const img = getProductHeroSrc(product) ?? getProductImageUrl(product, 0);

  return (
    <Link
      href={href}
      className="flex shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white shadow-[var(--shadow-soft)] transition hover:border-[var(--color-primary)]"
      style={{ width: STRIP_CARD_WIDTH, minHeight: `calc(${STRIP_IMAGE_SIZE} + 4.75rem)` }}
    >
      <StripProductImage src={img} alt={product.name} />
      <div className="flex min-h-[4.75rem] flex-1 flex-col justify-end p-2">
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

/** Uma faixa horizontal (ex.: visto recentemente, produtos em destaque). */
export function MobileCompactStripRow({
  products,
  ariaLabel,
}: {
  products: Product[];
  ariaLabel?: string;
}) {
  if (!products.length) return null;

  return (
    <div className={compactStripScrollRowClass} aria-label={ariaLabel}>
      {products.map((product) => (
        <CompactProductStripItem key={product.id} product={product} />
      ))}
    </div>
  );
}

/** Duas faixas com scroll independente (ex.: quem viu este tambem viu). */
export function MobileCompactStripCarousel({
  products,
  ariaLabel,
}: {
  products: Product[];
  ariaLabel?: string;
}) {
  const { row1, row2 } = useMemo(() => {
    const first: Product[] = [];
    const second: Product[] = [];
    products.forEach((product, index) => {
      if (index % 2 === 0) first.push(product);
      else second.push(product);
    });
    return { row1: first, row2: second };
  }, [products]);

  if (!row1.length && !row2.length) return null;

  const topRow = row1.length > 0 ? row1 : row2;
  const bottomRow = row2.length > 0 ? row2 : row1;

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <MobileCompactStripRow products={topRow} />
      <MobileCompactStripRow products={bottomRow} />
    </div>
  );
}
