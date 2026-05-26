import { randomUUID } from "crypto";
import {
  parseStringArray,
  stringifyStringArray,
} from "@/lib/product-json";
import type { Product as ProductType } from "@/lib/types";
import type { Prisma, Product as PrismaProduct } from "@prisma/client";
import { getPrismaOrNull } from "@/lib/prisma";
import { getEmailKindForOrderStatus, orderToEmailOrder, sendOrderEmail } from "@/lib/email";
import { resolveFlashSaleEndsAt } from "@/lib/flash-sale";
import {
  expireStaleFlashSales,
  fetchFlashSaleDiscountMap,
} from "@/lib/prisma-product-map";
import {
  maybeEnrichPackageOnCreate,
  type PackageEstimateResult,
} from "@/lib/package-dimensions-ai";
import { clampPackageCm, clampPackageKg } from "@/lib/package-dimensions";

function isMissingFlashSaleDiscountFieldError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes("flashSaleDiscountPercent")
  );
}

type PackageDbPatch = {
  packageWidthCm: number | null;
  packageHeightCm: number | null;
  packageLengthCm: number | null;
  packageWeightKg: number | null;
};

function normalizePackageDbPatch(input: {
  packageWidthCm?: number | null;
  packageHeightCm?: number | null;
  packageLengthCm?: number | null;
  packageWeightKg?: number | null;
}): PackageDbPatch | undefined {
  if (
    input.packageWidthCm === undefined &&
    input.packageHeightCm === undefined &&
    input.packageLengthCm === undefined &&
    input.packageWeightKg === undefined
  ) {
    return undefined;
  }

  return {
    packageWidthCm:
      input.packageWidthCm != null ? clampPackageCm(input.packageWidthCm) : null,
    packageHeightCm:
      input.packageHeightCm != null ? clampPackageCm(input.packageHeightCm) : null,
    packageLengthCm:
      input.packageLengthCm != null ? clampPackageCm(input.packageLengthCm) : null,
    packageWeightKg:
      input.packageWeightKg != null ? clampPackageKg(input.packageWeightKg) : null,
  };
}

type DbClient = NonNullable<ReturnType<typeof getPrismaOrNull>>;

async function persistFlashSaleDiscountPercentRaw(
  prisma: DbClient,
  productId: string,
  percent: number | null,
): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(
      "UPDATE Product SET flashSaleDiscountPercent = ? WHERE id = ?",
      percent,
      productId,
    );
  } catch {
    // Compat: coluna pode nao existir em bancos ainda nao migrados.
  }
}

export function dbProductToProduct(product: PrismaProduct): ProductType {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    category: product.category as ProductType["category"],
    price: product.priceInCents / 100,
    cost: (() => {
      const c = (product as { costInCents?: number | null }).costInCents;
      return c != null && c > 0 ? c / 100 : undefined;
    })(),
    originalPrice: product.originalPriceInCents
      ? product.originalPriceInCents / 100
      : undefined,
    pixDiscountPercent: product.pixDiscountPercent,
    installment: {
      quantity: product.installmentQuantity,
      amount: product.installmentAmountInCents / 100,
    },
    stock: product.stock,
    rating: product.rating,
    reviews: product.reviews,
    shortDescription: product.shortDescription,
    description: product.description,
    badge: product.badge ?? undefined,
    sku: product.sku,
    coverImage: product.coverImage ?? undefined,
    images: parseStringArray(product.images),
    features: parseStringArray(product.features),
    tags: parseStringArray(product.tags) as ProductType["tags"],
    published: product.published,
    flashSaleEndsAt: product.flashSaleEndsAt?.toISOString() ?? null,
    flashSaleDiscountPercent: product.flashSaleDiscountPercent ?? null,
    packageWidthCm: product.packageWidthCm ?? null,
    packageHeightCm: product.packageHeightCm ?? null,
    packageLengthCm: product.packageLengthCm ?? null,
    packageWeightKg: product.packageWeightKg ?? null,
  };
}

