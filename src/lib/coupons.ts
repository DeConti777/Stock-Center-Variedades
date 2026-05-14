import type { Coupon, Prisma, PrismaClient } from "@prisma/client";
import { getPrismaOrNull } from "@/lib/prisma";

type CouponClient = PrismaClient | Prisma.TransactionClient;

export type PublicCoupon = {
  id: string;
  code: string;
  type: string;
  valuePercent: number | null;
  valueInCents: number | null;
  maxUses: number | null;
  usedCount: number;
  minSubtotalInCents: number;
  expiresAt: string | null;
  active: boolean;
};

export type CouponValidationResult =
  | {
      ok: true;
      coupon: Coupon;
      publicCoupon: PublicCoupon;
      discountInCents: number;
    }
  | {
      ok: false;
      error: string;
      discountInCents: 0;
    };

export function sanitizeCouponCode(code?: string | null) {
  return (code || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 40);
}

export function couponToPublic(coupon: Coupon): PublicCoupon {
  return {
    id: coupon.id,
    code: coupon.code,
    type: coupon.type,
    valuePercent: coupon.valuePercent,
    valueInCents: coupon.valueInCents,
    maxUses: coupon.maxUses,
    usedCount: coupon.usedCount,
    minSubtotalInCents: coupon.minSubtotalInCents,
    expiresAt: coupon.expiresAt?.toISOString() || null,
    active: coupon.active,
  };
}

export function calculateCouponDiscountInCents(
  coupon: Pick<Coupon, "type" | "valuePercent" | "valueInCents">,
  subtotalInCents: number,
) {
  const subtotal = Math.max(0, Math.round(subtotalInCents));

  if (subtotal <= 0) {
    return 0;
  }

  if (coupon.type === "FIXED") {
    return Math.min(Math.max(coupon.valueInCents || 0, 0), subtotal);
  }

  const percent = Math.min(Math.max(coupon.valuePercent || 0, 0), 100);
  return Math.min(Math.round(subtotal * (percent / 100)), subtotal);
}

export async function ensureDefaultCoupon(client?: CouponClient) {
  const prisma = client ?? getPrismaOrNull();

  if (!prisma) {
    return null;
  }

  return prisma.coupon.upsert({
    where: { code: "BEMVINDO10" },
    update: {},
    create: {
      code: "BEMVINDO10",
      type: "PERCENT",
      valuePercent: 10,
      minSubtotalInCents: 0,
      active: true,
    },
  });
}

export async function validateCouponForSubtotal(
  code: string | null | undefined,
  subtotalInCents: number,
  client?: CouponClient,
): Promise<CouponValidationResult> {
  const normalized = sanitizeCouponCode(code);

  if (!normalized) {
    return {
      ok: false,
      error: "Informe um cupom.",
      discountInCents: 0,
    };
  }

  const prisma = client ?? getPrismaOrNull();

  if (!prisma) {
    return {
      ok: false,
      error: "Banco de dados nao configurado.",
      discountInCents: 0,
    };
  }

  if (normalized === "BEMVINDO10") {
    await ensureDefaultCoupon(prisma);
  }

  const coupon = await prisma.coupon.findUnique({
    where: { code: normalized },
  });

  if (!coupon) {
    return {
      ok: false,
      error: "Cupom nao encontrado.",
      discountInCents: 0,
    };
  }

  if (!coupon.active) {
    return {
      ok: false,
      error: "Cupom inativo.",
      discountInCents: 0,
    };
  }

  if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
    return {
      ok: false,
      error: "Cupom expirado.",
      discountInCents: 0,
    };
  }

  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
    return {
      ok: false,
      error: "Cupom esgotado.",
      discountInCents: 0,
    };
  }

  if (subtotalInCents < coupon.minSubtotalInCents) {
    return {
      ok: false,
      error: `Pedido minimo para este cupom: R$ ${(coupon.minSubtotalInCents / 100).toFixed(2)}.`,
      discountInCents: 0,
    };
  }

  const discountInCents = calculateCouponDiscountInCents(
    coupon,
    subtotalInCents,
  );

  if (discountInCents <= 0) {
    return {
      ok: false,
      error: "Cupom sem desconto configurado.",
      discountInCents: 0,
    };
  }

  return {
    ok: true,
    coupon,
    publicCoupon: couponToPublic(coupon),
    discountInCents,
  };
}
