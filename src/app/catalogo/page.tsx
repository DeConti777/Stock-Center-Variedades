import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductCatalogView } from "@/components/catalog/product-catalog-view";
import {
  getActiveFlashSaleProducts,
  getCatalogFilters,
  getCatalogPageProducts,
  getProducts,
} from "@/lib/catalog-server";

export const metadata: Metadata = {
  title: "Catalogo",
  description:
    "Catalogo completo da Stock Center Variedades com filtros por categoria, faixa de preco e promocoes.",
};

export const revalidate = 60;

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; origem?: string; flashSale?: string }>;
}) {
  const params = await searchParams;
  const origem = params.origem ?? "";
  const page = Number(params.page ?? "1");
  const flashSaleOnly =
    params.flashSale === "1" || params.flashSale === "true";
  const useExpandedOriginFeed = origem === "inspirado" || origem === "quem-viu";
  const data = flashSaleOnly
    ? {
        products: await getActiveFlashSaleProducts(),
        page: 1,
        totalPages: 1,
      }
    : useExpandedOriginFeed
      ? {
          products: await getProducts(240),
          page: 1,
          totalPages: 1,
        }
      : await getCatalogPageProducts(page, 72);

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-16 text-center text-sm text-[var(--color-muted)] sm:px-6 lg:px-8">
          Carregando catalogo...
        </div>
      }
    >
      <ProductCatalogView
        products={data.products}
        filters={getCatalogFilters()}
        page={data.page}
        totalPages={data.totalPages}
      />
    </Suspense>
  );
}