export async function listAdminProducts(): Promise<ProductType[]> {
  const prisma = getPrismaOrNull();

  if (!prisma) {
    throw new Error("Banco de dados nao configurado.");
  }

  await expireStaleFlashSales(prisma);
  const products = await prisma.product.findMany({ orderBy: { createdAt: "desc" } });
  const mapped = products.map((row) => dbProductToProduct(row));
  const discountById = await fetchFlashSaleDiscountMap(
    prisma,
    mapped.map((p) => p.id),
  );
  return mapped.map((product) => ({
    ...product,
    flashSaleDiscountPercent:
      discountById.get(product.id) ?? product.flashSaleDiscountPercent ?? null,
  }));
}

export type AdminProductCreateInput = {
  name: string;
  slug: string;
  sku: string;
  category: string;
  price: number;
  cost?: number | null;
  originalPrice?: number;
  pixDiscountPercent?: number;
  installmentQuantity?: number;
  installmentAmount?: number;
  stock?: number;
  rating?: number;
  reviews?: number;
  shortDescription: string;
  description: string;
  badge?: string;
  coverImage?: string | null;
  images?: string[];
  features?: string[];
  tags?: string[];
  published?: boolean;
  /** Ao criar: inicia janela de 24h de Oferta Relampago. */
  flashSaleActive?: boolean;
  /** 1–99 exibido na vitrine durante a oferta; ignorado se sem oferta relâmpago. */
  flashSaleDiscountPercent?: number | null;
  packageWidthCm?: number | null;
  packageHeightCm?: number | null;
  packageLengthCm?: number | null;
  packageWeightKg?: number | null;
};

export type AdminProductUpdateInput = Partial<AdminProductCreateInput>;

export type AdminProductCreateResult = {
  product: ProductType;
  packageAiEstimate?: PackageEstimateResult;
};

export async function createAdminProduct(
  input: AdminProductCreateInput,
): Promise<AdminProductCreateResult> {
  const prisma = getPrismaOrNull();

  if (!prisma) {
    throw new Error("Banco de dados nao configurado.");
  }

  const { input: enrichedInput, estimate: packageAiEstimate } =
    await maybeEnrichPackageOnCreate(input);
  input = enrichedInput;

  const flashEndsAt = resolveFlashSaleEndsAt(null, input.flashSaleActive ?? false);
  const pIn = input.flashSaleDiscountPercent;
  const flashPct =
    flashEndsAt != null &&
    pIn != null &&
    pIn >= 1 &&
    pIn <= 99
      ? pIn
      : null;

  const baseData = {
    id: randomUUID(),
    name: input.name,
    slug: input.slug,
    sku: input.sku,
    category: input.category,
    priceInCents: Math.round(input.price * 100),
    costInCents:
      input.cost != null && input.cost > 0 ? Math.round(input.cost * 100) : null,
    originalPriceInCents: input.originalPrice
      ? Math.round(input.originalPrice * 100)
      : null,
    pixDiscountPercent: input.pixDiscountPercent ?? 0,
    installmentQuantity: input.installmentQuantity ?? 1,
    installmentAmountInCents: Math.round(
      (input.installmentAmount ?? 0) * 100,
    ),
    stock: input.stock ?? 0,
    rating: input.rating ?? 0,
    reviews: input.reviews ?? 0,
    shortDescription: input.shortDescription,
    description: input.description,
    badge: input.badge ?? null,
    coverImage: input.coverImage ?? null,
    published: input.published ?? true,
    images: stringifyStringArray(input.images),
    features: stringifyStringArray(input.features),
    tags: stringifyStringArray(input.tags),
    flashSaleEndsAt: flashEndsAt,
  } as const;

  const packagePatch = normalizePackageDbPatch(input);

  let product: PrismaProduct;
  try {
    product = await prisma.product.create({
      data: {
        ...baseData,
        flashSaleDiscountPercent: flashPct,
        ...(packagePatch ?? {}),
      },
    });
  } catch (error) {
    if (!isMissingFlashSaleDiscountFieldError(error)) {
      throw error;
    }
    product = await prisma.product.create({
      data: {
        ...baseData,
        ...(packagePatch ?? {}),
      },
    });
    if (flashPct !== null) {
      await persistFlashSaleDiscountPercentRaw(prisma, product.id, flashPct);
    }
  }

  return {
    product: dbProductToProduct(product),
    packageAiEstimate,
  };
}

