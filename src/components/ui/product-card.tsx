"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { calculatePixPrice, formatCurrency } from "@/lib/catalog";
import { isFlashSaleActive } from "@/lib/flash-sale";
import type { Product } from "@/lib/types";
import { ProductCardMedia } from "@/components/ui/product-card-media";
import { FavoriteButton } from "@/components/ui/store-buttons";

export function ProductCard({
  product,
  compact = false,
  onBeforeProductNavigate,
}: {
  product: Product;
  compact?: boolean;
  /** Chamado ao ir para a PDP pela imagem ou nome (ex.: fechar modal). */
  onBeforeProductNavigate?: () => void;
}) {
  const router = useRouter();
  const pixPrice = calculatePixPrice(product);
  const productHref = `/produto/${product.slug}`;

  function handleNavigateToPdp(e: MouseEvent<HTMLAnchorElement>) {
    if (!onBeforeProductNavigate) return;
    e.preventDefault();
    onBeforeProductNavigate();
    router.push(productHref, { scroll: true });
  }
  const inFlashSale = isFlashSaleActive(product);
  const hasDiscount =
    product.originalPrice != null && product.originalPrice > product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)
    : 0;

  return (
    <article
      className={`product-card-root premium-card group flex h-full min-w-0 touch-pan-y flex-col overflow-hidden rounded-[1.25rem] transition duration-300 hover:border-[rgba(201,151,40,0.55)] hover:shadow-[0_28px_80px_rgba(10,10,10,0.12)] ${
        compact ? "hover:-translate-y-0" : "hover:-translate-y-1"
      }`}
    >
      <div
        className={`product-card-media-wrap block ${compact ? "p-1" : "p-2 sm:p-4"}`}
      >
        <ProductCardMedia
          product={product}
          href={productHref}
          compact={compact}
          onNavigateToPdp={onBeforeProductNavigate ? handleNavigateToPdp : undefined}
        />
      </div>
      <div
        className={`product-card-body flex flex-1 flex-col ${compact ? "p-2 pt-1" : "p-2 pt-1 sm:p-5 sm:pt-2"}`}
      >
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          <div className="min-w-0">
            <p
              className={`hidden text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)] sm:block sm:text-xs sm:tracking-[0.22em] ${
                compact ? "sm:hidden" : ""
              }`}
            >
              {product.category}
            </p>
            <Link
              href={productHref}
              scroll
              onClick={onBeforeProductNavigate ? handleNavigateToPdp : undefined}
              className={`product-card-title mt-1 block touch-pan-y line-clamp-2 font-bold text-[var(--color-ink)] sm:mt-2 ${
                compact
                  ? "text-xs leading-snug sm:text-sm"
                  : "text-sm leading-5 sm:text-lg"
              }`}
            >
              {product.name}
            </Link>
          </div>
          <div className={`hidden sm:block ${compact ? "!hidden" : ""}`}>
            <FavoriteButton productId={product.id} />
          </div>
        </div>
        <p
          className={`mt-3 hidden text-sm leading-6 text-[var(--color-muted)] sm:block ${
            compact ? "!hidden" : ""
          }`}
        >
          {product.shortDescription}
        </p>
        <div
          className={`mt-4 hidden items-center gap-2 text-sm text-[var(--color-muted)] sm:flex ${
            compact ? "!hidden" : ""
          }`}
        >
          <span>{product.rating.toFixed(1)} estrelas</span>
          <span className="h-1 w-1 rounded-full bg-[var(--color-muted)]" />
          <span>{product.reviews} avaliacoes</span>
        </div>
        <div
          className={`product-card-pricing ${compact ? "mt-2" : "mt-3 sm:mt-5"}`}
        >
          {inFlashSale ? (
            <div
              className={`product-card-flash-block rounded-3xl bg-[#fffaf0] ${compact ? "px-2.5 py-2" : "px-4 py-3"}`}
            >
              {hasDiscount ? (
                <p className="text-xs text-[var(--color-ink)] line-through">
                  {formatCurrency(product.originalPrice!)}
                </p>
              ) : null}
              <div className="flex min-w-0 flex-wrap items-end gap-2">
                <p
                  className={`product-card-price min-w-0 font-black leading-tight tracking-tight text-[var(--color-ink)] ${
                    compact ? "text-base" : "text-xl sm:text-2xl lg:text-3xl"
                  }`}
                >
                  {formatCurrency(product.price)}
                </p>
                {hasDiscount && discountPercent > 0 ? (
                  <span className="mb-1 shrink-0 rounded-sm bg-[#ffd61f] px-1.5 py-0.5 text-[10px] font-black text-[var(--color-ink)]">
                    {discountPercent}% off
                  </span>
                ) : null}
              </div>
              <p
                className={`product-card-pix font-bold text-[var(--color-success)] ${compact ? "mt-0.5 text-[11px]" : "mt-1 text-xs sm:text-sm"}`}
              >
                Pix {formatCurrency(pixPrice)}
              </p>
              <p
                className={`product-card-installments text-[var(--color-muted)] ${compact ? "mt-0.5 text-[11px] leading-tight" : "mt-1 text-sm"}`}
              >
                ou {product.installment.quantity}x de{" "}
                {formatCurrency(product.installment.amount)} sem juros
              </p>
            </div>
          ) : (
            <>
              {product.originalPrice ? (
                <p
                  className={`hidden text-sm text-[var(--color-muted)] line-through sm:block ${
                    compact ? "!hidden" : ""
                  }`}
                >
                  {formatCurrency(product.originalPrice)}
                </p>
              ) : null}
              <p
                className={`product-card-price min-w-0 font-black leading-tight tracking-tight text-[var(--color-ink)] ${
                  compact ? "text-sm sm:text-base" : "text-lg sm:text-2xl lg:text-3xl"
                }`}
              >
                {formatCurrency(product.price)}
              </p>
              <p
                className={`product-card-pix mt-1 font-bold text-[var(--color-success)] ${
                  compact
                    ? "text-[11px]"
                    : "text-xs sm:text-sm"
                }`}
              >
                Pix {formatCurrency(pixPrice)}
              </p>
              <p
                className={`product-card-installments mt-1 hidden text-sm text-[var(--color-muted)] sm:block ${
                  compact ? "!hidden" : ""
                }`}
              >
                ou {product.installment.quantity}x de{" "}
                {formatCurrency(product.installment.amount)} sem juros
              </p>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
