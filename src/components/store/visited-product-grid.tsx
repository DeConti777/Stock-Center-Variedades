"use client";

import { ProductCard } from "@/components/ui/product-card";
import { useStore } from "@/components/store/store-provider";
import { prioritizeVisitedProducts } from "@/lib/catalog";
import type { Product } from "@/lib/types";

export function VisitedProductGrid({ products }: { products: Product[] }) {
  const { visitedProductIds } = useStore();
  const orderedProducts = prioritizeVisitedProducts(products, visitedProductIds);

  return (
    <div className="product-grid-mobile mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      {orderedProducts.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
