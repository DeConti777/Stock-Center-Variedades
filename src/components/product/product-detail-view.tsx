"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { TouchEvent } from "react";
import {
  AddToCartButton,
  AddToCartSecondaryButton,
  FavoriteButton,
} from "@/components/ui/store-buttons";
import { ProductRelatedShelf } from "@/components/product/product-related-shelf";
import { useStore } from "@/components/store/store-provider";
import { calculatePixPrice, formatCurrency } from "@/lib/catalog";
import { getFlashSaleDisplayPercent, isFlashSaleActive } from "@/lib/flash-sale";
import { formatCepDisplay, onlyDigits } from "@/lib/br-fields";
import {
  buildProductDisplayImages,
  getProductHeroSrc,
  isProductMediaUrl,
} from "@/lib/product-media";
import { isLikelyMobileViewport, trackEcommerceEvent } from "@/lib/analytics";
import type { Product } from "@/lib/types";

export type ProductReview = {
  id: string;
  rating: number;
  comment: string | null;
  images: string[];
  reviewerName: string;
  createdAt: string;
};

function ReviewImageLightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

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

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Foto da avaliacao ampliada"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-5xl rounded-[1.75rem] border border-white/15 bg-[#0b0b0b] p-3 shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-[2] flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-sm font-bold text-white hover:bg-black/70"
          aria-label="Fechar foto"
        >
          ×
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="mx-auto max-h-[85vh] w-auto max-w-full rounded-[1.25rem] object-contain" />
      </div>
    </div>
  );
}

function initialImageIndex(product: Product, displayImages: string[]) {
  const hero = getProductHeroSrc(product);
  if (hero) {
    const i = displayImages.indexOf(hero);
    return i >= 0 ? i : 0;
  }
  return 0;
}

