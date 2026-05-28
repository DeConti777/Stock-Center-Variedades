import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductDetailView, type ProductReview } from "@/components/product/product-detail-view";
import { JsonLd } from "@/components/seo/json-ld";
import { getProductBySlug, getProducts } from "@/lib/catalog-server";
import { getAppUrl } from "@/lib/env";
import { isProductMediaUrl } from "@/lib/product-media";
import { getPrismaOrNull } from "@/lib/prisma";
import { buildProductPageGraph } from "@/lib/schema-org";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

function parseReviewImages(json: string): string[] {
  try {
    const value = JSON.parse(json);
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

function getPublicReviewerName(name: string | null | undefined): string {
  const raw = (name ?? "").trim();
  if (!raw) return "Cliente verificado";
  const parts = raw.split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "";
  const secondInitial = parts[1]?.charAt(0)?.toUpperCase();
  return secondInitial ? `${first} ${secondInitial}.` : first;
}

export async function generateStaticParams() {
  const products = await getProducts(300);
  return products.map((product) => ({ slug: product.slug }));
}

export const revalidate = 120;

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return { title: "Produto nao encontrado" };
  }

  const base = getAppUrl().replace(/\/$/, "");
  const imagePath = product.coverImage ?? product.images[0];
  const ogImage =
    imagePath &&
    isProductMediaUrl(imagePath) &&
    (imagePath.startsWith("http")
      ? imagePath
      : `${base}${imagePath.startsWith("/") ? "" : "/"}${imagePath}`);
  const fallbackOg = `${base}/stock-center-logo.png`;
  const shareImage = ogImage || fallbackOg;
  const pageUrl = `${base}/produto/${product.slug}`;

  return {
    title: product.name,
    description: product.shortDescription,
    alternates: { canonical: pageUrl },
    openGraph: {
      title: product.name,
      description: product.shortDescription,
      url: pageUrl,
      type: "website",
      locale: "pt_BR",
      images: [{ url: shareImage, alt: product.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description: product.shortDescription,
      images: [shareImage],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const prisma = getPrismaOrNull();
  const rawReviews = prisma
    ? await prisma.orderItemReview.findMany({
        where: {
          orderItem: {
            productId: product.id,
          },
        },
        orderBy: { createdAt: "desc" },
        take: 12,
        include: {
          user: { select: { name: true } },
        },
      })
    : [];
  const customerReviews: ProductReview[] = rawReviews.map((review) => ({
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    images: parseReviewImages(review.images),
    reviewerName: getPublicReviewerName(review.user.name),
    createdAt: review.createdAt.toISOString(),
  }));
  const productLd = buildProductPageGraph(getAppUrl(), product);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 pt-3 pb-8 sm:gap-8 sm:px-6 sm:py-10 lg:px-8">
      <JsonLd data={productLd} />
      <section className="rounded-[1.6rem] border border-[var(--color-line)] bg-white px-4 py-2 sm:px-5 sm:py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)]">
          Produto novo
        </p>
        <p className="mt-1 text-base font-semibold text-[var(--color-ink)] sm:text-lg">
          {product.name}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--color-muted)] sm:text-sm">
          <Link
            href={`/catalogo?categoria=${encodeURIComponent(product.category)}`}
            className="min-w-0 shrink font-semibold text-[var(--color-primary)]"
          >
            Ver mais em {product.category}
          </Link>
          <span className="shrink-0" aria-hidden>
            •
          </span>
          <span className="shrink-0 whitespace-nowrap">
            {product.rating.toFixed(1)} ★
          </span>
          <span className="shrink-0" aria-hidden>
            •
          </span>
          <span className="shrink-0 whitespace-nowrap">{product.reviews} avaliacoes</span>
        </div>
      </section>
      <ProductDetailView
        key={product.id}
        product={product}
        customerReviews={customerReviews}
      />
    </div>
  );
}