export async function updateAdminProduct(
  productId: string,
  input: AdminProductUpdateInput,
): Promise<ProductType> {
  const prisma = getPrismaOrNull();

  if (!prisma) {
    throw new Error("Banco de dados nao configurado.");
  }

  const updateData: Record<string, unknown> = {};

  if (input.name !== undefined) updateData.name = input.name;
  if (input.slug !== undefined) updateData.slug = input.slug;
  if (input.sku !== undefined) updateData.sku = input.sku;
  if (input.category !== undefined) updateData.category = input.category;
  if (input.price !== undefined) updateData.priceInCents = Math.round(input.price * 100);
  if (input.cost !== undefined) {
    updateData.costInCents =
      input.cost == null || input.cost <= 0 ? null : Math.round(input.cost * 100);
  }
  if (input.originalPrice !== undefined)
    updateData.originalPriceInCents = Math.round(input.originalPrice * 100);
  if (input.pixDiscountPercent !== undefined)
    updateData.pixDiscountPercent = input.pixDiscountPercent;
  if (input.installmentQuantity !== undefined)
    updateData.installmentQuantity = input.installmentQuantity;
  if (input.installmentAmount !== undefined)
    updateData.installmentAmountInCents = Math.round(
      input.installmentAmount * 100,
    );
  if (input.stock !== undefined) updateData.stock = input.stock;
  if (input.rating !== undefined) updateData.rating = input.rating;
  if (input.reviews !== undefined) updateData.reviews = input.reviews;
  if (input.shortDescription !== undefined)
    updateData.shortDescription = input.shortDescription;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.badge !== undefined) updateData.badge = input.badge || null;
  if (input.coverImage !== undefined) updateData.coverImage = input.coverImage || null;
  if (input.images !== undefined) updateData.images = stringifyStringArray(input.images);
  if (input.features !== undefined) updateData.features = stringifyStringArray(input.features);
  if (input.tags !== undefined) updateData.tags = stringifyStringArray(input.tags);
  if (input.published !== undefined) updateData.published = input.published;

  const packagePatch = normalizePackageDbPatch(input);

  if (input.flashSaleActive !== undefined) {
    const existing = await prisma.product.findUnique({
      where: { id: productId },
      select: { flashSaleEndsAt: true },
    });
    if (!existing) {
      throw new Error("Produto nao encontrado.");
    }
    updateData.flashSaleEndsAt = resolveFlashSaleEndsAt(
      existing.flashSaleEndsAt,
      input.flashSaleActive,
    );
    if (!input.flashSaleActive) {
      updateData.flashSaleDiscountPercent = null;
    }
  }

  if (
    input.flashSaleDiscountPercent !== undefined &&
    input.flashSaleActive !== false
  ) {
    updateData.flashSaleDiscountPercent = input.flashSaleDiscountPercent;
  }
  const desiredFlashSalePercent =
    input.flashSaleActive === false
      ? null
      : input.flashSaleDiscountPercent !== undefined
        ? input.flashSaleDiscountPercent
        : undefined;

  if (packagePatch) {
    Object.assign(updateData, packagePatch);
  }

  let product: PrismaProduct;
  try {
    product = await prisma.product.update({
      where: { id: productId },
      data: updateData,
    });
  } catch (error) {
    if (isMissingFlashSaleDiscountFieldError(error)) {
      const fallbackData = { ...updateData };
      delete (fallbackData as { flashSaleDiscountPercent?: unknown })
        .flashSaleDiscountPercent;
      product = await prisma.product.update({
        where: { id: productId },
        data: fallbackData,
      });
      if (desiredFlashSalePercent !== undefined) {
        await persistFlashSaleDiscountPercentRaw(
          prisma,
          productId,
          desiredFlashSalePercent,
        );
      }
    } else {
      throw error;
    }
  }

  return dbProductToProduct(product);
}

