"use client";

import { usePathname } from "next/navigation";
import { useStore } from "@/components/store/store-provider";
import { formatCurrency } from "@/lib/catalog";

const FREE_SHIPPING_TARGET = 149;

export function FreeShippingBar() {
  const pathname = usePathname();
  const { subtotal } = useStore();
  if (pathname?.startsWith("/conta") || pathname?.startsWith("/admin")) {
    return null;
  }
  const compactCheckout = pathname?.startsWith("/checkout") ?? false;
  const progress = Math.min(100, (subtotal / FREE_SHIPPING_TARGET) * 100);
  const remaining = Math.max(0, FREE_SHIPPING_TARGET - subtotal);
  const reached = remaining <= 0;

  return (
    <section
      data-free-shipping-bar
      className="sticky top-0 z-30 border-y border-[var(--color-line)] bg-white/95 backdrop-blur-sm"
    >
      <div
        className={
          compactCheckout
            ? "mx-auto flex w-full max-w-7xl flex-col gap-1 px-4 py-1 sm:px-6 lg:gap-2 lg:px-8 lg:py-2"
            : "mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-2 sm:px-6 lg:px-8"
        }
      >
        <div
          className={
            compactCheckout
              ? "flex min-w-0 items-center gap-2 text-[11px] font-semibold sm:text-xs lg:justify-between lg:text-sm"
              : "flex items-center justify-between gap-3 text-xs font-semibold sm:text-sm"
          }
        >
          <p
            className={
              compactCheckout
                ? "min-w-0 flex-1 truncate text-[var(--color-ink)]"
                : "text-[var(--color-ink)]"
            }
          >
            {reached
              ? "Voce ganhou frete gratis para este pedido."
              : `Faltam ${formatCurrency(remaining)} para liberar frete gratis.`}
          </p>
          <span
            className={
              compactCheckout
                ? "shrink-0 whitespace-nowrap text-[var(--color-primary)]"
                : "text-[var(--color-primary)]"
            }
          >
            {formatCurrency(subtotal)} / {formatCurrency(FREE_SHIPPING_TARGET)}
          </span>
        </div>
        <div
          className={
            compactCheckout
              ? "h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-soft)] lg:h-2"
              : "h-2 w-full overflow-hidden rounded-full bg-[var(--color-soft)]"
          }
        >
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-primary),var(--color-accent))] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </section>
  );
}
