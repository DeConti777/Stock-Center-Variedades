import { parseStringArray } from "@/lib/product-json";
import { products as fallbackProducts } from "@/lib/site-data";
import { onlyDigits } from "@/lib/br-fields";
import { getPrismaOrNull } from "@/lib/prisma";
import { getShippingInCentsFromCep } from "@/lib/shipping";
import { quoteCartShipping } from "@/lib/shipping-quote";
import { applyFlashSalePricing } from "@/lib/flash-sale";
import { fetchFlashSaleDiscountMap } from "@/lib/prisma-product-map";
import {
  sanitizeCouponCode,
  validateCouponForSubtotal,
} from "@/lib/coupons";
import { getProductHeroSrc } from "@/lib/product-media";
import type {
  CartItem,
  FulfillmentType,
  PaymentMethodChoice,
  Product,
} from "@/lib/types";

export type StoreSnapshot = {
  cart: CartItem[];
  favorites: string[];
  visitedProductIds: string[];
  lastRecoveredAt: string | null;
};

export type CheckoutInput = {
  items: CartItem[];
  paymentMethod: PaymentMethodChoice;
  couponCode?: string | null;
  /** SHIP: entrega. PICKUP: retirada na loja sem frete. */
  fulfillmentType?: FulfillmentType;
  /** ID do servico Melhor Envio retornado em shippingOptions (PAC, SEDEX, etc.). */
  melhorEnvioServiceId?: number | null;
  shipping: {
    recipientName: string;
    email: string;
    phone: string;
    cpf: string;
    cep: string;
    city: string;
    state: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood?: string;
  };
};

export function calculateShippingInCents(cep: string) {
  return getShippingInCentsFromCep(cep);
}

function calculatePaymentUnitPriceInCents(
  product: Product,
  paymentMethod: PaymentMethodChoice,
) {
  let unitPrice = Math.round(product.price * 100);

  if (paymentMethod === "PIX") {
    unitPrice = Math.round(
      unitPrice * (1 - product.pixDiscountPercent / 100),
    );
  }

  return unitPrice;
}

export function normalizeCartItems(items: CartItem[]) {
  const map = new Map<string, number>();

  for (const item of items) {
    if (!item.productId || !Number.isFinite(item.quantity)) {
      continue;
    }

    const quantity = Math.max(0, Math.floor(item.quantity));

    if (quantity <= 0) {
      continue;
    }

    map.set(item.productId, (map.get(item.productId) || 0) + quantity);
  }

  return Array.from(map.entries()).map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
}

function distributeDiscountAcrossLines<
  T extends { baseLineTotalInCents: number; quantity: number },
>(items: T[], discountInCents: number) {
  const baseSubtotalInCents = items.reduce(
    (sum, item) => sum + item.baseLineTotalInCents,
    0,
  );
  const targetSubtotalInCents = Math.max(
    baseSubtotalInCents - Math.max(discountInCents, 0),
    0,
  );
  let allocatedInCents = 0;

  return items.map((item, index) => {
    const isLast = index === items.length - 1;
    const lineTotalInCents = isLast
      ? targetSubtotalInCents - allocatedInCents
      : Math.round(
          targetSubtotalInCents *
            (item.baseLineTotalInCents / baseSubtotalInCents),
        );

    allocatedInCents += lineTotalInCents;

    return {
      ...item,
      lineTotalInCents,
      unitPriceInCents:
        item.quantity > 0 ? Math.round(lineTotalInCents / item.quantity) : 0,
    };
  });
}

export async function getUserStoreSnapshot(userId: string): Promise<StoreSnapshot> {
  const prisma = getPrismaOrNull();

  if (!prisma) {
    return { cart: [], favorites: [], visitedProductIds: [], lastRecoveredAt: null };
  }

  const prismaWithOptionalVisit = prisma as typeof prisma & {
    productVisit?: {
      findMany: (args: {
        where: { userId: string };
        orderBy: { visitedAt: "desc" };
        select: { productId: true };
        take: number;
      }) => Promise<Array<{ productId: string }>>;
    };
  };

  const visitsPromise = prismaWithOptionalVisit.productVisit?.findMany
    ? prismaWithOptionalVisit.productVisit.findMany({
        where: { userId },
        orderBy: { visitedAt: "desc" },
        select: { productId: true },
        take: 100,
      })
    : Promise.resolve([]);

  const [cart, favorites, visits] = await Promise.all([
    prisma.cart.findUnique({
      where: { userId },
      include: {
        items: true,
      },
    }),
    prisma.favorite.findMany({
      where: { userId },
      select: { productId: true },
    }),
    visitsPromise,
  ]);

  return {
    cart: cart?.items.map((item) => ({ productId: item.productId, quantity: item.quantity })) || [],
    favorites: favorites.map((item) => item.productId),
    visitedProductIds: visits.map((item) => item.productId),
    lastRecoveredAt: cart?.lastRecoveredAt?.toISOString() || null,
  };
}

