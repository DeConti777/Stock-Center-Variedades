"use client";

import Link from "next/link";
import { useState } from "react";
import { ProductCard } from "@/components/ui/product-card";
import { formatCurrency } from "@/lib/catalog";
import { getProductHeroSrc } from "@/lib/product-media";
import type { Product } from "@/lib/types";
import { useStore } from "@/components/store/store-provider";
import { isLikelyMobileViewport, trackEcommerceEvent } from "@/lib/analytics";

export function CartView({
  recommendedProducts,
}: {
  recommendedProducts: Product[];
}) {
  const {
    cartProducts,
    subtotal,
    discountAmount,
    shipping,
    total,
    applyCoupon,
    coupon,
    removeFromCart,
    updateQuantity,
  } = useStore();
  const [couponInput, setCouponInput] = useState("");
  const [couponFeedback, setCouponFeedback] = useState<string | null>(null);
  const isEmptyCart = cartProducts.length === 0;
  const hasQuotedShipping = shipping > 0;

  function trackBeginCheckout(source: "cart_summary" | "cart_sticky_bar") {
    trackEcommerceEvent("begin_checkout", {
      source,
      items_count: cartProducts.reduce((sum, item) => sum + item.quantity, 0),
      cart_total: total,
      is_mobile: isLikelyMobileViewport(),
    });
  }

  return (
    <div
      className={`mx-auto w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:px-8 ${
        isEmptyCart ? "space-y-8" : "grid lg:grid-cols-[1fr_390px]"
      }`}
    >
      <section className="space-y-5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--color-primary)]">
            Carrinho rapido
          </p>
          <h1 className="mt-3 font-display text-4xl font-black tracking-tight text-[var(--color-ink)]">
            Revise sua compra sem atrito.
          </h1>
        </div>

        {isEmptyCart ? (
          <article className="rounded-[2rem] border border-dashed border-[var(--color-line)] bg-white p-8 text-center shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
            <h2 className="font-display text-3xl font-black tracking-tight text-[var(--color-ink)]">
              Seu carrinho esta vazio.
            </h2>
            <p className="mt-3 text-base text-[var(--color-muted)]">
              Adicione produtos para continuar. Enquanto isso, separamos algumas
              recomendacoes para voce:
            </p>
            <Link
              href="/catalogo"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-bold text-white"
            >
              Ver produtos
            </Link>
          </article>
        ) : (
          cartProducts.map((item) => {
            const hero = getProductHeroSrc(item);
            const toneB = item.images[1] ?? item.images[0] ?? "#e2e8f0";
            return (
              <article
                key={item.id}
                className="grid grid-cols-[88px_minmax(0,1fr)] gap-3 rounded-2xl border border-[var(--color-line)] bg-white p-3 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:grid-cols-[180px_1fr] sm:gap-5 sm:rounded-[2rem] sm:p-5"
              >
                <div className="relative aspect-square h-[88px] w-[88px] overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] sm:h-auto sm:w-auto sm:rounded-[1.6rem]">
                  {hero ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={hero}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      className="h-full w-full"
                      style={{
                        background: `linear-gradient(145deg, ${item.images[0]}, ${toneB})`,
                      }}
                    />
                  )}
                </div>
                <div className="flex min-w-0 flex-col gap-2 sm:gap-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted)] sm:text-xs sm:tracking-[0.22em]">
                        {item.category}
                      </p>
                      <h2 className="mt-1 line-clamp-2 text-sm font-bold leading-snug text-[var(--color-ink)] sm:mt-2 sm:text-2xl">
                        {item.name}
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.id)}
                      className="inline-flex shrink-0 items-center justify-center rounded-full border border-[var(--color-line)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--color-primary)] sm:px-4 sm:py-2 sm:text-sm"
                    >
                      Remover
                    </button>
                  </div>
                  <p className="hidden text-sm leading-6 text-[var(--color-muted)] sm:block">
                    {item.shortDescription}
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <div className="inline-flex w-fit items-center gap-1 rounded-full border border-[var(--color-line)] px-1.5 py-1 sm:gap-2 sm:px-2 sm:py-2">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-soft)] text-sm sm:h-11 sm:w-11"
                      >
                        -
                      </button>
                      <span className="min-w-6 text-center text-sm font-bold sm:min-w-8 sm:text-base">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-soft)] text-sm sm:h-11 sm:w-11"
                      >
                        +
                      </button>
                    </div>
                    <p className="text-lg font-black text-[var(--color-ink)] sm:text-2xl">
                      {formatCurrency(item.price * item.quantity)}
                    </p>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>

      {!isEmptyCart ? (
        <aside className="h-fit rounded-[2rem] border border-[var(--color-line)] bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          <h2 className="font-display text-2xl font-bold text-[var(--color-ink)]">
            Resumo do pedido
          </h2>

          <div className="mt-6 space-y-3 rounded-[1.6rem] bg-[var(--color-soft)] p-5">
            <div className="flex items-center justify-between text-sm text-[var(--color-muted)]">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-[var(--color-muted)]">
              <span>Desconto</span>
              <span>- {formatCurrency(discountAmount)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-[var(--color-muted)]">
              <span>Frete</span>
              <span>{hasQuotedShipping ? formatCurrency(shipping) : "A calcular no checkout"}</span>
            </div>
            <div className="border-t border-[var(--color-line)] pt-3">
              <div className="flex items-center justify-between text-lg font-bold text-[var(--color-ink)]">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <label className="text-sm font-semibold text-[var(--color-ink)]">
              Cupom de desconto
            </label>
            <div className="mt-2 flex gap-2">
              <input
                value={couponInput}
                onChange={(event) => setCouponInput(event.target.value)}
                placeholder="Ex.: BEMVINDO10"
                className="w-full rounded-full border border-[var(--color-line)] px-4 py-3 text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  void (async () => {
                    const result = await applyCoupon(couponInput);
                    setCouponFeedback(
                      result.ok
                        ? "Cupom aplicado com sucesso."
                        : result.error || "Cupom invalido.",
                    );
                  })();
                }}
                className="rounded-full bg-[var(--color-primary)] px-5 text-sm font-bold text-white"
              >
                Aplicar
              </button>
            </div>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              {coupon ? `Cupom ativo: ${coupon.code}` : couponFeedback}
            </p>
          </div>

          <Link
            href="/checkout"
            onClick={() => trackBeginCheckout("cart_summary")}
            className="mt-8 hidden w-full items-center justify-center rounded-full bg-[var(--color-primary)] px-6 py-4 text-sm font-bold text-white lg:inline-flex"
          >
            Ir para o checkout
          </Link>
        </aside>
      ) : null}

      {isEmptyCart ? (
        <section>
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--color-primary)]">
              Recomendados para voce
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold text-[var(--color-ink)]">
              Aproveite para conhecer estes produtos.
            </h2>
          </div>
          <div className="product-grid-mobile grid gap-2 md:grid-cols-2 md:gap-5 xl:grid-cols-4">
            {recommendedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      ) : null}
      {!isEmptyCart ? (
        <div className="fixed inset-x-3 bottom-3 z-20 rounded-2xl border border-[var(--color-line)] bg-white/95 p-3 shadow-[0_20px_40px_rgba(15,23,42,0.14)] backdrop-blur-sm lg:hidden">
          <div className="mb-2 flex items-center justify-between text-sm text-[var(--color-muted)]">
            <span>Total</span>
            <span className="text-lg font-black text-[var(--color-ink)]">{formatCurrency(total)}</span>
          </div>
          <Link
            href="/checkout"
            onClick={() => trackBeginCheckout("cart_sticky_bar")}
            className="touch-target-mobile inline-flex w-full items-center justify-center rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-bold text-white"
          >
            Ir para o checkout
          </Link>
        </div>
      ) : null}
    </div>
  );
}
