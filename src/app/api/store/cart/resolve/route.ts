import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveProductsForCart } from "@/lib/store-server";

const bodySchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().min(1),
      quantity: z.number().int().min(1),
    }),
  ),
});

/**
 * Resolve IDs do carrinho para dados completos do produto (incl. capa e imagens da base).
 */
export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Itens invalidos." }, { status: 400 });
  }

  const products = await resolveProductsForCart(parsed.data.items);
  return NextResponse.json({ products });
}
