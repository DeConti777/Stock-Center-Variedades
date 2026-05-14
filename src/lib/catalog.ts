import { categories, products as fallbackProducts } from "@/lib/site-data";
import { getPrismaOrNull } from "@/lib/prisma";
import { applyFlashSalePricing } from "@/lib/flash-sale";
import {
  expireStaleFlashSales,
  fetchFlashSaleDiscountMap,
  mapPrismaProductToCatalog,
} from "@/lib/prisma-product-map";
import type { CatalogFilters, Product, ProductTag } from "@/lib/types";

async function getProductsFromDb(): Promise<Product[] | null> {
  const prisma = getPrismaOrNull();

  if (!prisma) {
    return null;
  }

  await expireStaleFlashSales(prisma);
  const dbProducts = await prisma.product.findMany();
  const mapped = dbProducts.map(mapPrismaProductToCatalog);
  const discountById = await fetchFlashSaleDiscountMap(
    prisma,
    mapped.map((p) => p.id),
  );
  return mapped.map((product) =>
    applyFlashSalePricing({
      ...product,
      flashSaleDiscountPercent:
        discountById.get(product.id) ?? product.flashSaleDiscountPercent ?? null,
    }),
  );
}

export async function getProducts() {
  const dbProducts = await getProductsFromDb();
  return dbProducts ?? fallbackProducts;
}

export async function getFeaturedProducts() {
  const allProducts = await getProducts();
  return allProducts.filter((product) => product.tags.includes("featured"));
}

export async function getProductsByTag(tag: ProductTag) {
  const allProducts = await getProducts();
  return allProducts.filter((product) => product.tags.includes(tag));
}

export async function getProductBySlug(slug: string) {
  const dbProducts = await getProductsFromDb();

  if (dbProducts) {
    return dbProducts.find((product) => product.slug === slug);
  }

  return fallbackProducts.find((product) => product.slug === slug);
}

export async function getRelatedProducts(product: Product) {
  const allProducts = await getProducts();

  return allProducts
    .filter(
      (candidate) =>
        candidate.id !== product.id && candidate.category === product.category,
    )
    .slice(0, 4);
}

export function getCatalogFilters(): CatalogFilters {
  return {
    categories: categories.map((category) => category.name),
    priceRanges: [
      { label: "Ate R$ 50", min: 0, max: 50 },
      { label: "R$ 51 a R$ 100", min: 51, max: 100 },
      { label: "R$ 101 a R$ 200", min: 101, max: 200 },
      { label: "Acima de R$ 200", min: 201, max: null },
    ],
    sortOptions: [
      { value: "relevance", label: "Relevancia" },
      { value: "price-asc", label: "Menor preco" },
      { value: "price-desc", label: "Maior preco" },
      { value: "best-sellers", label: "Mais vendidos" },
    ],
  };
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function calculatePixPrice(product: Product) {
  return product.price * (1 - product.pixDiscountPercent / 100);
}

export function prioritizeVisitedProducts(
  products: Product[],
  visitedProductIds: string[],
) {
  if (!visitedProductIds.length || products.length <= 1) {
    return products;
  }

  const visitedRank = new Map<string, number>();
  visitedProductIds.forEach((id, index) => visitedRank.set(id, index));

  return [...products].sort((a, b) => {
    const rankA = visitedRank.get(a.id);
    const rankB = visitedRank.get(b.id);

    if (rankA === undefined && rankB === undefined) return 0;
    if (rankA === undefined) return 1;
    if (rankB === undefined) return -1;
    return rankA - rankB;
  });
}

export function calculateInstallmentAmount(
  price: number,
  quantity: number,
): number {
  return price / quantity;
}

export function getProductImageUrl(product: Product, index = 0): string {
  return product.images[index] ?? "/placeholder-product.png";
}

export function getProductRatingStars(rating: number): number[] {
  const stars: number[] = [];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  for (let i = 0; i < fullStars; i += 1) {
    stars.push(1);
  }

  if (hasHalfStar) {
    stars.push(0.5);
  }

  while (stars.length < 5) {
    stars.push(0);
  }

  return stars;
}
