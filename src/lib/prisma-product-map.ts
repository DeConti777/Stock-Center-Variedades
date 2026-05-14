import { parseStringArray } from "@/lib/product-json";
import type { Product, ProductTag } from "@/lib/types";
import type { PrismaClient } from "@prisma/client";
import type { Product as PrismaProduct } from "@prisma/client";

export async function expireStaleFlashSales(prisma: PrismaClient): Promise<void> {
  try {
    await prisma.product.updateMany({
      where: { flashSaleEndsAt: { lt: new Date() } },
      data: { flashSaleEndsAt: null, flashSaleDiscountPercent: null },
    });
  } catch (error) {
    // Compat: evita quebrar quando o client Prisma em runtime ainda nao reconhece o novo campo.
    if (
      !(error instanceof Error) ||
      !error.message.includes("flashSaleDiscountPercent")
    ) {
      throw error;
    }
    await prisma.product.updateMany({
      where: { flashSaleEndsAt: { lt: new Date() } },
      data: { flashSaleEndsAt: null },
    });
  }
}

export function mapPrismaProductToCatalog(product: PrismaProduct): Product {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    category: product.category as Product["category"],
    price: product.priceInCents / 100,
    originalPrice: product.originalPriceInCents
      ? product.originalPriceInCents / 100
      : undefined,
    pixDiscountPercent: product.pixDiscountPercent,
    installment: {
      quantity: product.installmentQuantity,
      amount: product.installmentAmountInCents / 100,
    },
    stock: product.stock,
    rating: product.rating,
    reviews: product.reviews,
    shortDescription: product.shortDescription,
    description: product.description,
    features: parseStringArray(product.features),
    badge: product.badge ?? undefined,
    sku: product.sku,
    coverImage: product.coverImage ?? undefined,
    images: parseStringArray(product.images),
    tags: parseStringArray(product.tags) as ProductTag[],
    published: product.published,
    flashSaleEndsAt: product.flashSaleEndsAt?.toISOString() ?? null,
    flashSaleDiscountPercent: product.flashSaleDiscountPercent ?? null,
  };
}

export async function fetchFlashSaleDiscountMap(
  prisma: Pick<PrismaClient, "product">,
  productIds: string[],
): Promise<Map<string, number | null>> {
  const map = new Map<string, number | null>();
  if (productIds.length === 0) return map;

  try {
    const rows = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, flashSaleDiscountPercent: true },
    });
    for (const row of rows) {
      map.set(row.id, row.flashSaleDiscountPercent ?? null);
    }
  } catch {
    // Compat: coluna ausente ou runtime antigo do Prisma.
  }

  return map;
}
