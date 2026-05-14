/**
 * Migra dados de `prisma/dev.db` (SQLite legado) para o PostgreSQL configurado em `.env`
 * (`DATABASE_URL` / `DIRECT_URL`, ex.: Neon).
 *
 * Pré-requisitos:
 * - `prisma/dev.db` com o backup do SQLite antigo
 * - `npx prisma migrate deploy` já aplicado no Postgres (tabelas existentes)
 *
 * Uso:
 *   npx tsx scripts/migrate-sqlite-to-postgres.ts
 *   npx tsx scripts/migrate-sqlite-to-postgres.ts --dry-run
 *   npx tsx scripts/migrate-sqlite-to-postgres.ts --reset
 *   npx tsx scripts/migrate-sqlite-to-postgres.ts --skip=Order,OrderItem
 */

import path from "node:path";
import { existsSync } from "node:fs";
import Database from "better-sqlite3";
import { PrismaClient } from "@prisma/client";

const SQLITE_PATH = path.resolve(process.cwd(), "prisma", "dev.db");
const BATCH_SIZE = 500;

const argv = new Set(process.argv.slice(2));
const DRY_RUN = argv.has("--dry-run");
const RESET = argv.has("--reset");
const SKIP = new Set(
  (process.argv.find((a) => a.startsWith("--skip="))?.split("=")[1] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);

/** Ordem de insert (respeita FKs). */
const TABLES = [
  "User",
  "UserSavedAddress",
  "PasswordResetCode",
  "Product",
  "ProductVisit",
  "Cart",
  "CartItem",
  "Favorite",
  "Coupon",
  "Order",
  "OrderItem",
  "OrderItemReview",
  "CouponRedemption",
  "CheckoutEvent",
  "NotificationLog",
  "PaymentAttempt",
  "CartRecoveryToken",
  "StripeWebhookEvent",
  "NewsletterSubscription",
  "ContactMessage",
] as const;

type SqliteTable = (typeof TABLES)[number];

/** Ordem de TRUNCATE (filhos antes dos pais). */
const TRUNCATE_ORDER: SqliteTable[] = [
  "ContactMessage",
  "NewsletterSubscription",
  "StripeWebhookEvent",
  "CartRecoveryToken",
  "PaymentAttempt",
  "NotificationLog",
  "CheckoutEvent",
  "CouponRedemption",
  "OrderItemReview",
  "OrderItem",
  "Order",
  "Favorite",
  "CartItem",
  "Cart",
  "ProductVisit",
  "PasswordResetCode",
  "UserSavedAddress",
  "Coupon",
  "Product",
  "User",
];

const BOOLEAN_FIELDS: Partial<Record<SqliteTable, string[]>> = {
  Product: ["published"],
  Order: ["inventoryReserved"],
  Coupon: ["active"],
};

const DATE_FIELDS: Partial<Record<SqliteTable, string[]>> = {
  User: ["createdAt", "updatedAt"],
  UserSavedAddress: ["createdAt", "updatedAt"],
  PasswordResetCode: ["expiresAt", "usedAt", "createdAt"],
  Product: ["flashSaleEndsAt", "createdAt", "updatedAt"],
  ProductVisit: ["visitedAt", "createdAt"],
  Cart: ["updatedAt", "lastRecoveredAt"],
  Favorite: ["createdAt"],
  Coupon: ["expiresAt", "createdAt", "updatedAt"],
  Order: [
    "inventoryReservedAt",
    "inventoryReserveExpiresAt",
    "paidAt",
    "processingAt",
    "shippedAt",
    "deliveredAt",
    "canceledAt",
    "createdAt",
    "updatedAt",
  ],
  OrderItem: ["createdAt"],
  OrderItemReview: ["createdAt", "updatedAt"],
  CouponRedemption: ["createdAt"],
  CheckoutEvent: ["createdAt"],
  NotificationLog: ["createdAt"],
  PaymentAttempt: ["createdAt", "updatedAt"],
  CartRecoveryToken: ["expiresAt", "usedAt", "createdAt"],
  StripeWebhookEvent: ["processedAt"],
  NewsletterSubscription: ["createdAt"],
  ContactMessage: ["createdAt"],
};

function toDate(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  if (typeof value === "number") {
    const ms = value > 10_000_000_000 ? value : value * 1000;
    const d = new Date(ms);
    return Number.isFinite(d.getTime()) ? d : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const d = new Date(trimmed);
    return Number.isFinite(d.getTime()) ? d : null;
  }
  return null;
}

function toBool(value: unknown): boolean | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    return value === "1" || value.toLowerCase() === "true";
  }
  return null;
}

function normalizeRow(
  table: SqliteTable,
  row: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...row };
  for (const field of BOOLEAN_FIELDS[table] ?? []) {
    if (field in out) out[field] = toBool(out[field]);
  }
  for (const field of DATE_FIELDS[table] ?? []) {
    if (field in out) out[field] = toDate(out[field]);
  }
  if (table === "OrderItem") {
    const qty = out.quantity;
    const unit = out.unitPriceInCents;
    const line = out.lineTotalInCents;
    if (
      (line === null || line === undefined || line === 0) &&
      typeof qty === "number" &&
      typeof unit === "number"
    ) {
      out.lineTotalInCents = qty * unit;
    }
  }
  return out;
}

