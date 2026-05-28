import { NextResponse } from "next/server";
import {
  getProductById,
  getRelatedProducts,
  RELATED_PRODUCTS_LIMIT,
} from "@/lib/catalog-server";
import type { Product } from "@/lib/types";

export type RelatedProductsResponse = {
  category: string;
  baseProduct: Pick<
    Product,
    "id" | "name" | "slug" | "category" | "coverImage" | "images"
  >;
  products: Product[];
};

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
  }

  const productId =
    body && typeof body === "object" && "productId" in body
      ? String((body as { productId: unknown }).productId ?? "").trim()
      : "";

  if (!productId) {
    return NextResponse.json({ error: "productId obrigatorio." }, { status: 400 });
  }

  const base = await getProductById(productId);

  if (!base) {
    return NextResponse.json({ error: "Produto nao encontrado." }, { status: 404 });
  }

  const related = await getRelatedProducts(productId, RELATED_PRODUCTS_LIMIT, base);

  const payload: RelatedProductsResponse = {
    category: base.category,
    baseProduct: {
      id: base.id,
      name: base.name,
      slug: base.slug,
      category: base.category,
      coverImage: base.coverImage,
      images: base.images,
    },
    products: related,
  };

  return NextResponse.json(payload);
}
