import { NextResponse } from "next/server";
import { z } from "zod";
import { validateCouponForSubtotal } from "@/lib/coupons";

const couponValidationSchema = z.object({
  code: z.string().min(1).max(40),
  subtotalInCents: z.number().int().min(0),
});

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "JSON invalido." },
      { status: 400 },
    );
  }

  const parsed = couponValidationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos para validar cupom." },
      { status: 400 },
    );
  }

  const validation = await validateCouponForSubtotal(
    parsed.data.code,
    parsed.data.subtotalInCents,
  );

  if (!validation.ok) {
    return NextResponse.json(
      { error: validation.error },
      { status: 404 },
    );
  }

  return NextResponse.json({
    coupon: validation.publicCoupon,
    discountInCents: validation.discountInCents,
  });
}
