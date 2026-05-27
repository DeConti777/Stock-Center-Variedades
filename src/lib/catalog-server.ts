import { categories, products as fallbackProducts } from "@/lib/site-data";
import type { CatalogFilters, Product, ProductTag } from "@/lib/types";
import { getPrismaOrNull } from "@/lib/prisma";
import { applyFlashSalePricing } from "@/lib/flash-sale";
import {
  expireStaleFlashSales,
  fetchFlashSaleDiscountMap,
  mapPrismaProductToCatalog,
} from "@/lib/prisma-product-map";
import type { Product as PrismaProduct } from "@prisma/client";

const byDemandDesc = (a: Product, b: Product) => {
  if (b.reviews !== a.reviews) return b.reviews - a.reviews;
  return b.rating - a.rating;
};

function applyDiscounts(
  mapped: Product[],
  discountById: Map<string, number | null>,
): Product[] {
  return mapped.map((product) =>
    applyFlashSalePricing({
      ...product,
      flashSaleDiscountPercent:
        discountById.get(product.id) ?? product.flashSaleDiscountPercent ?? null,
    }),
  );
}

async function mapDbProducts(prisma: NonNullable<ReturnType<typeof getPrismaOrNull>>, rows: PrismaProduct[]) {
  const mapped = rows.map(mapPrismaProductToCatalog);
  const discountById = await fetchFlashSaleDiscountMap(
    prisma,
    mapped.map((p) => p.id),
  );
  return applyDiscounts(mapped, discountById);
}

async function getProductsFromDb(limit?: number): Promise<Product[] | null> {
  const prisma = getPrismaOrNull();

  if (!prisma) {
    return null;
  }

  try {
    await expireStaleFlashSales(prisma);
    const dbProducts = await prisma.product.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
      ...(limit ? { take: limit } : {}),
    });
    return mapDbProducts(prisma, dbProducts);
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

export async function getProducts(limit?: number) {
  const dbProducts = await getProductsFromDb(limit);
  if (dbProducts) return dbProducts;
  return limit ? fallbackProducts.slice(0, limit) : fallbackProducts;
}

export async function getCatalogPageProducts(page = 1, pageSize = 60) {
  const safePage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
  const safeSize = Number.isFinite(pageSize)
    ? Math.max(12, Math.min(120, Math.floor(pageSize)))
    : 60;
  const skip = (safePage - 1) * safeSize;
  const prisma = getPrismaOrNull();

  if (!prisma) {
    const products = fallbackProducts.slice(skip, skip + safeSize);
    const total = fallbackProducts.length;
    return {
      products,
      total,
      page: safePage,
      pageSize: safeSize,
      totalPages: Math.max(1, Math.ceil(total / safeSize)),
    };
  }

  await expireStaleFlashSales(prisma);
  const where = { published: true } as const;
  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: safeSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.count({ where }),
  ]);
  const products = await mapDbProducts(prisma, rows);
  return {
    products,
    total,
    page: safePage,
    pageSize: safeSize,
    totalPages: Math.max(1, Math.ceil(total / safeSize)),
  };
}

export async function getFeaturedProducts(limit?: number) {
  const prisma = getPrismaOrNull();
  if (!prisma) {
    const base = fallbackProducts.filter((product) => product.tags.includes("featured"));
    return limit ? base.slice(0, limit) : base;
  }
  await expireStaleFlashSales(prisma);
  const rows = await prisma.product.findMany({
    where: {
      published: true,
      stock: { gt: 0 },
      tags: { contains: "featured" },
    },
    orderBy: [{ reviews: "desc" }, { rating: "desc" }],
    ...(limit ? { take: limit } : {}),
  });
  return mapDbProducts(prisma, rows);
}

