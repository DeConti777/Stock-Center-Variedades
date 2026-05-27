"use client";

import { ProductCard } from "@/components/ui/product-card";
import type { Product } from "@/lib/types";

type MobileProductGridProps = {
  products: Product[];
  className?: string;
  onBeforeProductNavigate?: () => void;
};

export function MobileProductGrid({
  products,
  className = "",
  onBeforeProductNavigate,
}: MobileProductGridProps) {
  if (!products.length) return null;

  return (
    <div
      className={`product-grid-mobile grid gap-2 md:grid-cols-2 md:gap-5 xl:grid-cols-4 ${className}`.trim()}
    >
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onBeforeProductNavigate={onBeforeProductNavigate}
        />
      ))}
    </div>
  );
}
