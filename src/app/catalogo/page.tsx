import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductCatalogView } from "@/components/catalog/product-catalog-view";
import { getCatalogFilters, getProducts } from "@/lib/catalog-server";

export const metadata: Metadata = {
  title: "Catalogo",
  description:
    "Catalogo completo da Stock Center Variedades com filtros por categoria, faixa de preco e promocoes.",
};

export default async function CatalogPage() {
  const products = await getProducts();

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-16 text-center text-sm text-[var(--color-muted)] sm:px-6 lg:px-8">
          Carregando catalogo...
        </div>
      }
    >
      <ProductCatalogView products={products} filters={getCatalogFilters()} />
    </Suspense>
  );
}