/** Sugestoes para carrinho vazio (e vitrines similares). */
export async function getCartRecommendedProducts(limit = 18) {
  const prisma = getPrismaOrNull();
  if (!prisma) {
    const inStock = fallbackProducts.filter((product) => product.stock > 0);
    const featured = inStock.filter((product) => product.tags.includes("featured"));
    const promo = inStock.filter(
      (product) =>
        product.tags.includes("bestSeller") || product.tags.includes("promotion"),
    );
    const pool = [...featured, ...promo, ...[...inStock].sort(byDemandDesc)];
    const seen = new Set<string>();
    return pool.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true))).slice(0, limit);
  }

  await expireStaleFlashSales(prisma);
  const baseWhere = { published: true, stock: { gt: 0 } } as const;
  const [featuredRows, bestPromoRows, topRows] = await Promise.all([
    prisma.product.findMany({
      where: { ...baseWhere, tags: { contains: "featured" } },
      orderBy: [{ reviews: "desc" }, { rating: "desc" }],
      take: limit,
    }),
    prisma.product.findMany({
      where: { ...baseWhere, OR: [{ tags: { contains: "bestSeller" } }, { tags: { contains: "promotion" } }] },
      orderBy: [{ reviews: "desc" }, { rating: "desc" }],
      take: limit,
    }),
    prisma.product.findMany({
      where: baseWhere,
      orderBy: [{ reviews: "desc" }, { rating: "desc" }],
      take: limit * 2,
    }),
  ]);
  const allRows = [...featuredRows, ...bestPromoRows, ...topRows];
  const uniqueRows: PrismaProduct[] = [];
  const seen = new Set<string>();
  for (const row of allRows) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    uniqueRows.push(row);
    if (uniqueRows.length >= limit) break;
  }
  return mapDbProducts(prisma, uniqueRows);
}

export async function getProductsByTag(tag: ProductTag, limit?: number) {
  const prisma = getPrismaOrNull();
  if (!prisma) {
    const base = fallbackProducts.filter((product) => product.tags.includes(tag));
    return limit ? base.slice(0, limit) : base;
  }
  await expireStaleFlashSales(prisma);
  const rows = await prisma.product.findMany({
    where: { published: true, stock: { gt: 0 }, tags: { contains: tag } },
    orderBy: [{ reviews: "desc" }, { rating: "desc" }],
    ...(limit ? { take: limit } : {}),
  });
  return mapDbProducts(prisma, rows);
}

export async function getProductBySlug(slug: string) {
  const prisma = getPrismaOrNull();
  if (!prisma) {
    return fallbackProducts.find((product) => product.slug === slug) ?? null;
  }
  await expireStaleFlashSales(prisma);
  const row = await prisma.product.findFirst({
    where: { slug, published: true },
  });
  if (!row) return null;
  const [mapped] = await mapDbProducts(prisma, [row]);
  return mapped ?? null;
}

export async function getProductById(id: string) {
  const prisma = getPrismaOrNull();
  if (!prisma) {
    return fallbackProducts.find((product) => product.id === id) ?? null;
  }
  await expireStaleFlashSales(prisma);
  const row = await prisma.product.findFirst({
    where: { id, published: true },
  });
  if (!row) return null;
  const [mapped] = await mapDbProducts(prisma, [row]);
  return mapped ?? null;
}

export async function getRelatedProducts(productId: string, limit = 4) {
  const product = await getProductById(productId);
  if (!product) return [];

  const prisma = getPrismaOrNull();
  if (!prisma) {
    const products = await getProducts(300);
    const sameCategory = products
      .filter((p) => p.id !== productId && p.category === product.category)
      .sort(byDemandDesc);
    if (sameCategory.length >= limit) return sameCategory.slice(0, limit);
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

  const baseWhere = { published: true, stock: { gt: 0 }, id: { not: productId } } as const;
  const sameCategoryRows = await prisma.product.findMany({
    where: { ...baseWhere, category: product.category },
    orderBy: [{ reviews: "desc" }, { rating: "desc" }],
    take: limit,
  });
  if (sameCategoryRows.length >= limit) {
    return mapDbProducts(prisma, sameCategoryRows);
  }
  const complementaryRows = await prisma.product.findMany({
    where: {
      ...baseWhere,
      category: { not: product.category },
      id: { notIn: sameCategoryRows.map((row) => row.id).concat(productId) },
    },
    orderBy: [{ reviews: "desc" }, { rating: "desc" }],
    take: limit - sameCategoryRows.length,
  });
  return mapDbProducts(prisma, [...sameCategoryRows, ...complementaryRows]);
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
