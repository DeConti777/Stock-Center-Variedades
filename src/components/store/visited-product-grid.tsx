"use client";

import { ProductCard } from "@/components/ui/product-card";
import { MobileCompactStripRow } from "@/components/home/mobile-compact-strip";
import { useStore } from "@/components/store/store-provider";
import { prioritizeVisitedProducts } from "@/lib/catalog";
import type { Product } from "@/lib/types";

export function VisitedProductGrid({ products }: { products: Product[] }) {
  const { visitedProductIds } = useStore();
  const orderedProducts = prioritizeVisitedProducts(products, visitedProductIds);
  const inStock = orderedProducts.filter((product) => product.stock > 0);

  return (
    <>
      <div className="-mx-4 mt-6 sm:hidden">
        <MobileCompactStripRow
          products={inStock}
          ariaLabel="Produtos em carrossel"
        />
      </div>
      <div className="product-grid-mobile mt-10 hidden gap-2 sm:grid md:grid-cols-2 md:gap-5 xl:grid-cols-4">
        {orderedProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </>
  );
}
