import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { stringifyStringArray } from "../src/lib/product-json";
import { products } from "../src/lib/site-data";

function isPostgresUrl(value: string | undefined) {
  const u = value?.trim() ?? "";
  return u.startsWith("postgresql://") || u.startsWith("postgres://");
}

/** Falha cedo com mensagem clara (ex.: .env ainda com `file:./dev.db` do SQLite). */
function assertPostgresEnv() {
  const db = process.env.DATABASE_URL;
  const direct = process.env.DIRECT_URL;
  if (!isPostgresUrl(db)) {
    console.error(
      "\n[seed] DATABASE_URL invalida para este projeto (Prisma usa PostgreSQL).\n" +
        "  - No Neon: copie a string **Pooled** para DATABASE_URL (deve comecar com postgresql://).\n" +
        "  - Remova valores antigos como file:./dev.db do seu arquivo .env.\n" +
        "  - Veja o modelo em .env.example\n",
    );
    process.exit(1);
  }
  if (!isPostgresUrl(direct)) {
    console.error(
      "\n[seed] DIRECT_URL invalida ou ausente.\n" +
        "  - No Neon: copie a string **Direct** para DIRECT_URL (postgresql://...).\n" +
        "  - Veja .env.example\n",
    );
    process.exit(1);
  }
}

async function main() {
  assertPostgresEnv();
  const prisma = new PrismaClient();

  try {
    console.log("Populando produtos...");

    for (const product of products) {
      await prisma.product.upsert({
        where: { id: product.id },
        update: {
          slug: product.slug,
          name: product.name,
          category: product.category,
          priceInCents: Math.round(product.price * 100),
          originalPriceInCents: product.originalPrice
            ? Math.round(product.originalPrice * 100)
            : null,
          pixDiscountPercent: product.pixDiscountPercent,
          installmentQuantity: product.installment.quantity,
          installmentAmountInCents: Math.round(product.installment.amount * 100),
          stock: product.stock,
          rating: product.rating,
          reviews: product.reviews,
          shortDescription: product.shortDescription,
          description: product.description,
          badge: product.badge ?? null,
          sku: product.sku,
          images: stringifyStringArray(product.images),
          features: stringifyStringArray(product.features),
          tags: stringifyStringArray(product.tags),
          published: true,
        },
        create: {
          id: product.id,
          slug: product.slug,
          name: product.name,
          category: product.category,
          priceInCents: Math.round(product.price * 100),
          originalPriceInCents: product.originalPrice
            ? Math.round(product.originalPrice * 100)
            : null,
          pixDiscountPercent: product.pixDiscountPercent,
          installmentQuantity: product.installment.quantity,
          installmentAmountInCents: Math.round(product.installment.amount * 100),
          stock: product.stock,
          rating: product.rating,
          reviews: product.reviews,
          shortDescription: product.shortDescription,
          description: product.description,
          badge: product.badge ?? null,
          sku: product.sku,
          images: stringifyStringArray(product.images),
          features: stringifyStringArray(product.features),
          tags: stringifyStringArray(product.tags),
          published: true,
        },
      });
    }

    console.log("Criando usuario admin...");

    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    await prisma.user.upsert({
      where: { email: "admin@stockcentervariedades.com.br" },
      update: {
        name: "Administrador",
        role: "ADMIN",
        passwordHash,
      },
      create: {
        name: "Administrador",
        email: "admin@stockcentervariedades.com.br",
        role: "ADMIN",
        passwordHash,
      },
    });

    console.log("Criando cupom padrao...");

    await prisma.coupon.upsert({
      where: { code: "BEMVINDO10" },
      update: {
        type: "PERCENT",
        valuePercent: 10,
        valueInCents: null,
        maxUses: null,
        minSubtotalInCents: 0,
        active: true,
      },
      create: {
        code: "BEMVINDO10",
        type: "PERCENT",
        valuePercent: 10,
        valueInCents: null,
        maxUses: null,
        minSubtotalInCents: 0,
        active: true,
      },
    });

    console.log("Seed concluido com sucesso.");
    console.log("Admin: admin@stockcentervariedades.com.br");
    console.log("Senha: admin123");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Erro no seed:", error);
  process.exit(1);
});