export async function deleteAdminProduct(productId: string) {
  const prisma = getPrismaOrNull();

  if (!prisma) {
    throw new Error("Banco de dados nao configurado.");
  }

  await prisma.product.delete({ where: { id: productId } });
}

// Order management
export type AdminOrder = {
  id: string;
  status: string;
  totalInCents: number;
  customerName: string;
  customerEmail: string;
  shippingInCents: number;
  fulfillmentType: string;
  pickupCode?: string | null;
  shippingCode?: string;
  shippingCarrier?: string;
  melhorEnvioServiceId?: string | null;
  melhorEnvioShipmentId?: string | null;
  melhorEnvioStatus?: string | null;
  melhorEnvioError?: string | null;
  trackingUrl?: string;
  invoiceUrl?: string;
  createdAt: Date;
  paidAt?: Date;
  items: {
    productName: string;
    quantity: number;
    unitPriceInCents: number;
  }[];
};

export async function listAdminOrders(): Promise<AdminOrder[]> {
  const prisma = getPrismaOrNull();

  if (!prisma) {
    throw new Error("Banco de dados nao configurado.");
  }

  const orders = await prisma.order.findMany({
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  return orders.map((order) => ({
    id: order.id,
    status: order.status,
    totalInCents: order.totalInCents,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    shippingInCents: order.shippingInCents,
    fulfillmentType: order.fulfillmentType,
    pickupCode: order.pickupCode,
    shippingCode: order.shippingCode ?? undefined,
    shippingCarrier: order.shippingCarrier ?? undefined,
    melhorEnvioServiceId: order.melhorEnvioServiceId,
    melhorEnvioShipmentId: order.melhorEnvioShipmentId,
    melhorEnvioStatus: order.melhorEnvioStatus,
    melhorEnvioError: order.melhorEnvioError,
    trackingUrl: order.trackingUrl ?? undefined,
    invoiceUrl: order.invoiceUrl ?? undefined,
    createdAt: order.createdAt,
    paidAt: order.paidAt ?? undefined,
    items: order.items.map((item) => ({
      productName: item.productName,
      quantity: item.quantity,
      unitPriceInCents: item.unitPriceInCents,
    })),
  }));
}

export async function updateOrderStatus(
  orderId: string,
  input: {
    status: string;
    shippingCode?: string | null;
    shippingCarrier?: string | null;
    trackingUrl?: string | null;
    invoiceUrl?: string | null;
  },
) {
  const prisma = getPrismaOrNull();

  if (!prisma) {
    throw new Error("Banco de dados nao configurado.");
  }

  const existing = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!existing) {
    throw new Error("Pedido nao encontrado.");
  }

  const now = new Date();
  const updateData: Record<string, unknown> = {
    status: input.status,
    shippingCode: input.shippingCode || null,
    shippingCarrier: input.shippingCarrier || null,
    trackingUrl: input.trackingUrl || null,
    invoiceUrl: input.invoiceUrl || null,
  };

  if (input.status === "PROCESSING" && !existing.processingAt) {
    updateData.processingAt = now;
  }
  if (input.status === "SHIPPED" && !existing.shippedAt) {
    updateData.shippedAt = now;
  }
  if (input.status === "DELIVERED" && !existing.deliveredAt) {
    updateData.deliveredAt = now;
  }
  if (input.status === "CANCELED" && !existing.canceledAt) {
    updateData.canceledAt = now;
  }

  const order = await prisma.order.update({
    where: { id: orderId },
    data: {
      ...updateData,
      checkoutEvents: {
        create: {
          userId: existing.userId,
          type: "ADMIN_STATUS_UPDATED",
          message: `Status alterado de ${existing.status} para ${input.status}.`,
          metadata: JSON.stringify({
            shippingCode: input.shippingCode || null,
            shippingCarrier: input.shippingCarrier || null,
            trackingUrl: input.trackingUrl || null,
            invoiceUrl: input.invoiceUrl || null,
          }),
        },
      },
    },
    include: { items: true },
  });

  if (existing.status !== input.status) {
    const emailKind = getEmailKindForOrderStatus(input.status);
    if (emailKind) {
      await sendOrderEmail(emailKind, orderToEmailOrder(order));
    }
  }

  return order;
}

const COUNTED_ORDER_STATUSES = [
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
] as const;

const PENDING_ORDER_STATUSES = [
  "PENDING_PAYMENT",
  "DRAFT",
  "REQUIRES_REVIEW",
] as const;

const LOW_STOCK_MAX = 10;

const AMERICA_SAO_PAULO = "America/Sao_Paulo";

function getBrtYmd(d: Date): { y: number; m: number; da: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: AMERICA_SAO_PAULO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(d);
  const y = Number(parts.find((p) => p.type === "year")!.value);
  const m = Number(parts.find((p) => p.type === "month")!.value) - 1;
  const da = Number(parts.find((p) => p.type === "day")!.value);
  return { y, m, da };
}

/** BRT meia-noite como instante UTC (BRT = UTC-3 o ano todo). */
function brtDayStartUtc(y: number, m: number, da: number): Date {
  return new Date(Date.UTC(y, m, da, 3, 0, 0, 0));
}

function brtTodayRange(): { start: Date; end: Date } {
  const { y, m, da } = getBrtYmd(new Date());
  const start = brtDayStartUtc(y, m, da);
  const end = new Date(start.getTime() + 86400000);
  return { start, end };
}

function brtYesterdayRange(todayStart: Date): { start: Date; end: Date } {
  const end = todayStart;
  const start = new Date(todayStart.getTime() - 86400000);
  return { start, end };
}

function formatBrlFromCents(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatRevenueChangeVsYesterday(todayCents: number, yesterdayCents: number): string {
  if (todayCents <= 0 && yesterdayCents <= 0) {
    return "Igual a ontem";
  }
  if (yesterdayCents <= 0) {
    return "+100% vs. ontem";
  }
  const pct = Math.round(((todayCents - yesterdayCents) / yesterdayCents) * 100);
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct}% vs. ontem`;
}

function formatPercentPt(value: number, fractionDigits = 1): string {
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}%`;
}

function orderCountedInTimeRange(
  start: Date,
  end: Date,
): {
  status: { in: string[] };
  OR: Array<
    | { paidAt: { gte: Date; lt: Date } }
    | { AND: [{ paidAt: null }, { createdAt: { gte: Date; lt: Date } }] }
  >;
} {
  return {
    status: { in: [...COUNTED_ORDER_STATUSES] },
    OR: [
      { paidAt: { gte: start, lt: end } },
      {
        AND: [{ paidAt: null }, { createdAt: { gte: start, lt: end } }],
      },
    ],
  };
}

export type AdminDashboardMetric = {
  label: string;
  value: string;
  change: string;
};

export async function getAdminDashboardMetrics(): Promise<AdminDashboardMetric[]> {
  const prisma = getPrismaOrNull();

  if (!prisma) {
    return [
      {
        label: "Faturamento do dia",
        value: formatBrlFromCents(0),
        change: "Configure o banco de dados",
      },
      {
        label: "Pedidos pendentes",
        value: "0",
        change: "Configure o banco de dados",
      },
      {
        label: "Produtos com baixo estoque",
        value: "0",
        change: "Limite: ate 10 un.",
      },
      {
        label: "Conversao da campanha",
        value: "0,0%",
        change: "Cupons nos pedidos (30 dias)",
      },
    ];
  }

  const today = brtTodayRange();
  const yesterday = brtYesterdayRange(today.start);
  const periodEnd = today.end;
  const last30Start = new Date(periodEnd.getTime() - 30 * 86400000);
  const prev30Start = new Date(periodEnd.getTime() - 60 * 86400000);
  const prev30End = last30Start;

  const [
    revenueTodayCents,
    revenueYesterdayCents,
    pendingCount,
    pendingNewToday,
    pendingNewYesterday,
    lowStockCount,
    outOfStockCount,
    paidLast30,
    paidWithCouponLast30,
    paidPrev30,
    paidWithCouponPrev30,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: orderCountedInTimeRange(today.start, today.end),
      _sum: { totalInCents: true },
    }),
    prisma.order.aggregate({
      where: orderCountedInTimeRange(yesterday.start, yesterday.end),
      _sum: { totalInCents: true },
    }),
    prisma.order.count({
      where: { status: { in: [...PENDING_ORDER_STATUSES] } },
    }),
    prisma.order.count({
      where: {
        status: { in: [...PENDING_ORDER_STATUSES] },
        createdAt: { gte: today.start, lt: today.end },
      },
    }),
    prisma.order.count({
      where: {
        status: { in: [...PENDING_ORDER_STATUSES] },
        createdAt: { gte: yesterday.start, lt: yesterday.end },
      },
    }),
    prisma.product.count({
      where: { stock: { lte: LOW_STOCK_MAX } },
    }),
    prisma.product.count({
      where: { stock: { lte: 0 } },
    }),
    prisma.order.count({
      where: orderCountedInTimeRange(last30Start, periodEnd),
    }),
    prisma.order.count({
      where: {
        ...orderCountedInTimeRange(last30Start, periodEnd),
        couponId: { not: null },
      },
    }),
    prisma.order.count({
      where: orderCountedInTimeRange(prev30Start, prev30End),
    }),
    prisma.order.count({
      where: {
        ...orderCountedInTimeRange(prev30Start, prev30End),
        couponId: { not: null },
      },
    }),
  ]);

  const todaySum = revenueTodayCents._sum.totalInCents ?? 0;
  const yestSum = revenueYesterdayCents._sum.totalInCents ?? 0;

  const convNow = paidLast30 > 0 ? (paidWithCouponLast30 / paidLast30) * 100 : 0;
  const convPrev = paidPrev30 > 0 ? (paidWithCouponPrev30 / paidPrev30) * 100 : 0;
  const convDiffPp = convNow - convPrev;
  const convDiffSign = convDiffPp > 0 ? "+" : "";

  const pendDiff = pendingNewToday - pendingNewYesterday;
  const pendSign = pendDiff > 0 ? "+" : "";

  return [
    {
      label: "Faturamento do dia",
      value: formatBrlFromCents(todaySum),
      change: formatRevenueChangeVsYesterday(todaySum, yestSum),
    },
    {
      label: "Pedidos pendentes",
      value: String(pendingCount),
      change:
        pendingNewToday === 0 && pendingNewYesterday === 0
          ? "Sem novos pedidos pendentes hoje"
          : `${pendSign}${pendDiff} vs. ontem (novos)`,
    },
    {
      label: "Produtos com baixo estoque",
      value: String(lowStockCount),
      change:
        outOfStockCount > 0
          ? `${outOfStockCount} sem estoque no catalogo`
          : `Limite: ate ${LOW_STOCK_MAX} un.`,
    },
    {
      label: "Conversao da campanha",
      value: formatPercentPt(convNow),
      change:
        paidLast30 === 0
          ? "Sem pedidos pagos nos ultimos 30 dias"
          : `${convDiffSign}${convDiffPp.toLocaleString("pt-BR", {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })} p.p. vs. 30 dias anteriores`,
    },
  ];
}

function monthKeyFromDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function lastNMonthKeys(n: number) {
  const keys: string[] = [];
  const anchor = new Date();
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1);
    keys.push(monthKeyFromDate(d));
  }
  return keys;
}

function labelForMonthKey(key: string) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d
    .toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
    .replace(".", "");
}

export type SalesByMonthPoint = { month: string; sales: number };

export type BestSellerPoint = { name: string; sales: number };

export type SalesByCategoryPoint = { name: string; value: number };

// Analytics
export async function getSalesData(): Promise<{
  totalSales: number;
  salesByMonth: SalesByMonthPoint[];
}> {
  const prisma = getPrismaOrNull();

  if (!prisma) {
    return { totalSales: 0, salesByMonth: [] };
  }

  const orders = await prisma.order.findMany({
    where: { status: { in: [...COUNTED_ORDER_STATUSES] } },
    select: { totalInCents: true, paidAt: true, createdAt: true },
  });

  const totalSales = orders.reduce((sum, order) => sum + order.totalInCents, 0);

  const bucket = new Map<string, number>();
  for (const order of orders) {
    const ref = order.paidAt ?? order.createdAt;
    const key = monthKeyFromDate(ref);
    bucket.set(key, (bucket.get(key) ?? 0) + order.totalInCents);
  }

  const keys = lastNMonthKeys(12);
  const salesByMonth: SalesByMonthPoint[] = keys.map((key) => ({
    month: labelForMonthKey(key),
    sales: Math.round(((bucket.get(key) ?? 0) / 100) * 100) / 100,
  }));

  return { totalSales, salesByMonth };
}