export async function syncUserCart(userId: string, items: CartItem[]) {
  const prisma = getPrismaOrNull();

  if (!prisma) {
    return;
  }

  const uniqueItems = items.filter((item) => item.quantity > 0);

  await prisma.cart.upsert({
    where: { userId },
    update: {
      lastRecoveredAt: new Date(),
      items: {
        deleteMany: {},
        create: uniqueItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      },
    },
    create: {
      userId,
      lastRecoveredAt: new Date(),
      items: {
        create: uniqueItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      },
    },
  });
}

export async function toggleUserFavorite(userId: string, productId: string) {
  const prisma = getPrismaOrNull();

  if (!prisma) {
    return { active: false };
  }

  const existing = await prisma.favorite.findFirst({
    where: { userId, productId },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    return { active: false };
  }

  await prisma.favorite.create({
    data: { userId, productId },
  });

  return { active: true };
}

export async function recordUserProductVisit(userId: string, productId: string) {
  const prisma = getPrismaOrNull();

  if (!prisma) {
    return;
  }

  const prismaWithOptionalVisit = prisma as typeof prisma & {
    productVisit?: {
      upsert: (args: {
        where: { userId_productId: { userId: string; productId: string } };
        update: { visitedAt: Date };
        create: { userId: string; productId: string };
      }) => Promise<unknown>;
    };
  };

  if (!prismaWithOptionalVisit.productVisit?.upsert) {
    return;
  }

  await prismaWithOptionalVisit.productVisit.upsert({
    where: { userId_productId: { userId, productId } },
    update: { visitedAt: new Date() },
    create: { userId, productId },
  });
}

export async function resolveProductsForCart(items: CartItem[]) {
  const prisma = getPrismaOrNull();

  if (prisma) {
    const dbProducts = await prisma.product.findMany({
      where: {
        id: {
          in: items.map((item) => item.productId),
        },
      },
    });

    const discountById = await fetchFlashSaleDiscountMap(
      prisma,
      dbProducts.map((p) => p.id),
    );
    const map = new Map(
      dbProducts.map((product) => [
        product.id,
        applyFlashSalePricing({
          id: product.id,
          slug: product.slug,
          name: product.name,
          category: product.category as Product["category"],
          price: product.priceInCents / 100,
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
          features: parseStringArray(product.features),
          badge: product.badge ?? undefined,
          sku: product.sku,
          coverImage: product.coverImage ?? undefined,
          images: parseStringArray(product.images),
          tags: parseStringArray(product.tags) as Product["tags"],
          flashSaleEndsAt: product.flashSaleEndsAt?.toISOString() ?? null,
          flashSaleDiscountPercent:
            discountById.get(product.id) ??
            (product as { flashSaleDiscountPercent?: number | null })
              .flashSaleDiscountPercent ??
            null,
          packageWidthCm: product.packageWidthCm ?? null,
          packageHeightCm: product.packageHeightCm ?? null,
          packageLengthCm: product.packageLengthCm ?? null,
          packageWeightKg: product.packageWeightKg ?? null,
        } satisfies Product),
      ]),
    );

    return items
      .map((item) => {
        const product = map.get(item.productId);
        return product ? { ...product, quantity: item.quantity } : null;
      })
      .filter(Boolean) as Array<Product & { quantity: number }>;
  }

  return items
    .map((item) => {
      const product = fallbackProducts.find((candidate) => candidate.id === item.productId);
      return product ? { ...product, quantity: item.quantity } : null;
    })
    .filter(Boolean) as Array<Product & { quantity: number }>;
}

export async function createDraftOrder(userId: string, input: CheckoutInput) {
  const prisma = getPrismaOrNull();

  if (!prisma) {
    throw new Error("Banco de dados nao configurado.");
  }

  const normalizedItems = normalizeCartItems(input.items);

  if (!normalizedItems.length) {
    throw new Error("Carrinho vazio.");
  }

  const normalizedCoupon = sanitizeCouponCode(input.couponCode) || null;
  const fulfillment: FulfillmentType =
    input.fulfillmentType === "PICKUP" ? "PICKUP" : "SHIP";
  const cepDigits = onlyDigits(input.shipping.cep, 8);
  const shippingQuote =
    fulfillment === "PICKUP"
      ? {
          shippingInCents: 0,
          shippingServiceId: null as string | null,
          shippingCarrier: null as string | null,
        }
      : await (async () => {
          const q = await quoteCartShipping(
            cepDigits,
            normalizedItems,
            input.melhorEnvioServiceId ?? null,
          );
          return {
            shippingInCents: q.shippingInCents,
            shippingServiceId: q.shippingServiceId,
            shippingCarrier: q.shippingCarrier,
          };
        })();

  const shippingAddressJson = JSON.stringify({
    ...input.shipping,
    fulfillmentType: fulfillment,
  });

  return prisma.$transaction(async (tx) => {
    const dbProducts = await tx.product.findMany({
      where: {
        id: {
          in: normalizedItems.map((item) => item.productId),
        },
      },
    });

    const discountById = await fetchFlashSaleDiscountMap(
      tx,
      dbProducts.map((p) => p.id),
    );
    const productsById = new Map(
      dbProducts.map((product) => [product.id, product]),
    );

    const cartProducts = normalizedItems.map((item) => {
      const product = productsById.get(item.productId);

      if (!product) {
        throw new Error("Um produto do carrinho nao existe mais.");
      }

      const priced = applyFlashSalePricing({
        id: product.id,
        slug: product.slug,
        name: product.name,
        category: product.category as Product["category"],
        price: product.priceInCents / 100,
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
        features: parseStringArray(product.features),
        badge: product.badge ?? undefined,
        sku: product.sku,
        coverImage: product.coverImage ?? undefined,
        images: parseStringArray(product.images),
        tags: parseStringArray(product.tags) as Product["tags"],
        flashSaleEndsAt: product.flashSaleEndsAt?.toISOString() ?? null,
        flashSaleDiscountPercent:
          discountById.get(product.id) ??
          (product as { flashSaleDiscountPercent?: number | null })
            .flashSaleDiscountPercent ??
          null,
      });
      return {
        ...priced,
        quantity: item.quantity,
      };
    });

    for (const item of cartProducts) {
      if (item.stock <= 0) {
        throw new Error(`O produto "${item.name}" nao esta disponivel.`);
      }
      if (item.quantity > item.stock) {
        throw new Error(
          `O produto "${item.name}" tem apenas ${item.stock} unidade(s) em estoque.`,
        );
      }
    }

    const baseOrderItems = cartProducts.map((item) => {
      const baseUnitPriceInCents = calculatePaymentUnitPriceInCents(
        item,
        input.paymentMethod,
      );

      return {
        productId: item.id,
        productName: item.name,
        productSlug: item.slug,
        category: item.category,
        quantity: item.quantity,
        baseUnitPriceInCents,
        baseLineTotalInCents: baseUnitPriceInCents * item.quantity,
        image: getProductHeroSrc(item) ?? item.images[0] ?? null,
      };
    });

    const paymentSubtotalInCents = baseOrderItems.reduce(
      (sum, item) => sum + item.baseLineTotalInCents,
      0,
    );
    const regularSubtotalInCents = cartProducts.reduce(
      (sum, item) => sum + Math.round(item.price * 100) * item.quantity,
      0,
    );

    let couponId: string | null = null;
    let couponCode: string | null = null;
    let couponDiscountInCents = 0;

    if (normalizedCoupon) {
      const validation = await validateCouponForSubtotal(
        normalizedCoupon,
        paymentSubtotalInCents,
        tx,
      );

      if (!validation.ok) {
        throw new Error(validation.error);
      }

      couponId = validation.coupon.id;
      couponCode = validation.coupon.code;
      couponDiscountInCents = validation.discountInCents;
    }

    const orderItems = distributeDiscountAcrossLines(
      baseOrderItems,
      couponDiscountInCents,
    );
    const subtotalInCents = orderItems.reduce(
      (sum, item) => sum + item.lineTotalInCents,
      0,
    );
    const discountInCents = Math.max(
      regularSubtotalInCents - subtotalInCents,
      0,
    );
    const totalInCents = subtotalInCents + shippingQuote.shippingInCents;

    const order = await tx.order.create({
      data: {
        userId,
        status: "PENDING_PAYMENT",
        paymentMethodChoice: input.paymentMethod,
        subtotalInCents,
        shippingInCents: shippingQuote.shippingInCents,
        discountInCents,
        totalInCents,
        couponId,
        couponCode,
        customerName: input.shipping.recipientName,
        customerEmail: input.shipping.email,
        customerPhone: input.shipping.phone,
        customerCpf: input.shipping.cpf,
        fulfillmentType: fulfillment,
        melhorEnvioServiceId: shippingQuote.shippingServiceId,
        shippingCarrier: shippingQuote.shippingCarrier,
        shippingAddress: shippingAddressJson,
        items: {
          create: orderItems.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            productSlug: item.productSlug,
            category: item.category,
            quantity: item.quantity,
            unitPriceInCents: item.unitPriceInCents,
            lineTotalInCents: item.lineTotalInCents,
            image: item.image,
          })),
        },
        checkoutEvents: {
          create: {
            userId,
            type: "ORDER_CREATED",
            message: "Pedido criado antes do redirecionamento para a Stripe.",
            metadata: JSON.stringify({
              paymentMethod: input.paymentMethod,
              couponCode,
              fulfillmentType: fulfillment,
            }),
          },
        },
      },
      include: {
        items: true,
      },
    });

    await tx.user.update({
      where: { id: userId },
      data: {
        name: input.shipping.recipientName,
        phone: input.shipping.phone,
        cpf: input.shipping.cpf,
      },
    });

    return order;
  });
}
