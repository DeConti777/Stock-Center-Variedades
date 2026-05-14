import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { REVIEWABLE_ORDER_STATUSES } from "@/lib/order-reviews";
import { syncProductReviewStats } from "@/lib/product-review-sync";
import { getPrismaOrNull } from "@/lib/prisma";

const REVIEWABLE_STATUSES = new Set<string>(REVIEWABLE_ORDER_STATUSES);

const MAX_IMAGES = 4;
const MAX_COMMENT = 2000;

function parseImages(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const urls = raw
    .filter((item): item is string => typeof item === "string")
    .map((u) => u.trim())
    .filter((u) => u.startsWith("/uploads/reviews/"));
  return [...new Set(urls)].slice(0, MAX_IMAGES);
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Faca login para avaliar." }, { status: 401 });
  }

  const prisma = getPrismaOrNull();
  if (!prisma) {
    return NextResponse.json({ error: "Banco indisponivel." }, { status: 503 });
  }

  let body: { orderItemId?: string; rating?: number; comment?: string; images?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
  }

  const orderItemId = typeof body.orderItemId === "string" ? body.orderItemId.trim() : "";
  const rating = typeof body.rating === "number" ? body.rating : NaN;
  const comment =
    typeof body.comment === "string" ? body.comment.trim().slice(0, MAX_COMMENT) : "";
  const images = parseImages(body.images);

  if (!orderItemId) {
    return NextResponse.json({ error: "Item do pedido obrigatorio." }, { status: 400 });
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Nota entre 1 e 5." }, { status: 400 });
  }

  const item = await prisma.orderItem.findFirst({
    where: {
      id: orderItemId,
      order: { userId: session.user.id },
    },
    include: {
      order: { select: { status: true } },
      review: { select: { id: true } },
    },
  });

  if (!item) {
    return NextResponse.json({ error: "Item nao encontrado." }, { status: 404 });
  }

  if (!REVIEWABLE_STATUSES.has(item.order.status)) {
    return NextResponse.json(
      { error: "Avaliacoes ficam disponiveis apos confirmacao do pagamento." },
      { status: 400 },
    );
  }

  const imagesJson = JSON.stringify(images);

  if (item.review) {
    await prisma.orderItemReview.update({
      where: { orderItemId: item.id },
      data: {
        rating,
        comment: comment || null,
        images: imagesJson,
      },
    });
  } else {
    await prisma.orderItemReview.create({
      data: {
        orderItemId: item.id,
        userId: session.user.id,
        rating,
        comment: comment || null,
        images: imagesJson,
      },
    });
  }

  await syncProductReviewStats(prisma, item.productId);

  return NextResponse.json({ ok: true });
}
