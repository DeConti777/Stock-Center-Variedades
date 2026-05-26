/**
 * Remove cores hex (placeholders) de capa/galeria e consolida URLs reais
 * a partir de coverImage, images e snapshots em OrderItem.image.
 *
 * Uso:
 *   npx tsx scripts/repair-product-images.ts --dry-run
 *   npx tsx scripts/repair-product-images.ts --apply
 */

import path from "node:path";
import { existsSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import {
  dedupeImageUrlsExact,
  parseStringArray,
  stringifyStringArray,
} from "../src/lib/product-json";
import { isProductMediaUrl } from "../src/lib/product-media";

const argv = new Set(process.argv.slice(2));
const DRY_RUN = argv.has("--dry-run");
const APPLY = argv.has("--apply");

if (!DRY_RUN && !APPLY) {
  console.error(
    "\n[repair-product-images] Informe --dry-run (relatorio) ou --apply (grava no banco).\n",
  );
  process.exit(1);
}

const UPLOADS_DIR = path.resolve(process.cwd(), "public", "uploads", "products");

function isHexPlaceholder(value: string): boolean {
  const v = value.trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v);
}

function collectMediaUrls(values: (string | null | undefined)[]): string[] {
  const out: string[] = [];
  for (const raw of values) {
    if (raw == null) continue;
    const v = String(raw).trim();
    if (v && isProductMediaUrl(v)) {
      out.push(v);
    }
  }
  return out;
}

function localUploadExists(url: string): boolean | null {
  if (!url.startsWith("/uploads/products/")) {
    return null;
  }
  const filename = path.basename(url);
  if (!filename || filename === "." || filename === "..") {
    return false;
  }
  return existsSync(path.join(UPLOADS_DIR, filename));
}

type RepairRow = {
  id: string;
  slug: string;
  name: string;
  prevCover: string | null;
  prevImages: string[];
  hexRemoved: string[];
  fromOrders: string[];
  nextUrls: string[];
  missingFiles: string[];
};

async function main() {
  const prisma = new PrismaClient();

  try {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        coverImage: true,
        images: true,
      },
      orderBy: { slug: "asc" },
    });

    const orderItems = await prisma.orderItem.findMany({
      where: { image: { not: null } },
      select: { productId: true, image: true },
    });

    const orderUrlsByProduct = new Map<string, string[]>();
    for (const item of orderItems) {
      const img = item.image?.trim();
      if (!img || !isProductMediaUrl(img)) continue;
      const list = orderUrlsByProduct.get(item.productId) ?? [];
      list.push(img);
      orderUrlsByProduct.set(item.productId, list);
    }

    const rows: RepairRow[] = [];
    let wouldUpdate = 0;
    let noImagesAfter = 0;

    for (const product of products) {
      const prevImages = parseStringArray(product.images);
      const prevCover =
        product.coverImage != null && String(product.coverImage).trim() !== ""
          ? String(product.coverImage).trim()
          : null;

      const hexRemoved = [
        ...(prevCover && isHexPlaceholder(prevCover) ? [prevCover] : []),
        ...prevImages.filter(isHexPlaceholder),
      ];

      const orderUrls = collectMediaUrls(orderUrlsByProduct.get(product.id) ?? []);
      const prevMedia = dedupeImageUrlsExact([
        ...collectMediaUrls([prevCover]),
        ...collectMediaUrls(prevImages),
      ]);
      const fromOrders = orderUrls.filter((url) => !prevMedia.includes(url));

      const merged = dedupeImageUrlsExact([...prevMedia, ...orderUrls]);

      const nextCover = merged[0] ?? null;
      const nextImagesJson = stringifyStringArray(merged);
      const prevImagesJson = stringifyStringArray(prevImages);
      const normalizedPrevCover = prevCover ?? null;
      const changed =
        (nextCover ?? null) !== normalizedPrevCover || nextImagesJson !== prevImagesJson;

      const hasHex =
        hexRemoved.length > 0 ||
        prevImages.some(isHexPlaceholder) ||
        (prevCover != null && isHexPlaceholder(prevCover));

      if (!hasHex && !changed && merged.length === prevImages.length) {
        continue;
      }

      const missingFiles: string[] = [];
      for (const url of merged) {
        const exists = localUploadExists(url);
        if (exists === false) {
          missingFiles.push(url);
        }
      }

      if (merged.length === 0) {
        noImagesAfter += 1;
      }

      if (changed) {
        wouldUpdate += 1;
        if (APPLY) {
          await prisma.product.update({
            where: { id: product.id },
            data: {
              coverImage: nextCover,
              images: nextImagesJson,
            },
          });
        }
      }

      if (hasHex || changed || missingFiles.length > 0) {
        rows.push({
          id: product.id,
          slug: product.slug,
          name: product.name,
          prevCover: normalizedPrevCover,
          prevImages,
          hexRemoved: [...new Set(hexRemoved)],
          fromOrders: dedupeImageUrlsExact(fromOrders),
          nextUrls: merged,
          missingFiles,
        });
      }
    }

    const mode = APPLY ? "APPLY" : "DRY-RUN";
    console.log(`\n[repair-product-images] Modo: ${mode}\n`);
    console.log(`Produtos analisados: ${products.length}`);
    console.log(`Produtos com alteracao: ${wouldUpdate}`);
    console.log(`Produtos sem imagem apos reparo: ${noImagesAfter}\n`);

    for (const row of rows) {
      console.log(`--- ${row.slug} (${row.name})`);
      if (row.hexRemoved.length) {
        console.log(`  Hex removidos: ${row.hexRemoved.join(", ")}`);
      }
      if (row.fromOrders.length) {
        console.log(`  URLs recuperadas de pedidos: ${row.fromOrders.join(", ")}`);
      }
      console.log(`  Antes: capa=${row.prevCover ?? "(null)"} galeria=[${row.prevImages.join(", ")}]`);
      console.log(
        `  Depois: capa=${row.nextUrls[0] ?? "(null)"} galeria=[${row.nextUrls.join(", ")}]`,
      );
      if (row.missingFiles.length) {
        console.log(`  AVISO arquivo ausente em disco: ${row.missingFiles.join(", ")}`);
      }
      if (row.nextUrls.length === 0) {
        console.log("  AVISO: sem URL — reenviar fotos no admin.");
      }
      console.log("");
    }

    if (DRY_RUN) {
      console.log("Nenhuma alteracao gravada. Rode com --apply para atualizar o banco.\n");
    } else {
      console.log("Alteracoes gravadas no banco.\n");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[repair-product-images] Erro:", err);
  process.exit(1);
});
