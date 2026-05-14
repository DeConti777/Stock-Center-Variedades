import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAdminProduct, deleteAdminProduct, listAdminProducts, updateAdminProduct } from "@/lib/admin-server";
import { dedupeImageUrlsExact } from "@/lib/product-json";
import { z } from "zod";

const createProductSchema = z.object({
  name: z.string().min(3),
  slug: z.string().min(3),
  sku: z.string().min(3),
  category: z.string().min(3),
  price: z.number().positive(),
  cost: z.number().min(0).optional(),
  originalPrice: z.number().positive().optional(),
  pixDiscountPercent: z.number().min(0).max(100).optional(),
  installmentQuantity: z.number().int().min(1).optional(),
  installmentAmount: z.number().min(0).optional(),
  stock: z.number().int().min(0).optional(),
  rating: z.number().min(0).max(5).optional(),
  reviews: z.number().int().min(0).optional(),
  shortDescription: z.string().min(10),
  description: z.string().min(10),
  badge: z.string().optional(),
  coverImage: z.string().optional(),
  images: z.array(z.string()).optional(),
  features: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  published: z.boolean().optional(),
  flashSaleActive: z.boolean().optional(),
  flashSaleDiscountPercent: z
    .union([z.number().int().min(1).max(99), z.null()])
    .optional(),
});

const updateProductSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(3).optional(),
  slug: z.string().min(3).optional(),
  sku: z.string().min(3).optional(),
  category: z.string().min(3).optional(),
  price: z.number().positive().optional(),
  cost: z.union([z.number().min(0), z.null()]).optional(),
  originalPrice: z.number().positive().optional(),
  pixDiscountPercent: z.number().min(0).max(100).optional(),
  installmentQuantity: z.number().int().min(1).optional(),
  installmentAmount: z.number().min(0).optional(),
  stock: z.number().int().min(0).optional(),
  rating: z.number().min(0).max(5).optional(),
  reviews: z.number().int().min(0).optional(),
  shortDescription: z.string().min(10).optional(),
  description: z.string().min(10).optional(),
  badge: z.string().optional(),
  coverImage: z.union([z.string(), z.null()]).optional(),
  images: z.array(z.string()).optional(),
  features: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  published: z.boolean().optional(),
  flashSaleActive: z.boolean().optional(),
  flashSaleDiscountPercent: z
    .union([z.number().int().min(1).max(99), z.null()])
    .optional(),
});

const deleteProductSchema = z.object({
  id: z.string().min(1),
});

function unauthorizedResponse() {
  return NextResponse.json(
    { error: "Nao autorizado." },
    { status: 403 },
  );
}

export async function GET() {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return unauthorizedResponse();
  }

  const products = await listAdminProducts();
  return NextResponse.json({ products });
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return unauthorizedResponse();
  }

  const body = await request.json();
  const result = createProductSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Dados invalidos para criar produto.", details: result.error.format() },
      { status: 400 },
    );
  }

  const payload = result.data;
  const normalized =
    payload.images !== undefined
      ? { ...payload, images: dedupeImageUrlsExact(payload.images) }
      : payload;

  const product = await createAdminProduct(normalized);
  return NextResponse.json({ product });
}

export async function PATCH(request: Request) {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return unauthorizedResponse();
  }

  const body = await request.json();
  const result = updateProductSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Dados invalidos para atualizar produto.", details: result.error.format() },
      { status: 400 },
    );
  }

  const { id, images, ...rest } = result.data;
  const updateData =
    images !== undefined ? { ...rest, images: dedupeImageUrlsExact(images) } : rest;

  const product = await updateAdminProduct(id, updateData);
  return NextResponse.json({ product });
}

export async function DELETE(request: Request) {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return unauthorizedResponse();
  }

  const body = await request.json();
  const result = deleteProductSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Dados invalidos para excluir produto." },
      { status: 400 },
    );
  }

  await deleteAdminProduct(result.data.id);
  return NextResponse.json({ ok: true });
}
