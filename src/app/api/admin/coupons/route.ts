import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import {
  couponToPublic,
  ensureDefaultCoupon,
  sanitizeCouponCode,
} from "@/lib/coupons";
import { getPrismaOrNull } from "@/lib/prisma";

const couponInputSchema = z.object({
  code: z.string().min(2).max(40),
  type: z.enum(["PERCENT", "FIXED"]),
  value: z.number().positive(),
  maxUses: z.number().int().positive().optional().nullable(),
  minSubtotalInCents: z.number().int().min(0).optional(),
  expiresAt: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

const couponUpdateSchema = couponInputSchema.partial().extend({
  id: z.string().min(1),
});

const couponDeleteSchema = z.object({
  id: z.string().min(1),
});

function unauthorizedResponse() {
  return NextResponse.json(
    { error: "Nao autorizado." },
    { status: 403 },
  );
}

function parseExpiresAt(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildCouponData(input: z.infer<typeof couponInputSchema>) {
  const code = sanitizeCouponCode(input.code);

  return {
    code,
    type: input.type,
    valuePercent: input.type === "PERCENT" ? Math.round(input.value) : null,
    valueInCents: input.type === "FIXED" ? Math.round(input.value * 100) : null,
    maxUses: input.maxUses ?? null,
    minSubtotalInCents: input.minSubtotalInCents ?? 0,
    expiresAt: parseExpiresAt(input.expiresAt),
    active: input.active ?? true,
  };
}

export async function GET() {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return unauthorizedResponse();
  }

  const prisma = getPrismaOrNull();

  if (!prisma) {
    return NextResponse.json(
      { error: "Banco de dados nao configurado." },
      { status: 503 },
    );
  }

  await ensureDefaultCoupon(prisma);

  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ coupons: coupons.map(couponToPublic) });
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return unauthorizedResponse();
  }

  const prisma = getPrismaOrNull();

  if (!prisma) {
    return NextResponse.json(
      { error: "Banco de dados nao configurado." },
      { status: 503 },
    );
  }

  const body = await request.json();
  const result = couponInputSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Dados invalidos para criar cupom." },
      { status: 400 },
    );
  }

  const data = buildCouponData(result.data);

  if (!data.code) {
    return NextResponse.json(
      { error: "Codigo do cupom invalido." },
      { status: 400 },
    );
  }

  const coupon = await prisma.coupon.create({ data });
  return NextResponse.json({ coupon: couponToPublic(coupon) });
}

export async function PATCH(request: Request) {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return unauthorizedResponse();
  }

  const prisma = getPrismaOrNull();

  if (!prisma) {
    return NextResponse.json(
      { error: "Banco de dados nao configurado." },
      { status: 503 },
    );
  }

  const body = await request.json();
  const result = couponUpdateSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Dados invalidos para atualizar cupom." },
      { status: 400 },
    );
  }

  const { id, ...input } = result.data;
  const data: Record<string, unknown> = {};

  if (input.code !== undefined) data.code = sanitizeCouponCode(input.code);
  if (input.type !== undefined) data.type = input.type;
  if (input.type === "PERCENT" && input.value !== undefined) {
    data.valuePercent = Math.round(input.value);
    data.valueInCents = null;
  }
  if (input.type === "FIXED" && input.value !== undefined) {
    data.valueInCents = Math.round(input.value * 100);
    data.valuePercent = null;
  }
  if (input.maxUses !== undefined) data.maxUses = input.maxUses;
  if (input.minSubtotalInCents !== undefined) {
    data.minSubtotalInCents = input.minSubtotalInCents;
  }
  if (input.expiresAt !== undefined) data.expiresAt = parseExpiresAt(input.expiresAt);
  if (input.active !== undefined) data.active = input.active;

  const coupon = await prisma.coupon.update({
    where: { id },
    data,
  });

  return NextResponse.json({ coupon: couponToPublic(coupon) });
}

export async function DELETE(request: Request) {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return unauthorizedResponse();
  }

  const prisma = getPrismaOrNull();

  if (!prisma) {
    return NextResponse.json(
      { error: "Banco de dados nao configurado." },
      { status: 503 },
    );
  }

  const body = await request.json();
  const result = couponDeleteSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Dados invalidos para excluir cupom." },
      { status: 400 },
    );
  }

  await prisma.coupon.delete({ where: { id: result.data.id } });

  return NextResponse.json({ ok: true });
}
