"use client";

import { MobileProductGrid } from "@/components/ui/mobile-product-grid";
import { useStore } from "@/components/store/store-provider";
import { prioritizeVisitedProducts } from "@/lib/catalog";
import type { Product } from "@/lib/types";

export function VisitedProductGrid({ products }: { products: Product[] }) {
  const { visitedProductIds } = useStore();
  const orderedProducts = prioritizeVisitedProducts(products, visitedProductIds);
  const inStock = orderedProducts.filter((product) => product.stock > 0);

  return <MobileProductGrid products={inStock} className="mt-6 md:mt-10" />;
}