export function ProductDetailView({
  product,
  customerReviews,
}: {
  product: Product;
  customerReviews: ProductReview[];
}) {
  const { markProductVisited } = useStore();
  const displayImages = useMemo(
    () => buildProductDisplayImages(product),
    [product],
  );
  const [activeIndex, setActiveIndex] = useState(() =>
    initialImageIndex(product, buildProductDisplayImages(product)),
  );

  useEffect(() => {
    const imgs = buildProductDisplayImages(product);
    setActiveIndex(initialImageIndex(product, imgs));
  }, [product]);

  useEffect(() => {
    const n = displayImages.length;
    if (n === 0) return;
    setActiveIndex((i) => (i >= n ? n - 1 : i));
  }, [displayImages.length]);

  useEffect(() => {
    markProductVisited(product.id);
  }, [markProductVisited, product.id]);

  useEffect(() => {
    trackEcommerceEvent("view_item", {
      product_id: product.id,
      category: product.category,
      price: product.price,
      is_mobile: isLikelyMobileViewport(),
    });
  }, [product.category, product.id, product.price]);

  const safeIndex =
    displayImages.length === 0
      ? 0
      : Math.min(activeIndex, Math.max(0, displayImages.length - 1));
  const selectedImage = displayImages[safeIndex] ?? "";
  const pixPrice = calculatePixPrice(product);
  const inFlashSale = isFlashSaleActive(product);
  const flashOffPercent = inFlashSale ? getFlashSaleDisplayPercent(product) : 0;
  const [priceInt, priceDec] = product.price.toFixed(2).split(".");
  const accent = displayImages[1] ?? displayImages[0] ?? "#e2e8f0";
  const thumbBg = displayImages[2] ?? accent;
  const imageCount = displayImages.length;
  const canNavigate = imageCount > 1;

  const [freightTab, setFreightTab] = useState<"info" | "frete">("info");
  const [freightCep, setFreightCep] = useState("");
  const [freightBusy, setFreightBusy] = useState(false);
  const [freightError, setFreightError] = useState<string | null>(null);
  const [freightPrice, setFreightPrice] = useState<number | null>(null);
  const [freightDeliveryDays, setFreightDeliveryDays] = useState<number | null>(null);
  const [reviewLightbox, setReviewLightbox] = useState<null | { src: string; alt: string }>(null);
  const [flashSaleRemainMs, setFlashSaleRemainMs] = useState(0);

  useEffect(() => {
    if (!inFlashSale || !product.flashSaleEndsAt) return;
    const endMs = new Date(product.flashSaleEndsAt).getTime();
    const tick = () => setFlashSaleRemainMs(Math.max(0, endMs - Date.now()));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [inFlashSale, product.flashSaleEndsAt]);

  const flashH = String(Math.floor(flashSaleRemainMs / 3_600_000)).padStart(2, "0");
  const flashM = String(Math.floor((flashSaleRemainMs % 3_600_000) / 60_000)).padStart(2, "0");
  const flashS = String(Math.floor((flashSaleRemainMs % 60_000) / 1000)).padStart(2, "0");

  function goPrev() {
    if (!canNavigate) return;
    setActiveIndex((i) => (i - 1 + imageCount) % imageCount);
  }

  function goNext() {
    if (!canNavigate) return;
    setActiveIndex((i) => (i + 1) % imageCount);
  }

  const carouselTouchRef = useRef<{ x: number; y: number } | null>(null);
  const carouselGestureAxisRef = useRef<"horizontal" | "vertical" | null>(null);

  function handleCarouselTouchStart(e: TouchEvent<HTMLDivElement>) {
    if (!canNavigate) return;
    const t = e.touches[0];
    if (!t) return;
    carouselTouchRef.current = { x: t.clientX, y: t.clientY };
    carouselGestureAxisRef.current = null;
  }

  function handleCarouselTouchMove(e: TouchEvent<HTMLDivElement>) {
    const start = carouselTouchRef.current;
    const t = e.touches[0];
    if (!start || !t || carouselGestureAxisRef.current) return;
    const dx = Math.abs(t.clientX - start.x);
    const dy = Math.abs(t.clientY - start.y);
    const threshold = 10;
    if (dx > threshold || dy > threshold) {
      carouselGestureAxisRef.current = dx > dy ? "horizontal" : "vertical";
    }
  }

  function handleCarouselTouchEnd(e: TouchEvent<HTMLDivElement>) {
    if (!canNavigate || !carouselTouchRef.current) return;
    const t = e.changedTouches[0];
    if (!t) {
      carouselTouchRef.current = null;
      carouselGestureAxisRef.current = null;
      return;
    }
    const start = carouselTouchRef.current;
    const axis = carouselGestureAxisRef.current;
    carouselTouchRef.current = null;
    carouselGestureAxisRef.current = null;
    if (axis === "vertical") return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dy) > Math.abs(dx)) return;
    const threshold = 45;
    if (dx > threshold) goPrev();
    else if (dx < -threshold) goNext();
  }

  return (
    <div className="space-y-10 sm:space-y-16">
      {reviewLightbox ? (
        <ReviewImageLightbox
          src={reviewLightbox.src}
          alt={reviewLightbox.alt}
          onClose={() => setReviewLightbox(null)}
        />
      ) : null}
      <section className="grid gap-4 sm:gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <div
            className={`relative mx-auto flex aspect-square w-full touch-pan-y items-stretch overflow-hidden rounded-[1.5rem] p-0 shadow-[0_30px_90px_rgba(15,23,42,0.1)] sm:mx-0 sm:max-h-none sm:rounded-[2.5rem] sm:p-6 ${
              isProductMediaUrl(selectedImage) ? "bg-[var(--color-soft)]" : ""
            }`}
            style={
              isProductMediaUrl(selectedImage)
                ? undefined
                : {
                    background: `linear-gradient(145deg, ${selectedImage}, ${accent})`,
                  }
            }
            onTouchStart={handleCarouselTouchStart}
            onTouchMove={handleCarouselTouchMove}
            onTouchEnd={handleCarouselTouchEnd}
            onTouchCancel={handleCarouselTouchEnd}
          >
            {isProductMediaUrl(selectedImage) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedImage}
                alt=""
                className="absolute inset-0 h-full w-full object-cover sm:inset-6 sm:h-[calc(100%-3rem)] sm:w-[calc(100%-3rem)] sm:rounded-[2rem] sm:object-contain"
              />
            ) : (
              <div className="w-full rounded-[2rem] border border-white/40 bg-white/15 p-6 backdrop-blur-md">
                <div className="h-72 rounded-[1.5rem] border border-white/50 bg-white/30" />
              </div>
            )}
            <div className="absolute right-3 top-3 z-[3] sm:right-6 sm:top-6">
              <FavoriteButton productId={product.id} />
            </div>
            {canNavigate ? (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  aria-label="Imagem anterior"
                  className="absolute left-3 top-1/2 z-[2] hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--color-line)] bg-white/95 text-[var(--color-ink)] shadow-md backdrop-blur-sm transition hover:bg-white hover:shadow-lg sm:flex"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
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
                  className="absolute right-3 top-1/2 z-[2] hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--color-line)] bg-white/95 text-[var(--color-ink)] shadow-md backdrop-blur-sm transition hover:bg-white hover:shadow-lg sm:flex"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M10 6l6 6-6 6"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <p className="absolute bottom-3 left-1/2 z-[2] -translate-x-1/2 rounded-full bg-black/45 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                  {safeIndex + 1} / {imageCount}
                </p>
              </>
            ) : null}
          </div>
          <div className="hidden grid-cols-3 gap-3 sm:grid">
            {displayImages.map((image, idx) => (
              <button
                key={`${idx}-${image}`}
                type="button"
                onClick={() => setActiveIndex(idx)}
                className={`relative aspect-square overflow-hidden rounded-[1.5rem] border p-0.5 ${
                  idx === safeIndex
                    ? "border-[var(--color-primary)]"
                    : "border-[var(--color-line)]"
                }`}
                style={
                  isProductMediaUrl(image)
                    ? undefined
                    : { background: `linear-gradient(145deg, ${image}, ${thumbBg})` }
                }
              >
                {isProductMediaUrl(image) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={image}
                    alt=""
                    className="h-full w-full rounded-[1.25rem] object-cover"
                  />
                ) : (
                  <div className="h-full rounded-[1.2rem] border border-white/50 bg-white/30" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[2.5rem] border border-[var(--color-line)] bg-white p-6 shadow-[0_25px_70px_rgba(15,23,42,0.08)] sm:p-8">
          <div className="hidden items-start justify-between gap-4 sm:flex">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--color-primary)]">
                {product.category}
              </p>
              <h1 className="mt-3 font-display text-4xl font-black tracking-tight text-[var(--color-ink)]">
                {product.name}
              </h1>
            </div>
          </div>

          <div className="mt-5 hidden flex-wrap items-center gap-3 text-sm text-[var(--color-muted)] sm:flex">
            <span>{product.rating.toFixed(1)} de 5</span>
            <span className="h-1 w-1 rounded-full bg-[var(--color-muted)]" />
            <span>{product.reviews} avaliacoes</span>
            <span className="h-1 w-1 rounded-full bg-[var(--color-muted)]" />
            <span>SKU {product.sku}</span>
          </div>

          <div className="mt-0 sm:mt-3">
            {inFlashSale ? (
              <div className="-mx-4 w-[calc(100%+2rem)] overflow-hidden rounded-[0.35rem] border-2 border-[#d49f00] bg-[#ffd61f]">
                <div className="flex min-h-[1.95rem] items-center justify-between gap-2 px-2.5 py-1">
                  <span className="text-[10.5px] font-black uppercase leading-none tracking-[0.04em] text-[var(--color-ink)]">
                    Oferta Relampago
                  </span>
                  <div className="inline-flex items-center gap-1">
                    <span className="text-[10px] font-semibold leading-none text-[var(--color-ink)]">
                      Encerra em
                    </span>
                    <span className="rounded-[4px] bg-[#df0030] px-[6px] py-[3px] font-mono text-[10px] font-black leading-none text-[#ffd61f]">
                      {flashH}
                    </span>
                    <span className="rounded-[4px] bg-[#df0030] px-[6px] py-[3px] font-mono text-[10px] font-black leading-none text-[#ffd61f]">
                      {flashM}
                    </span>
                    <span className="rounded-[4px] bg-[#df0030] px-[6px] py-[3px] font-mono text-[10px] font-black leading-none text-[#ffd61f]">
                      {flashS}
                    </span>
                  </div>
                </div>

                <div className="border-t-2 border-[#d49f00] bg-[#fff9e4] px-2.5 py-1.5">
                  {product.originalPrice ? (
                    <p className="text-[13px] font-medium leading-none text-[#9a9a9a] line-through decoration-[1px]">
                      {formatCurrency(product.originalPrice)}
                    </p>
                  ) : null}
                  <div className="mt-[2px] flex items-end gap-1.5">
                    <p className="text-[2.35rem] font-black leading-[0.93] tracking-tight text-[var(--color-ink)]">
                      <span className="mr-1 text-[0.46em]">R$</span>
                      {priceInt}
                      <span className="text-[0.72em]">,{priceDec}</span>
                    </p>
                    {flashOffPercent > 0 ? (
                      <span className="mb-[4px] rounded-[3px] border border-[#e0b300] bg-[#ffd61f] px-1.5 py-[2px] text-[11px] font-black uppercase leading-none text-[var(--color-ink)]">
                        {flashOffPercent}% OFF
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-[2rem] bg-[var(--color-soft)] p-5">
                {product.originalPrice ? (
                  <p className="text-base text-[var(--color-muted)] line-through">
                    {formatCurrency(product.originalPrice)}
                  </p>
                ) : null}
                <p className="mt-1 text-5xl font-black tracking-tight text-[var(--color-ink)]">
                  {formatCurrency(product.price)}
                </p>
                <p className="mt-2 text-base font-semibold text-[var(--color-success)]">
                  no Pix por {formatCurrency(pixPrice)} com {product.pixDiscountPercent}% off
                </p>
                <p className="mt-2 text-sm text-[var(--color-muted)]">
                  ou {product.installment.quantity}x de{" "}
                  {formatCurrency(product.installment.amount)} sem juros
                </p>
              </div>
            )}
            {inFlashSale ? (
              <>
                <p className="mt-2 text-base font-semibold text-[var(--color-success)]">
                  no Pix por {formatCurrency(pixPrice)} com {product.pixDiscountPercent}% off
                </p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  ou {product.installment.quantity}x de{" "}
                  {formatCurrency(product.installment.amount)} sem juros
                </p>
              </>
            ) : null}
          </div>

          <p className="mt-6 text-base leading-7 text-[var(--color-muted)]">
            {product.description}
          </p>

          <ul className="mt-6 space-y-3">
            {product.features.map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-3 text-sm leading-6 text-[var(--color-ink)]"
              >
                <span className="mt-2 inline-flex h-2 w-2 rounded-full bg-[var(--color-primary)]" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <AddToCartButton productId={product.id} />
            <AddToCartSecondaryButton productId={product.id} />
          </div>

          <div className="mt-8 rounded-[2rem] border border-[var(--color-line)] p-5">
            <div className="grid grid-cols-2 gap-2 border-b border-[var(--color-line)] pb-3">
              <button
                type="button"
                onClick={() => setFreightTab("info")}
                className={`min-w-0 rounded-full px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wide sm:text-xs ${
                  freightTab === "info"
                    ? "bg-[var(--color-primary)] text-white"
                    : "bg-[var(--color-soft)] text-[var(--color-ink)]"
                }`}
              >
                Resumo
              </button>
              <button
                type="button"
                onClick={() => setFreightTab("frete")}
                className={`min-w-0 rounded-full px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wide sm:text-xs ${
                  freightTab === "frete"
                    ? "bg-[var(--color-primary)] text-white"
                    : "bg-[var(--color-soft)] text-[var(--color-ink)]"
                }`}
              >
                Calcular frete
              </button>
            </div>

            {freightTab === "info" ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
                    Estoque
                  </p>
                  <p className="mt-2 font-bold text-[var(--color-ink)]">{product.stock} unidades</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
                    Frete
                  </p>
                  <p className="mt-2 font-bold text-[var(--color-ink)]">
                    Cotacao no carrinho ou na aba ao lado
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
                    Garantia
                  </p>
                  <p className="mt-2 font-bold text-[var(--color-ink)]">Compra segura</p>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <p className="text-sm text-[var(--color-muted)]">
                  Simule o frete para 1 unidade (medidas da embalagem cadastradas no admin, ou padrao
                  da loja).
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    inputMode="numeric"
                    value={formatCepDisplay(freightCep)}
                    onChange={(e) => {
                      setFreightCep(onlyDigits(e.target.value, 8));
                      setFreightError(null);
                    }}
                    placeholder="00000-000"
                    className="w-full rounded-2xl border border-[var(--color-line)] px-4 py-3 text-sm outline-none sm:max-w-[220px]"
                  />
                  <button
                    type="button"
                    disabled={freightBusy || onlyDigits(freightCep, 8).length !== 8}
                    onClick={() => {
                      const digits = onlyDigits(freightCep, 8);
                      if (digits.length !== 8) {
                        setFreightError("Informe o CEP com 8 digitos.");
                        return;
                      }
                      setFreightBusy(true);
                      setFreightError(null);
                      setFreightPrice(null);
                      setFreightDeliveryDays(null);
                      void (async () => {
                        try {
                          const res = await fetch("/api/shipping/quote", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              cep: digits,
                              items: [{ productId: product.id, quantity: 1 }],
                            }),
                          });
                          const data = (await res.json()) as {
                            shippingReais?: number;
                            deliveryDays?: number;
                            quoteSource?: string;
                            error?: string;
                          };
                          if (!res.ok) {
                            setFreightError(data.error || "Nao foi possivel cotar.");
                            return;
                          }
                          if (typeof data.shippingReais !== "number") {
                            setFreightError("Resposta invalida do servidor.");
                            return;
                          }
                          setFreightPrice(data.shippingReais);
                          setFreightDeliveryDays(
                            typeof data.deliveryDays === "number" && data.deliveryDays > 0
                              ? data.deliveryDays
                              : null,
                          );
                        } catch {
                          setFreightError("Erro de rede. Tente de novo.");
                        } finally {
                          setFreightBusy(false);
                        }
                      })();
                    }}
                    className="rounded-2xl bg-[var(--color-primary)] px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
                  >
                    {freightBusy ? "Calculando..." : "Calcular"}
                  </button>
                </div>
                {freightError ? (
                  <p className="text-sm text-red-600">{freightError}</p>
                ) : null}
                {freightPrice != null ? (
                  <div className="rounded-2xl bg-[var(--color-soft)] p-4">
                    <p className="text-sm font-semibold text-[var(--color-ink)]">
                      Frete estimado: {formatCurrency(freightPrice)} (1 un.)
                    </p>
                    {freightDeliveryDays != null ? (
                      <p className="mt-1 text-xs text-[var(--color-muted)]">
                        Prazo estimado: até {freightDeliveryDays} dia(s) útil(is)
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </section>

      <section>
        <div className="rounded-[2rem] border border-[var(--color-line)] bg-white p-6">
          <h2 className="font-display text-2xl font-bold text-[var(--color-ink)]">
            Avaliacoes de clientes
          </h2>
          {customerReviews.length ? (
            <div className="mt-6 space-y-5">
              {customerReviews.map((review) => (
                <article key={review.id} className="rounded-[1.6rem] bg-[var(--color-soft)] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[var(--color-ink)]">{review.reviewerName}</p>
                    <span className="text-xs text-[var(--color-muted)]">
                      {new Date(review.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5" aria-label={`Nota ${review.rating} de 5`}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span
                        key={`${review.id}-${n}`}
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-lg ${
                          review.rating >= n
                            ? "bg-[color-mix(in_srgb,var(--color-accent)_14%,white)] text-[var(--color-accent)]"
                            : "bg-white text-[#c9c2b5]"
                        }`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  {review.comment?.trim() ? (
                    <p className="mt-3 text-base leading-7 text-[var(--color-ink)]">&quot;{review.comment}&quot;</p>
                  ) : null}
                  {review.images.length ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {review.images.map((url) => (
                        <button
                          key={url}
                          type="button"
                          onClick={() =>
                            setReviewLightbox({
                              src: url,
                              alt: `Foto enviada por ${review.reviewerName} na avaliacao deste produto`,
                            })
                          }
                          className="group relative block h-16 w-16 overflow-hidden rounded-xl border border-[var(--color-line)] bg-white text-left transition hover:scale-[1.03] hover:shadow-sm"
                          aria-label="Ampliar foto da avaliacao"
                          title="Clique para ampliar"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="" className="h-full w-full object-cover" />
                          <span className="pointer-events-none absolute inset-0 hidden items-center justify-center bg-black/35 text-[10px] font-semibold text-white group-hover:flex">
                            Ampliar
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-[var(--color-muted)]">
              Ainda nao ha avaliacoes para este produto. Seja o primeiro comprador a avaliar.
            </p>
          )}
        </div>
      </section>

      <ProductRelatedShelf productId={product.id} />
    </div>
  );
}
