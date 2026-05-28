import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { getPrismaOrNull } from "@/lib/prisma";
import { persistShippingDispatchModeRaw } from "@/lib/prisma-shipping-fields";
import { syncMelhorEnvioForOrderId } from "@/lib/melhor-envio-shipment";
import { SHIPPING_DISPATCH_MODES } from "@/lib/shipping-dispatch";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const bodySchema = z
  .object({
    shippingDispatchMode: z.enum(SHIPPING_DISPATCH_MODES).optional(),
  })
  .optional();

export async function POST(request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 403 });
  }

  const prisma = getPrismaOrNull();
  if (!prisma) {
    return NextResponse.json({ error: "Banco indisponivel." }, { status: 503 });
  }

  const { id } = await context.params;

  let body: z.infer<typeof bodySchema>;
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      body = bodySchema.parse(await request.json());
    } catch {
      body = undefined;
    }
  }

  if (body?.shippingDispatchMode === "MELHOR_ENVIO") {
    await persistShippingDispatchModeRaw(prisma, id, "MELHOR_ENVIO");
  }

  const result = await syncMelhorEnvioForOrderId(prisma, id);

  if (result.ok) {
    return NextResponse.json({
      ok: true,
      shipmentId: result.shipmentId,
      status: result.status,
      purchased: result.purchased,
      message: result.purchased
        ? "Envio comprado no Melhor Envio. Confira no painel ME para imprimir a etiqueta."
        : "Envio adicionado ao carrinho Melhor Envio. Compre no painel ou habilite MELHOR_ENVIO_AUTO_CHECKOUT.",
    });
  }

  if (result.skipped) {
    return NextResponse.json({ ok: false, skipped: true, reason: result.reason }, { status: 400 });
  }

  return NextResponse.json({ ok: false, error: result.error }, { status: 422 });
}