export async function getBestSellersByQuantity(limit = 10): Promise<BestSellerPoint[]> {
  const prisma = getPrismaOrNull();

  if (!prisma) {
    return [];
  }

  const rows = await prisma.orderItem.groupBy({
    by: ["productName"],
    where: {
      order: { status: { in: [...COUNTED_ORDER_STATUSES] } },
    },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: limit,
  });

  return rows.map((row) => {
    const name =
      row.productName.length > 32
        ? `${row.productName.slice(0, 30)}…`
        : row.productName;
    return {
      name,
      sales: row._sum.quantity ?? 0,
    };
  });
}

export async function getSalesByCategory(): Promise<SalesByCategoryPoint[]> {
  const prisma = getPrismaOrNull();

  if (!prisma) {
    return [];
  }

  const rows = await prisma.orderItem.groupBy({
    by: ["category"],
    where: {
      order: { status: { in: [...COUNTED_ORDER_STATUSES] } },
    },
    _sum: { lineTotalInCents: true },
    orderBy: { _sum: { lineTotalInCents: "desc" } },
  });

  const points: SalesByCategoryPoint[] = rows
    .map((row) => {
      const cents = row._sum.lineTotalInCents ?? 0;
      const label = row.category?.trim() ? row.category.trim() : "Sem categoria";
      return {
        name: label,
        value: Math.round((cents / 100) * 100) / 100,
      };
    })
    .filter((p) => p.value > 0);

  const maxSlices = 10;
  if (points.length <= maxSlices) {
    return points;
  }

  const head = points.slice(0, maxSlices - 1);
  const tail = points.slice(maxSlices - 1);
  const otherValue =
    Math.round(tail.reduce((sum, p) => sum + p.value, 0) * 100) / 100;

  return [...head, { name: "Outros", value: otherValue }];
}

