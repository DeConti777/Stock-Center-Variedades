"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatCurrency, getProductImageUrl } from "@/lib/catalog";
import { mobileHorizontalScrollRowClass } from "@/lib/mobile-scroll-row";
import { getFlashSaleDisplayPercent, isFlashSaleActive } from "@/lib/flash-sale";
import type { Product } from "@/lib/types";

function LightningGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
    </svg>
  );
}

function pad2(n: number) {
  return String(Math.max(0, n)).padStart(2, "0");
}

export function MobileFlashSaleCarousel({ products }: { products: Product[] }) {
  const deals = useMemo(() => {
    const list = products.filter(
      (p) =>
        isFlashSaleActive(p) &&
        p.flashSaleEndsAt != null,
    );
    return [...list].sort((a, b) => {
      const endA = new Date(a.flashSaleEndsAt!).getTime();
      const endB = new Date(b.flashSaleEndsAt!).getTime();
      return endA - endB;
    });
  }, [products]);

  const targetEndMs = useMemo(() => {
    if (deals.length === 0) return null;
    return Math.min(
      ...deals.map((d) => new Date(d.flashSaleEndsAt!).getTime()),
    );
  }, [deals]);

  const [remainMs, setRemainMs] = useState(0);

  useEffect(() => {
    if (targetEndMs == null) return;
    const tick = () => {
      setRemainMs(Math.max(0, targetEndMs - Date.now()));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [targetEndMs]);

  if (deals.length === 0) return null;

  const h = Math.floor(remainMs / 3_600_000);
  const m = Math.floor((remainMs % 3_600_000) / 60_000);
  const s = Math.floor((remainMs % 60_000) / 1000);

  return (
    <div className="mx-4 mt-4 overflow-hidden rounded-[0.875rem] bg-gradient-to-r from-[#ff1f1f] via-[#e10e2f] to-[#b8002d] px-3 py-3 shadow-[0_16px_36px_rgba(185,28,28,0.35)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <Link
          href="/ofertas-relampago"
          className="flex min-w-0 items-center gap-1.5"
          aria-label="Abrir pagina de Ofertas Relâmpago"
        >
          <LightningGlyph className="shrink-0 text-white" />
          <span className="text-sm font-black text-white">
            Ofertas Relâmpago
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="text-[10px] font-semibold text-white/90">
            Encerra em
          </span>
          <div className="flex items-center gap-1 font-mono text-[11px] font-black tabular-nums text-white">
            <span className="rounded-md bg-[rgba(0,0,0,0.25)] px-1.5 py-0.5">
              {pad2(h)}
            </span>
            <span className="text-white">:</span>
            <span className="rounded-md bg-[rgba(0,0,0,0.25)] px-1.5 py-0.5">
              {pad2(m)}
            </span>
            <span className="text-white">:</span>
            <span className="rounded-md bg-[rgba(0,0,0,0.25)] px-1.5 py-0.5">
              {pad2(s)}
            </span>
          </div>
          <Link
            href="/ofertas-relampago"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white hover:bg-white/20"
            aria-label="Ver todas as ofertas relâmpago"
          >
            <span aria-hidden className="text-lg font-bold">
              ›
            </span>
          </Link>
        </div>
      </div>

      <div
        className={`-mr-1 gap-2! pl-0.5 pr-1 ${mobileHorizontalScrollRowClass}`}
      >
        {deals.map((product) => {
          const href = `/produto/${product.slug}`;
          const img = getProductImageUrl(product, 0);
          const hasDiscount =
            product.originalPrice != null &&
            product.originalPrice > product.price;
          const pct = getFlashSaleDisplayPercent(product);

          return (
            <Link
              key={product.id}
              href={href}
              className="relative w-[7.75rem] shrink-0 overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-[rgba(220,38,38,0.15)]"
            >
              {pct > 0 ? (
                <span className="absolute left-1 top-1 z-10 inline-flex items-center gap-0.5 rounded-md bg-[#ffd61f] px-1 py-0.5 text-[10px] font-black text-[var(--color-ink)] shadow-sm">
                  <LightningGlyph className="h-2.5 w-2.5" />-{pct}%
                </span>
              ) : null}
              <div className="relative aspect-square w-full bg-[var(--color-soft)]">
                {img.startsWith("/") ? (
                  <Image
                    src={img}
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes="124px"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- URLs externas
                  <img
                    src={img}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="pointer-events-none absolute bottom-2 left-1/2 flex w-[90%] -translate-x-1/2 flex-col items-center rounded-lg bg-white/95 px-2 py-1 shadow-sm ring-1 ring-white/80">
                {hasDiscount && product.originalPrice ? (
                  <span className="text-[10px] font-medium leading-none text-[var(--color-ink)] line-through">
                    {formatCurrency(product.originalPrice)}
                  </span>
                ) : null}
                <span className="mt-0.5 text-sm font-black leading-none text-[#d5002f]">
                  {formatCurrency(product.price)}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
