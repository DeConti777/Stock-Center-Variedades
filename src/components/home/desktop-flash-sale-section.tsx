import Link from "next/link";
import { MobileFlashSaleCarousel } from "@/components/home/mobile-flash-sale-carousel";
import type { Product } from "@/lib/types";

export function DesktopFlashSaleSection({ products }: { products: Product[] }) {
  if (products.length === 0) return null;

  return (
    <section
      aria-label="Ofertas Relampago"
      className="mx-auto mt-8 hidden w-full max-w-7xl sm:block sm:px-6 lg:px-8"
    >
      <div className="overflow-hidden rounded-[1.25rem]">
        <MobileFlashSaleCarousel products={products} layout="desktop" />
      </div>
      <p className="mt-3 text-center text-sm text-[var(--color-muted)]">
        <Link
          href="/ofertas-relampago"
          className="font-semibold text-[var(--color-primary)] hover:underline"
        >
          Ver todas as ofertas relampago
        </Link>
      </p>
    </section>
  );
}
