"use client";

import { ProductCard } from "@/components/ui/product-card";
import { prioritizeVisitedProducts } from "@/lib/catalog";
import { products } from "@/lib/site-data";
import { useStore } from "@/components/store/store-provider";
import { isLikelyMobileViewport, trackEcommerceEvent } from "@/lib/analytics";

export function FavoritesView() {
  const {
    favorites,
    visitedProductIds,
    togglePriceAlert,
    hasPriceAlert,
    priceAlertProductIds,
  } = useStore();
  const favoriteProducts = prioritizeVisitedProducts(
    products.filter((product) => favorites.includes(product.id)),
    visitedProductIds,
  );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] bg-[var(--color-ink)] px-5 py-6 text-white sm:rounded-[2.5rem] sm:px-10 sm:py-10">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-white/60">
          Favoritos
        </p>
        <h1 className="mt-4 font-display text-4xl font-black tracking-tight sm:text-5xl">
          Seus produtos salvos para comprar no melhor momento.
        </h1>
        <p className="mt-3 text-sm text-white/70">
          Alertas ativos: {priceAlertProductIds.length}
        </p>
      </div>
      <div className="product-grid-mobile grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {favoriteProducts.length ? (
          favoriteProducts.map((product) => (
            <div key={product.id} className="space-y-2">
              <ProductCard product={product} />
              <button
                type="button"
                onClick={() => {
                  const nextEnabled = !hasPriceAlert(product.id);
                  togglePriceAlert(product.id);
                  trackEcommerceEvent("view_item", {
                    source: "favorites_alert_toggle",
                    product_id: product.id,
                    alert_enabled: nextEnabled,
                    is_mobile: isLikelyMobileViewport(),
                  });
                }}
                className={`w-full rounded-full border px-4 py-2 text-sm font-semibold ${
                  hasPriceAlert(product.id)
                    ? "border-[var(--color-primary)] bg-[var(--color-soft)] text-[var(--color-ink)]"
                    : "border-[var(--color-line)] bg-white text-[var(--color-muted)]"
                }`}
              >
                {hasPriceAlert(product.id)
                  ? "Alerta de preco/estoque ativo"
                  : "Ativar alerta de preco/estoque"}
              </button>
            </div>
          ))
        ) : (
          <div className="rounded-[2rem] border border-[var(--color-line)] bg-white p-8 text-[var(--color-muted)]">
            Nenhum favorito salvo ainda. Explore o catalogo e clique no coracao.
          </div>
        )}
      </div>
    </div>
  );
}
