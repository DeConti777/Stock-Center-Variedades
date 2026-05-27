"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type TouchEvent,
} from "react";
import {
  buildProductDisplayImages,
  isProductMediaUrl,
} from "@/lib/product-media";
import type { Product } from "@/lib/types";

type ProductCardMediaProps = {
  product: Product;
  href: string;
  /** Imagem mais baixa (ex.: carrossel no modal de carrinho). */
  compact?: boolean;
  /** Navegação programática (ex.: fechar modal + router.push sem perder o clique). */
  onNavigateToPdp?: (e: MouseEvent<HTMLAnchorElement>) => void;
};

export function ProductCardMedia({
  product,
  href,
  compact = false,
  onNavigateToPdp,
}: ProductCardMediaProps) {
  const displayImages = useMemo(
    () => buildProductDisplayImages(product),
    [product],
  );
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [product.id]);

  const n = displayImages.length;
  const safeIndex = n === 0 ? 0 : Math.min(activeIndex, n - 1);
  const selectedImage = displayImages[safeIndex] ?? "#e2e8f0";
  const accent = displayImages[1] ?? displayImages[0] ?? "#e2e8f0";
  const canNavigate = n > 1;
  const pdpTouchStartRef = useRef<{ x: number; y: number } | null>(null);
  const pdpTouchMovedRef = useRef(false);

  function handlePdpTouchStart(event: TouchEvent<HTMLAnchorElement>) {
    const touch = event.touches[0];
    if (!touch) return;
    pdpTouchStartRef.current = { x: touch.clientX, y: touch.clientY };
    pdpTouchMovedRef.current = false;
  }

  function handlePdpTouchMove(event: TouchEvent<HTMLAnchorElement>) {
    const start = pdpTouchStartRef.current;
    const touch = event.touches[0];
    if (!start || !touch) return;
    const dx = Math.abs(touch.clientX - start.x);
    const dy = Math.abs(touch.clientY - start.y);
    const threshold = 10;
    if (
      (dx > dy && dx > threshold) ||
      (dy > dx && dy > threshold)
    ) {
      pdpTouchMovedRef.current = true;
    }
  }

  function handlePdpTouchEnd() {
    pdpTouchStartRef.current = null;
  }

  function handlePdpClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!pdpTouchMovedRef.current) return;
    pdpTouchMovedRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  }

  function goPrev(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (!canNavigate) return;
    setActiveIndex((i) => (i - 1 + n) % n);
  }

  function goNext(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (!canNavigate) return;
    setActiveIndex((i) => (i + 1) % n);
  }

  return (
    <div
      className={`product-card-media group relative flex items-end overflow-hidden rounded-[1rem] border border-[rgba(201,151,40,0.18)] bg-[var(--color-soft)] ${
        compact ? "aspect-[3/2] p-2" : "aspect-square p-4"
      }`}
    >
      {n === 0 ? null : isProductMediaUrl(selectedImage) ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={selectedImage}
            alt=""
            draggable={false}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
          <div className="product-card-media-gradient absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.02),rgba(0,0,0,0.22))]" />
        </>
      ) : (
        <>
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(145deg, ${selectedImage}, ${accent})`,
            }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.28))]" />
          <div
            className={`absolute inset-x-6 rounded-[1rem] border border-white/50 bg-white/20 backdrop-blur-sm ${
              compact ? "bottom-4 p-2" : "bottom-6 p-4"
            }`}
          >
            <div
              className={`rounded-[0.75rem] border border-white/60 bg-white/40 shadow-inner ${
                compact ? "h-14" : "h-28"
              }`}
            />
          </div>
        </>
      )}

      {product.badge ? (
        <span className="absolute left-2 top-2 z-[1] max-w-[75%] truncate rounded-full bg-[var(--color-accent)] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-[var(--color-ink)] shadow-[var(--shadow-gold)] sm:left-4 sm:top-4 sm:max-w-none sm:px-3 sm:py-1 sm:text-xs sm:tracking-[0.14em]">
          {product.badge}
        </span>
      ) : null}

      {canNavigate ? (
        <>
          <button
            type="button"
            onClick={goPrev}
            aria-label="Imagem anterior"
            className="absolute left-1.5 top-1/2 z-[2] hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--color-line)] bg-white/95 text-[var(--color-ink)] shadow-md backdrop-blur-sm transition-opacity duration-200 hover:bg-white hover:shadow-lg sm:left-2 sm:flex sm:h-11 sm:w-11 sm:opacity-0 sm:pointer-events-none sm:group-hover:pointer-events-auto sm:group-hover:opacity-100"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M14 6L8 12l6 6"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="Proxima imagem"
            className="absolute right-1.5 top-1/2 z-[2] hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--color-line)] bg-white/95 text-[var(--color-ink)] shadow-md backdrop-blur-sm transition-opacity duration-200 hover:bg-white hover:shadow-lg sm:right-2 sm:flex sm:h-11 sm:w-11 sm:opacity-0 sm:pointer-events-none sm:group-hover:pointer-events-auto sm:group-hover:opacity-100"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M10 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <p className="absolute bottom-2 left-1/2 z-[2] hidden -translate-x-1/2 rounded-full bg-black/45 px-2.5 py-0.5 text-xs font-semibold text-white backdrop-blur-sm sm:block sm:opacity-0 sm:transition-opacity sm:duration-200 sm:group-hover:opacity-100">
            {safeIndex + 1} / {n}
          </p>
        </>
      ) : null}

      <Link
        href={href}
        scroll
        aria-label={`Ver produto ${product.name}`}
        className="absolute inset-0 z-[1] cursor-pointer rounded-[1rem]"
        onClick={(event) => {
          handlePdpClick(event);
          if (event.defaultPrevented) return;
          onNavigateToPdp?.(event);
        }}
        onTouchStart={handlePdpTouchStart}
        onTouchMove={handlePdpTouchMove}
        onTouchEnd={handlePdpTouchEnd}
        onTouchCancel={handlePdpTouchEnd}
      />
    </div>
  );
}
