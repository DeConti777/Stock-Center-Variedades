import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveCepAddress } from "@/lib/cep-fetch";
import { normalizeCartItems } from "@/lib/store-server";
import { quoteCartShipping, toPublicShippingQuote } from "@/lib/shipping-quote";

const bodySchema = z.object({
  cep: z.string().transform((s) => s.replace(/\D/g, "")),
  city: z.string().optional(),
  state: z.string().optional(),
  street: z.string().optional(),
  neighborhood: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1).max(999),
      }),
    )
    .optional(),
});

/**
 * Cotacao de frete opaca (sem transportadora) com CEP validado (Brasil API / ViaCEP).
 * Preco via Melhor Envio ou fallback por faixa de CEP.
 */
export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success || parsed.data.cep.length !== 8) {
    return NextResponse.json(
      { error: "CEP invalido. Use 8 digitos." },
      { status: 400 },
    );
  }

  const address = await resolveCepAddress(parsed.data.cep, {
    city: parsed.data.city,
    state: parsed.data.state,
    street: parsed.data.street,
    neighborhood: parsed.data.neighborhood,
  });
  if (!address) {
    return NextResponse.json({ error: "CEP nao encontrado." }, { status: 404 });
  }

  const items = normalizeCartItems(parsed.data.items ?? []);
  const quote = await quoteCartShipping(parsed.data.cep, items);
  const publicQuote = toPublicShippingQuote(quote);

  return NextResponse.json({
    ...address,
    shippingInCents: publicQuote.shippingInCents,
    shippingReais: publicQuote.shippingInCents / 100,
    quoteSource: publicQuote.quoteSource,
    ...(publicQuote.deliveryDays != null
      ? { deliveryDays: publicQuote.deliveryDays }
      : {}),
  });
}
