"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/components/store/store-provider";
import { isLikelyMobileViewport, trackEcommerceEvent } from "@/lib/analytics";

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      className={filled ? "text-red-600" : "text-[var(--color-muted)]"}
      aria-hidden
    >
      <path
        d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5A5.5 5.5 0 0 0 19 14z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={filled ? 0 : 2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FavoriteButton({ productId }: { productId: string }) {
  const { isFavorite, toggleFavorite } = useStore();
  const active = isFavorite(productId);

  return (
    <button
      type="button"
      onClick={() => toggleFavorite(productId)}
      aria-label={active ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-colors ${
        active
          ? "border-red-200 bg-white text-red-600 shadow-sm hover:border-red-300 hover:bg-red-50"
          : "border-[var(--color-line)] bg-white hover:border-[var(--color-primary)] hover:bg-[var(--color-soft)]"
      }`}
    >
      <HeartIcon filled={active} />
    </button>
  );
}

export function AddToCartButton({
  productId,
  quantity = 1,
  source = "buy_now",
}: {
  productId: string;
  quantity?: number;
  source?: string;
}) {
  const { addToCart } = useStore();
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        addToCart(productId, quantity, { suppressAddToCartModal: true });
        trackEcommerceEvent("add_to_cart", {
          product_id: productId,
          quantity,
          source,
          is_mobile: isLikelyMobileViewport(),
          checkout_path: "direct_checkout",
        });
        router.push("/checkout");
      }}
      className="inline-flex items-center justify-center rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm font-black text-[var(--color-ink)] shadow-[var(--shadow-gold)] transition-transform duration-200 hover:-translate-y-0.5 hover:bg-white"
    >
      Comprar agora
    </button>
  );
}

function CartPlusIcon({ className }: { className?: string }) {
  return (
    <span className={`relative inline-flex shrink-0 ${className ?? ""}`} aria-hidden>
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        className="text-[var(--color-ink)]"
      >
        <circle cx="9" cy="21" r="1" fill="currentColor" stroke="currentColor" />
        <circle cx="20" cy="21" r="1" fill="currentColor" stroke="currentColor" />
        <path
          d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="absolute -right-0.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-primary)] px-0.5 text-[10px] font-black leading-none text-white">
        +
      </span>
    </span>
  );
}

/** Adiciona ao carrinho sem sair da pagina (ex.: PDP, catalogo). */
export function AddToCartSecondaryButton({
  productId,
  quantity = 1,
  source = "add_to_cart_secondary",
}: {
  productId: string;
  quantity?: number;
  source?: string;
}) {
  const { addToCart } = useStore();

  return (
    <button
      type="button"
      onClick={() => {
        addToCart(productId, quantity);
        trackEcommerceEvent("add_to_cart", {
          product_id: productId,
          quantity,
          source,
          is_mobile: isLikelyMobileViewport(),
          checkout_path: "stay_on_page",
        });
      }}
      aria-label="Adicionar ao carrinho"
      className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--color-line)] px-5 py-3 text-sm font-bold text-[var(--color-ink)] transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-soft)]"
    >
      <CartPlusIcon />
      Adicionar ao carrinho
    </button>
  );
}

export function CartLink() {
  const { cartCount } = useStore();

  return (
    <Link
      href="/carrinho"
      className="inline-flex items-center gap-2 rounded-full border border-[rgba(243,210,107,0.34)] bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
    >
      Carrinho
      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--color-accent)] px-1 text-xs font-black text-[var(--color-ink)]">
        {cartCount}
      </span>
    </Link>
  );
}
