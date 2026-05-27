"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ProductSearchField } from "@/components/search/product-search-field";
import { PageHighlight } from "@/components/ui/page-highlight";
import { ProductCard } from "@/components/ui/product-card";
import { useStore } from "@/components/store/store-provider";
import { prioritizeVisitedProducts } from "@/lib/catalog";
import { isFlashSaleActive } from "@/lib/flash-sale";
import { searchAndRankProducts } from "@/lib/search";
import type { CatalogFilters, Product } from "@/lib/types";

type ProductCatalogViewProps = {
  products: Product[];
  filters: CatalogFilters;
  page: number;
  totalPages: number;
};

export function ProductCatalogView({
  products,
  filters,
  page,
  totalPages,
}: ProductCatalogViewProps) {
  const { visitedProductIds } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qFromUrl = searchParams.get("q") ?? "";
  const categoriaFromUrl = searchParams.get("categoria")?.trim() ?? "";
  const originFromUrl = searchParams.get("origem") ?? "";
  const [query, setQuery] = useState(qFromUrl);

  useEffect(() => {
    setQuery(qFromUrl);
  }, [qFromUrl]);

  const syncQueryToUrl = useCallback(
    (value: string) => {
      const next = new URLSearchParams(searchParams.toString());
      const trimmed = value.trim();
      if (trimmed) {
        next.set("q", trimmed);
      } else {
        next.delete("q");
      }
      next.delete("page");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    if (query === qFromUrl) return;
    const timer = window.setTimeout(() => {
      syncQueryToUrl(query);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query, qFromUrl, syncQueryToUrl]);

  const clearSearch = useCallback(() => {
    setQuery("");
    syncQueryToUrl("");
  }, [syncQueryToUrl]);

  const goToPage = useCallback(
    (nextPage: number) => {
      if (nextPage < 1 || nextPage > totalPages || nextPage === page) return;
      const next = new URLSearchParams(searchParams.toString());
      if (nextPage <= 1) {
        next.delete("page");
      } else {
        next.set("page", String(nextPage));
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: true });
    },
    [page, pathname, router, searchParams, totalPages],
  );

  const selectedCategory = useMemo(() => {
    if (!categoriaFromUrl) return "Todas";
    const match = filters.categories.find((c) => c === categoriaFromUrl);
    return match ?? "Todas";
  }, [categoriaFromUrl, filters.categories]);
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>("Todos");
  const promoFromUrl = searchParams.get("promo");
  const [promotionOnly, setPromotionOnly] = useState(
    () => promoFromUrl === "1" || promoFromUrl === "true",
  );
  const flashSaleFromUrl = searchParams.get("flashSale");
  const [flashSaleOnly, setFlashSaleOnly] = useState(
    () => flashSaleFromUrl === "1" || flashSaleFromUrl === "true",
  );
  const [sort, setSort] = useState("relevance");
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  useEffect(() => {
    const value = searchParams.get("promo");
    setPromotionOnly(value === "1" || value === "true");
  }, [searchParams]);

  useEffect(() => {
    const value = searchParams.get("flashSale");
    setFlashSaleOnly(value === "1" || value === "true");
  }, [searchParams]);

  const trimmedQuery = query.trim();

  const visibleProducts = useMemo(() => {
    let current = trimmedQuery
      ? searchAndRankProducts(products, query)
      : [...products];

    current = current.filter((product) => product.stock > 0);

    if (!trimmedQuery && originFromUrl === "inspirado") {
      const byId = new Map(current.map((product) => [product.id, product]));
      const visited = visitedProductIds
        .map((id) => byId.get(id))
        .filter((product): product is Product => product !== undefined);
      const visitedCategories = new Set(visited.map((product) => product.category));
      if (visitedCategories.size > 0) {
        const inVisitedCategories = current.filter((product) =>
          visitedCategories.has(product.category),
        );
        const remaining = current.filter((product) => !visitedCategories.has(product.category));
        current = [...inVisitedCategories, ...remaining];
      }
    }

    if (!trimmedQuery && originFromUrl === "quem-viu") {
      const byId = new Map(current.map((product) => [product.id, product]));
      const latestVisited = byId.get(visitedProductIds[0] ?? "");
      if (latestVisited) {
        const sameCategory = current.filter(
          (product) =>
            product.id !== latestVisited.id && product.category === latestVisited.category,
        );
        const remaining = current.filter(
          (product) =>
            product.id === latestVisited.id || product.category !== latestVisited.category,
        );
        current = [...sameCategory, ...remaining];
      }
    }

    if (selectedCategory !== "Todas") {
      current = current.filter((product) => product.category === selectedCategory);
    }

    if (selectedPriceRange !== "Todos") {
      const range = filters.priceRanges.find(
        (candidate) => candidate.label === selectedPriceRange,
      );
      if (range) {
        current = current.filter((product) =>
          range.max === null
            ? product.price >= range.min
            : product.price >= range.min && product.price <= range.max,
        );
      }
    }

    if (promotionOnly) {
      current = current.filter((product) => product.tags.includes("promotion"));
    }

    if (flashSaleOnly) {
      current = current.filter((product) => isFlashSaleActive(product));
    }

    if (sort === "price-asc") {
      current = [...current].sort((a, b) => a.price - b.price);
    } else if (sort === "price-desc") {
      current = [...current].sort((a, b) => b.price - a.price);
    } else if (sort === "best-sellers") {
      current = [...current].sort((a, b) => b.reviews - a.reviews);
    }

    if (trimmedQuery) {
      return current;
    }

    return prioritizeVisitedProducts(current, visitedProductIds);
  }, [
    filters.priceRanges,
    flashSaleOnly,
    originFromUrl,
    products,
    promotionOnly,
    query,
    selectedCategory,
    selectedPriceRange,
    sort,
    trimmedQuery,
    visitedProductIds,
  ]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <PageHighlight
        title={
          originFromUrl === "inspirado"
            ? "Mais produtos inspirados em voce"
            : originFromUrl === "quem-viu"
              ? "Mais produtos relacionados"
              : "Catalogo Completo"
        }
        description={
          originFromUrl === "inspirado"
            ? "Selecao ampliada com base na sua navegacao recente."
            : originFromUrl === "quem-viu"
              ? "Mais opcoes parecidas com o que voce visitou."
              : "Tudo que você precisa em um único lugar"
        }
      />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <button
          type="button"
          onClick={() => setShowFiltersMobile((current) => !current)}
          className="touch-target-mobile inline-flex items-center justify-center rounded-full border border-[var(--color-line)] bg-white px-5 py-3 text-sm font-bold text-[var(--color-ink)] lg:hidden"
        >
          {showFiltersMobile ? "Ocultar filtros" : "Filtrar produtos"}
        </button>

        <div
          className={`w-full shrink-0 lg:w-[300px] ${
            showFiltersMobile ? "block" : "hidden lg:block"
          } lg:sticky lg:top-32 lg:z-20 lg:self-start`}
        >
        <aside className="rounded-[2rem] border border-[var(--color-line)] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)] lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto">
          <h2 className="font-display text-2xl font-bold text-[var(--color-ink)]">
            Filtrar produtos
          </h2>
          <div className="mt-6 space-y-5">
            <div>
              <label
                htmlFor="catalog-sidebar-search"
                className="text-sm font-semibold text-[var(--color-ink)]"
              >
                Busca
              </label>
              <div className="mt-2">
                <ProductSearchField
                  variant="catalog"
                  defaultQuery={query}
                  inputId="catalog-sidebar-search"
                  onQueryChange={setQuery}
                  onSubmit={(value) => {
                    setQuery(value);
                    syncQueryToUrl(value);
                  }}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-[var(--color-ink)]">
                Categoria
              </label>
              <select
                value={selectedCategory}
                onChange={(event) => {
                  const value = event.target.value;
                  const next = new URLSearchParams(searchParams.toString());
                  if (value === "Todas") {
                    next.delete("categoria");
                  } else {
                    next.set("categoria", value);
                  }
                  next.delete("page");
                  const qs = next.toString();
                  router.replace(qs ? `${pathname}?${qs}` : pathname, {
                    scroll: false,
                  });
                }}
                className="mt-2 w-full rounded-2xl border border-[var(--color-line)] px-4 py-3 text-sm outline-none"
              >
                <option>Todas</option>
                {filters.categories.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-[var(--color-ink)]">
                Faixa de preco
              </label>
              <select
                value={selectedPriceRange}
                onChange={(event) => setSelectedPriceRange(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[var(--color-line)] px-4 py-3 text-sm outline-none"
              >
                <option>Todos</option>
                {filters.priceRanges.map((range) => (
                  <option key={range.label}>{range.label}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-3 rounded-2xl bg-[var(--color-soft)] px-4 py-3 text-sm font-semibold text-[var(--color-ink)]">
              <input
                type="checkbox"
                checked={promotionOnly}
                onChange={(event) => setPromotionOnly(event.target.checked)}
              />
              Mostrar apenas promocoes
            </label>
            <label className="flex items-center gap-3 rounded-2xl bg-[var(--color-soft)] px-4 py-3 text-sm font-semibold text-[var(--color-ink)]">
              <input
                type="checkbox"
                checked={flashSaleOnly}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setFlashSaleOnly(checked);
                  const next = new URLSearchParams(searchParams.toString());
                  if (checked) {
                    next.set("flashSale", "1");
                  } else {
                    next.delete("flashSale");
                  }
                  next.delete("page");
                  const qs = next.toString();
                  router.replace(qs ? `${pathname}?${qs}` : pathname, {
                    scroll: false,
                  });
                }}
              />
              Mostrar apenas Oferta Relâmpago
            </label>
            <button
              type="button"
              onClick={() => setShowFiltersMobile(false)}
              className="touch-target-mobile inline-flex w-full items-center justify-center rounded-full bg-[var(--color-primary)] px-4 py-3 text-sm font-bold text-white lg:hidden"
            >
              Ver resultados
            </button>
          </div>
        </aside>
        </div>

        <section className="min-w-0 flex-1">
          <div className="mb-5 flex flex-col gap-3 rounded-[2rem] border border-[var(--color-line)] bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-[var(--color-muted)]">
              {visibleProducts.length} produtos encontrados
            </p>
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-[var(--color-ink)]">
                Ordenar por
              </label>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                className="rounded-full border border-[var(--color-line)] px-4 py-2 text-sm"
              >
                {filters.sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {visibleProducts.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-[var(--color-line)] bg-white px-6 py-12 text-center">
              <p className="font-display text-xl font-bold text-[var(--color-ink)]">
                Nenhum produto encontrado
              </p>
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                Tente outro termo de busca ou remova alguns filtros para ver mais resultados.
              </p>
              {trimmedQuery ? (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="mt-6 inline-flex items-center justify-center rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-bold text-white"
                >
                  Limpar busca
                </button>
              ) : null}
            </div>
          ) : (
            <div className="product-grid-mobile grid gap-2 md:grid-cols-2 md:gap-5 xl:grid-cols-3">
              {visibleProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {totalPages > 1 ? (
            <div className="mt-6 flex items-center justify-between rounded-[1.25rem] border border-[var(--color-line)] bg-white px-4 py-3">
              <button
                type="button"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className="rounded-full border border-[var(--color-line)] px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              >
                Anterior
              </button>
              <p className="text-sm font-semibold text-[var(--color-muted)]">
                Pagina {page} de {totalPages}
              </p>
              <button
                type="button"
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                className="rounded-full border border-[var(--color-line)] px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              >
                Proxima
              </button>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
