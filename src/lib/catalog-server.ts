import { categories, products as fallbackProducts } from "@/lib/site-data";
import type { CatalogFilters, Product, ProductTag } from "@/lib/types";
import { getPrismaOrNull } from "@/lib/prisma";
import { applyFlashSalePricing } from "@/lib/flash-sale";
import {
  expireStaleFlashSales,
  fetchFlashSaleDiscountMap,
  mapPrismaProductToCatalog,
} from "@/lib/prisma-product-map";

async function getProductsFromDb(): Promise<Product[] | null> {
  const prisma = getPrismaOrNull();

  if (!prisma) {
    return null;
  }

  try {
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
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error(
        "[catalog-server] Falha ao ler produtos do banco; usando catálogo estático.",
        error,
      );
    }
    return null;
  }
}

export async function getProducts() {
  const dbProducts = await getProductsFromDb();
  return dbProducts ?? fallbackProducts;
}

export async function getFeaturedProducts() {
  const products = await getProducts();
  return products.filter((product) => product.tags.includes("featured"));
}

export async function getProductsByTag(tag: ProductTag) {
  const products = await getProducts();
  return products.filter((product) => product.tags.includes(tag));
}

export async function getProductBySlug(slug: string) {
  const products = await getProducts();
  return products.find((product) => product.slug === slug) ?? null;
}

export async function getRelatedProducts(productId: string, limit = 4) {
  const products = await getProducts();
  const product = products.find((p) => p.id === productId);

  if (!product) {
    return [];
  }

  const byDemandDesc = (a: Product, b: Product) => {
    if (b.reviews !== a.reviews) return b.reviews - a.reviews;
    return b.rating - a.rating;
  };

  const sameCategory = products
    .filter(
    (p) => p.id !== productId && p.category === product.category,
    )
    .sort(byDemandDesc);

  if (sameCategory.length >= limit) {
    return sameCategory.slice(0, limit);
  }

  const complementary = products
    .filter(
      (p) =>
        p.id !== productId &&
        p.category !== product.category &&
        !sameCategory.some((candidate) => candidate.id === p.id),
    )
    .sort(byDemandDesc);

  return [...sameCategory, ...complementary].slice(0, limit);
}

export function getCatalogFilters(): CatalogFilters {
  // Buscar categorias dinâmicas dos produtos
  const allProducts = fallbackProducts;
  const dynamicCategories = [...new Set(allProducts.map((p) => p.category))];
  
  // Mesclar com categorias estatísticas
  const allCategories = [...new Set([...categories.map((c) => c.name), ...dynamicCategories])];

  return {
    categories: allCategories,
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