/** Wrapper tipado frouxo: linhas vêm do SQLite com colunas parciais. */
type CreateManyFn = (args: {
  data: Record<string, unknown>[];
  skipDuplicates?: boolean;
}) => Promise<{ count: number }>;

function getDelegate(prisma: PrismaClient, table: SqliteTable): CreateManyFn {
  const asFn = (fn: unknown): CreateManyFn => fn as unknown as CreateManyFn;
  const map: Record<SqliteTable, CreateManyFn> = {
    User: asFn(prisma.user.createMany.bind(prisma.user)),
    UserSavedAddress: asFn(
      prisma.userSavedAddress.createMany.bind(prisma.userSavedAddress),
    ),
    PasswordResetCode: asFn(
      prisma.passwordResetCode.createMany.bind(prisma.passwordResetCode),
    ),
    Product: asFn(prisma.product.createMany.bind(prisma.product)),
    ProductVisit: asFn(prisma.productVisit.createMany.bind(prisma.productVisit)),
    Cart: asFn(prisma.cart.createMany.bind(prisma.cart)),
    CartItem: asFn(prisma.cartItem.createMany.bind(prisma.cartItem)),
    Favorite: asFn(prisma.favorite.createMany.bind(prisma.favorite)),
    Coupon: asFn(prisma.coupon.createMany.bind(prisma.coupon)),
    Order: asFn(prisma.order.createMany.bind(prisma.order)),
    OrderItem: asFn(prisma.orderItem.createMany.bind(prisma.orderItem)),
    OrderItemReview: asFn(
      prisma.orderItemReview.createMany.bind(prisma.orderItemReview),
    ),
    CouponRedemption: asFn(
      prisma.couponRedemption.createMany.bind(prisma.couponRedemption),
    ),
    CheckoutEvent: asFn(
      prisma.checkoutEvent.createMany.bind(prisma.checkoutEvent),
    ),
    NotificationLog: asFn(
      prisma.notificationLog.createMany.bind(prisma.notificationLog),
    ),
    PaymentAttempt: asFn(
      prisma.paymentAttempt.createMany.bind(prisma.paymentAttempt),
    ),
    CartRecoveryToken: asFn(
      prisma.cartRecoveryToken.createMany.bind(prisma.cartRecoveryToken),
    ),
    StripeWebhookEvent: asFn(
      prisma.stripeWebhookEvent.createMany.bind(prisma.stripeWebhookEvent),
    ),
    NewsletterSubscription: asFn(
      prisma.newsletterSubscription.createMany.bind(prisma.newsletterSubscription),
    ),
    ContactMessage: asFn(
      prisma.contactMessage.createMany.bind(prisma.contactMessage),
    ),
  };
  return map[table];
}

async function migrate() {
  if (!existsSync(SQLITE_PATH)) {
    throw new Error(
      `SQLite não encontrado em ${SQLITE_PATH}. Copie o dev.db antigo para prisma/dev.db.`,
    );
  }

  const sqlite = new Database(SQLITE_PATH, { readonly: true });
  const prisma = new PrismaClient({ log: ["warn", "error"] });

  try {
    if (RESET && !DRY_RUN) {
      const quoted = TRUNCATE_ORDER.map((t) => `"${t}"`).join(",\n    ");
      console.log("[reset] TRUNCATE … CASCADE no Postgres");
      await prisma.$executeRawUnsafe(
        `TRUNCATE TABLE\n    ${quoted}\n  RESTART IDENTITY CASCADE;`,
      );
    }

    const summary: Array<{ table: string; lidas: number; inseridas: number }> =
      [];

    for (const table of TABLES) {
      if (SKIP.has(table)) {
        console.log(`[skip] ${table} (--skip)`);
        continue;
      }

      const exists = sqlite
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
        )
        .get(table) as { name: string } | undefined;
      if (!exists) {
        console.log(`[skip] ${table} não existe no SQLite`);
        continue;
      }

      const cols = (
        sqlite.prepare(`PRAGMA table_info("${table}")`).all() as Array<{
          name: string;
        }>
      ).map((c) => c.name);

      const colsSql = cols.map((c) => `"${c}"`).join(", ");
      const rows = sqlite
        .prepare(`SELECT ${colsSql} FROM "${table}"`)
        .all() as Array<Record<string, unknown>>;

      const normalized = rows.map((r) => normalizeRow(table, r));

      console.log(
        `[${table}] lidas ${normalized.length} linhas (${cols.length} colunas)`,
      );

      if (DRY_RUN) {
        summary.push({ table, lidas: normalized.length, inseridas: 0 });
        continue;
      }

      const delegate = getDelegate(prisma, table);
      let inserted = 0;
      for (let i = 0; i < normalized.length; i += BATCH_SIZE) {
        const chunk = normalized.slice(i, i + BATCH_SIZE);
        const res = await delegate({
          data: chunk,
          skipDuplicates: true,
        });
        inserted += res.count;
      }
      console.log(`[${table}] inseridas ${inserted}/${normalized.length}`);
      summary.push({ table, lidas: normalized.length, inseridas: inserted });
    }

    console.log("\n=== Resumo ===");
    console.table(summary);
  } finally {
    sqlite.close();
    await prisma.$disconnect();
  }
}

migrate().catch((err) => {
  console.error("[migrate] falhou:", err);
  process.exit(1);
});
