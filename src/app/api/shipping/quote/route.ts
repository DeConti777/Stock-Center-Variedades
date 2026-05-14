import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchCepAddress } from "@/lib/cep-fetch";
import { normalizeCartItems } from "@/lib/store-server";
import { quoteCartShipping } from "@/lib/shipping-quote";

const bodySchema = z.object({
  cep: z.string().transform((s) => s.replace(/\D/g, "")),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1).max(999),
      }),
    )
    .optional(),
  melhorEnvioServiceId: z.number().int().positive().optional(),
});

/**
 * Cotacao de frete (Melhor Envio + transportadoras) com CEP validado na Brasil API.
 * Opcionalmente envie `items` do carrinho para refletir volumes/seguro por SKU.
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

  const address = await fetchCepAddress(parsed.data.cep);
  if (!address) {
    return NextResponse.json({ error: "CEP nao encontrado." }, { status: 404 });
  }

  const items = normalizeCartItems(parsed.data.items ?? []);
  const quote = await quoteCartShipping(
    parsed.data.cep,
    items,
    parsed.data.melhorEnvioServiceId ?? null,
  );

  return NextResponse.json({
    ...address,
    shippingInCents: quote.shippingInCents,
    shippingReais: quote.shippingInCents / 100,
    shippingSource: quote.source,
    shippingServiceId: quote.shippingServiceId,
    shippingCarrier: quote.shippingCarrier,
    shippingOptions: quote.options,
  });
}
