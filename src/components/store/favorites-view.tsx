"use client";

import { ProductCard } from "@/components/ui/product-card";
import { PageHighlight } from "@/components/ui/page-highlight";
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
      <PageHighlight
        eyebrow="Favoritos"
        title="Seus produtos salvos para comprar no melhor momento."
        description={`Alertas ativos: ${priceAlertProductIds.length}`}
      />
      <div className="product-grid-mobile grid gap-2 md:grid-cols-2 md:gap-5 xl:grid-cols-4">
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
