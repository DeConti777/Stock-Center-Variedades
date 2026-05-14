import type { PrismaClient } from "@prisma/client";

export async function syncProductReviewStats(prisma: PrismaClient, productId: string) {
  const rows = await prisma.orderItemReview.findMany({
    where: { orderItem: { productId } },
    select: { rating: true },
  });

  const count = rows.length;
  const avg = count ? rows.reduce((sum, row) => sum + row.rating, 0) / count : 0;
  const rounded = Math.round(avg * 10) / 10;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  });

  if (!product) {
    return;
  }

  await prisma.product.update({
    where: { id: productId },
    data: {
      rating: rounded,
      reviews: count,
    },
  });
}
