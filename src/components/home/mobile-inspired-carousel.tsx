"use client";

import { MobileCompactStripCarousel } from "@/components/home/mobile-compact-strip";
import type { Product } from "@/lib/types";

export function MobileInspiredCarousel({ products }: { products: Product[] }) {
  if (!products.length) return null;

  return (
    <MobileCompactStripCarousel
      products={products}
      ariaLabel="Produtos inspirados na sua navegacao"
    />
  );
}
