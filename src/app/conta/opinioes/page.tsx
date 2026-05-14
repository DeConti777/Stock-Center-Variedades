import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { CustomerReviewLine } from "@/components/account/customer-reviews-page";
import { CustomerReviewsPage } from "@/components/account/customer-reviews-page";
import { REVIEWABLE_ORDER_STATUSES } from "@/lib/order-reviews";
import { getPrismaOrNull } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Opinioes e avaliacoes",
  description:
    "Avalie produtos que voce comprou na Stock Center com nota, comentario e fotos.",
};

function parseReviewImages(json: string): string[] {
  try {
    const v = JSON.parse(json);
    if (!Array.isArray(v)) {
      return [];
    }
    return v.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

export default async function CustomerReviewsRoute() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?next=/conta/opinioes");
  }

  const prisma = getPrismaOrNull();
  if (!prisma) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-[var(--color-line)] bg-white p-8 text-center text-[var(--color-muted)] shadow-[var(--shadow-soft)]">
          Servico temporariamente indisponivel.
        </div>
      </div>
    );
  }

  const rows = await prisma.orderItem.findMany({
    where: {
      order: {
        userId: session.user.id,
        status: { in: [...REVIEWABLE_ORDER_STATUSES] },
      },
    },
    include: {
      order: { select: { id: true, createdAt: true } },
      review: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const lines: CustomerReviewLine[] = rows.map((row) => ({
    orderItemId: row.id,
    orderId: row.order.id,
    orderedAt: row.order.createdAt.toISOString(),
    productName: row.productName,
    productSlug: row.productSlug,
    image: row.image,
    quantity: row.quantity,
    existing: row.review
      ? {
          rating: row.review.rating,
          comment: row.review.comment,
          images: parseReviewImages(row.review.images),
        }
      : null,
  }));

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] border border-[var(--color-line)] bg-white px-6 py-8 shadow-[var(--shadow-soft)] sm:px-10">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">
          Minha conta
        </p>
        <h1 className="mt-4 font-display text-4xl font-black tracking-tight text-[var(--color-ink)] sm:text-5xl">
          Opinioes
        </h1>
        <p className="mt-3 max-w-2xl text-base text-[var(--color-muted)]">
          Deixe sua nota e comentarios nos produtos que voce comprou. Fotos opcionais ajudam outros clientes.
        </p>
      </div>

      <CustomerReviewsPage lines={lines} />
    </div>
  );
}
