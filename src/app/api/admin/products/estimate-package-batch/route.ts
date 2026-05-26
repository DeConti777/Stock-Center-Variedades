import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { updateAdminProduct } from "@/lib/admin-server";
import {
  estimatePackageDimensions,
  getPackageAiMinConfidence,
} from "@/lib/package-dimensions-ai";
import { getPrismaOrNull } from "@/lib/prisma";
import { parseStringArray } from "@/lib/product-json";

const batchSchema = z.object({
  limit: z.number().int().min(1).max(50).optional(),
  productIds: z.array(z.string().min(1)).optional(),
});

function unauthorizedResponse() {
  return NextResponse.json({ error: "Nao autorizado." }, { status: 403 });
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return unauthorizedResponse();
  }

  const body = await request.json().catch(() => ({}));
  const parsed = batchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos para lote de embalagem." },
      { status: 400 },
    );
  }

  const prisma = getPrismaOrNull();
  if (!prisma) {
    return NextResponse.json(
      { error: "Banco de dados nao configurado." },
      { status: 503 },
    );
  }

  const limit = parsed.data.limit ?? 25;
  const where = parsed.data.productIds?.length
    ? { id: { in: parsed.data.productIds } }
    : {
        packageWidthCm: null,
        packageHeightCm: null,
        packageLengthCm: null,
        packageWeightKg: null,
      };

  const products = await prisma.product.findMany({
    where,
    take: limit,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      category: true,
      shortDescription: true,
      coverImage: true,
      images: true,
    },
  });

  let processed = 0;
  let updated = 0;
  let skipped = 0;
  const errors: Array<{ productId: string; name: string; message: string }> = [];

  for (const product of products) {
    processed += 1;
    try {
      const images = parseStringArray(product.images);
      const estimate = await estimatePackageDimensions({
        name: product.name,
        category: product.category,
        shortDescription: product.shortDescription,
        coverImage: product.coverImage,
        images,
      });

      const minConf = getPackageAiMinConfidence();
      if (
        estimate.packageWidthCm == null ||
        estimate.skippedReason ||
        estimate.confidence < minConf
      ) {
        skipped += 1;
        continue;
      }

      await updateAdminProduct(product.id, {
        packageWidthCm: estimate.packageWidthCm,
        packageHeightCm: estimate.packageHeightCm,
        packageLengthCm: estimate.packageLengthCm,
        packageWeightKg: estimate.packageWeightKg,
      });
      updated += 1;
    } catch (error) {
      errors.push({
        productId: product.id,
        name: product.name,
        message: error instanceof Error ? error.message : "Falha ao atualizar.",
      });
    }

    if (processed < products.length) {
      await delay(200);
    }
  }

  return NextResponse.json({
    processed,
    updated,
    skipped,
    errors,
    ok: errors.length === 0,
  });
}
