"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ProductCard } from "@/components/ui/product-card";
import { useStore } from "@/components/store/store-provider";
import { prioritizeVisitedProducts } from "@/lib/catalog";
import { isFlashSaleActive } from "@/lib/flash-sale";
import { searchProducts } from "@/lib/search";
import type { CatalogFilters, Product } from "@/lib/types";

type ProductCatalogViewProps = {
  products: Product[];
  filters: CatalogFilters;
  title: string;
  description: string;
};

export function ProductCatalogView({
  products,
  filters,
  title,
  description,
}: ProductCatalogViewProps) {
  const { visitedProductIds } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qFromUrl = searchParams.get("q") ?? "";
  const categoriaFromUrl = searchParams.get("categoria")?.trim() ?? "";
  const [query, setQuery] = useState(qFromUrl);

  useEffect(() => {
    setQuery(qFromUrl);
  }, [qFromUrl]);

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

  const visibleProducts = useMemo(() => {
    let current = searchProducts(products, query);

    // Filtrar produtos com estoque 0 ou negativo
    current = current.filter((product) => product.stock > 0);

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

    return prioritizeVisitedProducts(current, visitedProductIds);
  }, [
    filters.priceRanges,
    flashSaleOnly,
    products,
    promotionOnly,
    query,
    selectedCategory,
    selectedPriceRange,
    sort,
    visitedProductIds,
  ]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] bg-[var(--color-ink)] px-5 py-6 text-white sm:rounded-[2.5rem] sm:px-10 sm:py-10">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-white/60">
          Busca inteligente
        </p>
        <h1 className="mt-3 max-w-3xl font-display text-3xl font-black tracking-tight sm:mt-4 sm:text-5xl">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75 sm:mt-4 sm:text-base sm:leading-7">
          {description}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <button
          type="button"
          onClick={() => setShowFiltersMobile((current) => !current)}
          className="touch-target-mobile inline-flex items-center justify-center rounded-full border border-[var(--color-line)] bg-white px-5 py-3 text-sm font-bold text-[var(--color-ink)] lg:hidden"
        >
          {showFiltersMobile ? "Ocultar filtros" : "Filtrar produtos"}
        </button>

        <aside
          className={`rounded-[2rem] border border-[var(--color-line)] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)] ${
            showFiltersMobile ? "block" : "hidden lg:block"
          }`}
        >
          <h2 className="font-display text-2xl font-bold text-[var(--color-ink)]">
            Filtrar produtos
          </h2>
          <div className="mt-6 space-y-5">
            <div>
              <label className="text-sm font-semibold text-[var(--color-ink)]">
                Busca
              </label>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Busque por produto, categoria ou descricao"
                className="mt-2 w-full rounded-2xl border border-[var(--color-line)] px-4 py-3 text-sm outline-none"
              />
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

        <section>
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

          <div className="grid grid-cols-2 gap-4 md:grid-cols-2 md:gap-5 xl:grid-cols-3">
            {visibleProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
