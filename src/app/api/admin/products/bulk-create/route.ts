import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createAdminProduct } from "@/lib/admin-server";
import { dedupeImageUrlsExact } from "@/lib/product-json";

const productInputSchema = z.object({
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
});

const bulkCreateSchema = z.object({
  items: z.array(productInputSchema).min(1).max(200),
});

function unauthorizedResponse() {
  return NextResponse.json({ error: "Nao autorizado." }, { status: 403 });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return unauthorizedResponse();
  }

  const body = await request.json();
  const parsed = bulkCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos para persistencia em lote." },
      { status: 400 },
    );
  }

  const created = [];
  const errors: Array<{ name: string; message: string }> = [];

  for (const item of parsed.data.items) {
    try {
      const normalized =
        item.images !== undefined
          ? { ...item, images: dedupeImageUrlsExact(item.images) }
          : item;

      const { product } = await createAdminProduct(normalized);
      created.push(product);
    } catch (error) {
      errors.push({
        name: item.name,
        message: error instanceof Error ? error.message : "Falha ao criar produto.",
      });
    }
  }

  return NextResponse.json({
    created,
    errors,
    ok: errors.length === 0,
  });
}
