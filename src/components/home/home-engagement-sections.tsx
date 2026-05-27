"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/components/store/store-provider";
import { ProductCard } from "@/components/ui/product-card";
import { SectionHeading } from "@/components/ui/section-heading";
import type { Product } from "@/lib/types";

export function TopRankedShelf({ products }: { products: Product[] }) {
  const ranked = [...products].sort((a, b) => b.reviews - a.reviews).slice(0, 10);
  if (ranked.length === 0) return null;

  return (
    <section className="mx-auto mt-8 w-full max-w-7xl px-4 sm:mt-16 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Top 10 da semana"
        title="Produtos mais populares com prova social forte."
        description="Ranking com base em volume de avaliacoes para facilitar a decisao de compra."
      />
      <div className="product-grid-mobile mt-8 grid gap-2 md:hidden">
        {ranked.map((product, index) => (
          <article
            key={product.id}
            className="relative min-w-0 rounded-[1.25rem] border border-[var(--color-line)] bg-white p-2 shadow-[var(--shadow-soft)]"
          >
            <span className="absolute left-2 top-2 z-[1] inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-ink)] text-xs font-black text-white">
              {index + 1}
            </span>
            <div className="pt-6">
              <ProductCard product={product} />
            </div>
          </article>
        ))}
      </div>
      <div className="mt-8 hidden gap-4 md:grid md:grid-cols-2 xl:grid-cols-5">
        {ranked.map((product, index) => (
          <article
            key={product.id}
            className="relative rounded-[1.25rem] border border-[var(--color-line)] bg-white p-3 shadow-[var(--shadow-soft)]"
          >
            <span className="absolute left-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-ink)] text-sm font-black text-white">
              {index + 1}
            </span>
            <div className="pt-8">
              <ProductCard product={product} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function BudgetFinderSection({ products }: { products: Product[] }) {
  const [activeRange, setActiveRange] = useState<30 | 50 | 100>(50);
  const ranges = [
    { value: 30 as const, label: "Ate R$ 30" },
    { value: 50 as const, label: "Ate R$ 50" },
    { value: 100 as const, label: "Ate R$ 100" },
  ];
  const filtered = products.filter((product) => product.stock > 0 && product.price <= activeRange).slice(0, 8);

  return (
    <section className="mx-auto mt-8 w-full max-w-7xl px-4 sm:mt-16 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Achadinhos por faixa"
        title="Explore por preco e encontre mais produtos sem sair da home."
        description="Troque de faixa para descobrir itens com melhor custo-beneficio para seu momento."
      />
      <div className="mt-6 flex flex-wrap gap-2">
        {ranges.map((range) => (
          <button
            key={range.value}
            type="button"
            onClick={() => setActiveRange(range.value)}
            className={`rounded-full px-4 py-2 text-sm font-bold ${
              activeRange === range.value
                ? "bg-[var(--color-primary)] text-white"
                : "border border-[var(--color-line)] bg-white text-[var(--color-ink)]"
            }`}
          >
            {range.label}
          </button>
        ))}
      </div>
      <div className="product-grid-mobile mt-6 grid gap-2 md:grid-cols-2 md:gap-5 xl:grid-cols-4">
        {filtered.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

export function CouponClaimBanner() {
  const [copied, setCopied] = useState(false);

  async function copyCoupon() {
    try {
      await navigator.clipboard.writeText("BEMVINDO10");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="mx-auto mt-12 w-full max-w-5xl px-4 sm:px-6 lg:px-8">
      <div className="rounded-[1.25rem] border border-[rgba(243,210,107,0.55)] bg-[linear-gradient(120deg,#fef3c7,#f3d26b)] p-5 shadow-[var(--shadow-gold)] sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--color-primary-strong)]">
          Cupom coletavel
        </p>
        <h3 className="mt-2 font-display text-2xl font-bold text-[var(--color-ink)]">
          Pegue R$ 10 OFF acima de R$ 99 com o codigo BEMVINDO10.
        </h3>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={copyCoupon}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--color-ink)] px-6 text-sm font-bold text-white"
          >
            Copiar cupom
          </button>
          <span className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--color-primary)] px-6 text-sm font-bold text-[var(--color-primary-strong)]">
            {copied ? "Copiado!" : "Valido para primeira compra"}
          </span>
        </div>
      </div>
    </section>
  );
}

export function RelatedToVisitedSection({ products }: { products: Product[] }) {
  const { visitedProductIds } = useStore();
  const related = useMemo(() => {
    if (!products.length) return [];
    const byId = new Map(products.map((product) => [product.id, product]));
    const latestVisited = byId.get(visitedProductIds[0] ?? "");
    if (latestVisited) {
      return products
        .filter(
          (candidate) =>
            candidate.stock > 0 &&
            candidate.id !== latestVisited.id &&
            !visitedProductIds.includes(candidate.id) &&
            candidate.category === latestVisited.category,
        )
        .slice(0, 6);
    }
    return products
      .filter((candidate) => candidate.stock > 0 && candidate.tags.includes("new"))
      .slice(0, 6);
  }, [products, visitedProductIds]);

  if (related.length === 0) return null;

  return (
    <section className="mx-auto mt-8 w-full max-w-7xl px-4 sm:mt-16 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Sugestoes para voce"
        title="Produtos que combinam com o que voce buscou"
        description="Recomendacoes com base na sua navegacao recente para aumentar relevancia."
      />
      <div className="product-grid-mobile mt-8 grid gap-2 md:grid-cols-2 md:gap-5 xl:grid-cols-4">
        {related.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
