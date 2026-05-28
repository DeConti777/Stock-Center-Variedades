"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FlashSaleCarouselCard } from "@/components/home/flash-sale-carousel-card";
import { applyFlashSalePricing, isFlashSaleActive } from "@/lib/flash-sale";
import type { Product } from "@/lib/types";

function LightningGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
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

const carouselScrollClass =
  "flex snap-x snap-proximity gap-2.5 overflow-x-auto overscroll-x-contain pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden";

export function MobileFlashSaleCarousel({
  products,
  layout = "mobile",
}: {
  products: Product[];
  layout?: "mobile" | "desktop";
}) {
  const deals = useMemo(() => {
    const list = products
      .filter((p) => isFlashSaleActive(p) && p.flashSaleEndsAt != null)
      .map((p) => applyFlashSalePricing(p));
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

  const shellClass =
    layout === "desktop"
      ? "overflow-hidden rounded-[1.25rem] bg-gradient-to-b from-[#ff3b30] via-[#e10e2f] to-[#9b001f] px-5 py-4 shadow-[0_16px_40px_rgba(155,0,31,0.38)]"
      : "mx-4 mt-4 overflow-hidden rounded-[1.25rem] bg-gradient-to-b from-[#ff3b30] via-[#e10e2f] to-[#9b001f] px-3.5 py-3.5 shadow-[0_16px_40px_rgba(155,0,31,0.38)]";

  const timerBoxClass =
    "inline-flex min-w-[1.65rem] items-center justify-center rounded-md bg-[#5a0818] px-1 py-0.5 font-mono text-[11px] font-black tabular-nums text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]";

  return (
    <div className={shellClass}>
      <div className="flex items-start justify-between gap-2">
        <Link
          href="/ofertas-relampago"
          className="flex min-w-0 items-center gap-2"
          aria-label="Abrir pagina de Ofertas Relâmpago"
        >
          <LightningGlyph className="mt-0.5 shrink-0 text-white" />
          <span className="flex flex-col text-sm font-black leading-[1.05] text-white">
            <span>Ofertas</span>
            <span>Relâmpago</span>
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-1">
          <span className="mr-0.5 text-[10px] font-semibold text-white/95">
            Encerra em
          </span>
          <div className="flex items-center gap-0.5">
            <span className={timerBoxClass}>{pad2(h)}</span>
            <span className="px-0.5 text-[11px] font-bold text-white">:</span>
            <span className={timerBoxClass}>{pad2(m)}</span>
            <span className="px-0.5 text-[11px] font-bold text-white">:</span>
            <span className={timerBoxClass}>{pad2(s)}</span>
          </div>
          <Link
            href="/ofertas-relampago"
            className="ml-0.5 flex h-7 w-7 shrink-0 items-center justify-center text-lg font-bold leading-none text-white hover:bg-white/15"
            aria-label="Ver todas as ofertas relâmpago"
          >
            <span aria-hidden>›</span>
          </Link>
        </div>
      </div>

      <div className={`${carouselScrollClass} mt-3`}>
        {deals.map((product) => (
          <FlashSaleCarouselCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
