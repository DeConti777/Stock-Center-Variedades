import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPrismaOrNull } from "@/lib/prisma";
import { syncMelhorEnvioForOrderId } from "@/lib/melhor-envio-shipment";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 403 });
  }

  const prisma = getPrismaOrNull();
  if (!prisma) {
    return NextResponse.json({ error: "Banco indisponivel." }, { status: 503 });
  }

  const { id } = await context.params;
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