export type AdminReportPeriodSnapshot = {
  ordersCount: number;
  itemsQuantity: number;
  revenueBrl: number;
  ordersSubtotalBrl: number;
  discountsBrl: number;
  shippingBrl: number;
  merchandiseFromLinesBrl: number;
  cmvBrl: number;
  grossProfitBrl: number;
  avgTicketBrl: number;
  marginPercent: number | null;
  lineItemsCount: number;
  lineItemsWithCostCount: number;
};

export type AdminFinancialReportSummary = {
  databaseConfigured: boolean;
  allTime: AdminReportPeriodSnapshot;
  last30Days: AdminReportPeriodSnapshot;
};

function emptyReportSnapshot(): AdminReportPeriodSnapshot {
  return {
    ordersCount: 0,
    itemsQuantity: 0,
    revenueBrl: 0,
    ordersSubtotalBrl: 0,
    discountsBrl: 0,
    shippingBrl: 0,
    merchandiseFromLinesBrl: 0,
    cmvBrl: 0,
    grossProfitBrl: 0,
    avgTicketBrl: 0,
    marginPercent: null,
    lineItemsCount: 0,
    lineItemsWithCostCount: 0,
  };
}

function centsToBrlSnapshot(cents: number): number {
  return Math.round(cents) / 100;
}

/** CMV por produto sem passar pelo DMMF do Prisma (evita erro se `prisma generate` nao rodou apos adicionar costInCents). */
async function fetchProductUnitCostCentsById(
  prisma: NonNullable<ReturnType<typeof getPrismaOrNull>>,
  productIds: string[],
): Promise<Map<string, number | null>> {
  const map = new Map<string, number | null>();
  if (productIds.length === 0) {
    return map;
  }

  try {
    const rows = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, costInCents: true },
    });
    for (const row of rows) {
      map.set(row.id, row.costInCents ?? null);
    }
  } catch {
    // Coluna ausente (DB antigo) ou cliente desatualizado — relatorio segue com CMV zero.
  }

  return map;
}

