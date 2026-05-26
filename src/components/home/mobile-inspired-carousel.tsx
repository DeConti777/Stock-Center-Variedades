"use client";

import { useMemo } from "react";
import { ProductCard } from "@/components/ui/product-card";
import type { Product } from "@/lib/types";

const CARD_WIDTH = "10.25rem";

const scrollRowClass =
  "flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-1 pl-4 pr-4 [-ms-overflow-style:none] [scrollbar-width:none] [touch-action:pan-x] [&::-webkit-scrollbar]:hidden";

function ScrollRow({ products }: { products: Product[] }) {
  if (!products.length) return null;

  return (
    <div className={scrollRowClass}>
      {products.map((product) => (
        <div
          key={product.id}
          className="shrink-0 snap-start"
          style={{ width: CARD_WIDTH }}
        >
          <ProductCard product={product} compact />
        </div>
      ))}
    </div>
  );
}

export function MobileInspiredCarousel({ products }: { products: Product[] }) {
  const { row1, row2 } = useMemo(() => {
    const first: Product[] = [];
    const second: Product[] = [];
    products.forEach((product, index) => {
      if (index % 2 === 0) first.push(product);
      else second.push(product);
    });
    return { row1: first, row2: second };
  }, [products]);

  if (!row1.length && !row2.length) return null;

  const topRow = row1.length > 0 ? row1 : row2;
  const bottomRow = row2.length > 0 ? row2 : row1;

  return (
    <div className="space-y-3" aria-label="Produtos inspirados na sua navegacao">
      <ScrollRow products={topRow} />
      <ScrollRow products={bottomRow} />
    </div>
  );
}
