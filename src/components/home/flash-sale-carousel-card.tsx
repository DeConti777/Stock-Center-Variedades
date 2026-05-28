import Image from "next/image";
import Link from "next/link";
import { formatCurrency, getProductImageUrl } from "@/lib/catalog";
import { getFlashSaleDisplayPercent } from "@/lib/flash-sale";
import type { Product } from "@/lib/types";

function LightningGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
    </svg>
  );
}

export function FlashSaleCarouselCard({ product }: { product: Product }) {
  const href = `/produto/${product.slug}`;
  const imageSrc = getProductImageUrl(product, 0);
  const off = getFlashSaleDisplayPercent(product);
  const hasOldPrice =
    product.originalPrice != null && product.originalPrice > product.price;

  return (
    <Link
      href={href}
      className="group relative flex w-[9.25rem] shrink-0 snap-start flex-col sm:w-[10.5rem]"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[0.875rem] bg-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
        {imageSrc.startsWith("/") ? (
          <Image
            src={imageSrc}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            sizes="148px"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageSrc}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        )}

        {off > 0 ? (
          <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-0.5 rounded-full bg-[#ffd61f] px-1.5 py-0.5 text-[10px] font-black leading-none text-[var(--color-ink)] shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
            <LightningGlyph className="text-[var(--color-ink)]" />
            -{off}%
          </span>
        ) : null}

        <div className="absolute inset-x-1.5 bottom-1.5 rounded-[0.625rem] bg-white px-2 py-1.5 shadow-[0_4px_14px_rgba(0,0,0,0.12)]">
          {hasOldPrice ? (
            <p className="text-[10px] leading-tight text-[var(--color-muted)] line-through">
              {formatCurrency(product.originalPrice!)}
            </p>
          ) : (
            <p className="text-[10px] leading-tight text-transparent" aria-hidden>
              —
            </p>
          )}
          <p className="text-sm font-black leading-tight text-[#e10e2f]">
            {formatCurrency(product.price)}
          </p>
        </div>
      </div>
    </Link>
  );
}