async function computeOrderEconomicsSnapshot(
  prisma: NonNullable<ReturnType<typeof getPrismaOrNull>>,
  where: Prisma.OrderWhereInput,
): Promise<AdminReportPeriodSnapshot> {
  const orders = await prisma.order.findMany({
    where,
    select: {
      id: true,
      totalInCents: true,
      subtotalInCents: true,
      discountInCents: true,
      shippingInCents: true,
    },
  });

  if (orders.length === 0) {
    return emptyReportSnapshot();
  }

  const orderIds = orders.map((o) => o.id);
  const items = await prisma.orderItem.findMany({
    where: { orderId: { in: orderIds } },
    select: { quantity: true, lineTotalInCents: true, productId: true },
  });

  const productIds = [...new Set(items.map((i) => i.productId))];
  const costByProduct = await fetchProductUnitCostCentsById(prisma, productIds);

  let merchandiseCents = 0;
  let cmvCents = 0;
  let itemsQty = 0;
  let lineItemsWithCostCount = 0;

  for (const it of items) {
    merchandiseCents += it.lineTotalInCents;
    itemsQty += it.quantity;
    const unitCost = costByProduct.get(it.productId);
    if (unitCost != null && unitCost > 0) {
      cmvCents += unitCost * it.quantity;
      lineItemsWithCostCount += 1;
    }
  }

  const revenueCents = orders.reduce((s, o) => s + o.totalInCents, 0);
  const subtotalCents = orders.reduce((s, o) => s + o.subtotalInCents, 0);
  const discountCents = orders.reduce((s, o) => s + o.discountInCents, 0);
  const shippingCents = orders.reduce((s, o) => s + o.shippingInCents, 0);
  const grossProfitCents = merchandiseCents - cmvCents;
  const marginPercent =
    merchandiseCents > 0
      ? Math.round((grossProfitCents / merchandiseCents) * 1000) / 10
      : null;

  return {
    ordersCount: orders.length,
    itemsQuantity: itemsQty,
    revenueBrl: centsToBrlSnapshot(revenueCents),
    ordersSubtotalBrl: centsToBrlSnapshot(subtotalCents),
    discountsBrl: centsToBrlSnapshot(discountCents),
    shippingBrl: centsToBrlSnapshot(shippingCents),
    merchandiseFromLinesBrl: centsToBrlSnapshot(merchandiseCents),
    cmvBrl: centsToBrlSnapshot(cmvCents),
    grossProfitBrl: centsToBrlSnapshot(grossProfitCents),
    avgTicketBrl:
      orders.length > 0 ? centsToBrlSnapshot(revenueCents) / orders.length : 0,
    marginPercent,
    lineItemsCount: items.length,
    lineItemsWithCostCount,
  };
}

export async function getAdminFinancialReportSummary(): Promise<AdminFinancialReportSummary> {
  const prisma = getPrismaOrNull();

  if (!prisma) {
    return {
      databaseConfigured: false,
      allTime: emptyReportSnapshot(),
      last30Days: emptyReportSnapshot(),
    };
  }

  const end = new Date();
  const start30 = new Date(end.getTime() - 30 * 86400000);

  const [allTime, last30Days] = await Promise.all([
    computeOrderEconomicsSnapshot(prisma, {
      status: { in: [...COUNTED_ORDER_STATUSES] },
    }),
    computeOrderEconomicsSnapshot(prisma, orderCountedInTimeRange(start30, end)),
  ]);

  return { databaseConfigured: true, allTime, last30Days };
}

export async function getProductCategories(): Promise<string[]> {
  const prisma = getPrismaOrNull();

  if (!prisma) {
    return [];
  }

  const categories = await prisma.product.findMany({
    select: { category: true },
    distinct: ["category"],
  });

  return categories.map(c => c.category);
}
