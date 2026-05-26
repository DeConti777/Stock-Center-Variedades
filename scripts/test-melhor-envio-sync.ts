/**
 * Teste: cota ME + sincroniza pedido pago com entrega.
 * Uso: npx tsx scripts/test-melhor-envio-sync.ts [orderId]
 */

import { PrismaClient } from "@prisma/client";
import { syncMelhorEnvioForOrderId } from "../src/lib/melhor-envio-shipment";
import { isMelhorEnvioConfigured } from "../src/lib/melhor-envio";
import { quoteCartShipping } from "../src/lib/shipping-quote";

const prisma = new PrismaClient();
const orderId = process.argv[2] || "cmplm7pva000m10qhc4m12uic";

async function main() {
  console.log("Melhor Envio configurado:", isMelhorEnvioConfigured());

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    console.error("Pedido nao encontrado:", orderId);
    process.exit(1);
  }

  console.log("Pedido:", order.id, "|", order.status, "|", order.fulfillmentType);

  if (order.fulfillmentType !== "SHIP") {
    console.error("Pedido nao e entrega (SHIP).");
    process.exit(1);
  }

  let serviceId = order.melhorEnvioServiceId || order.shippingCode;

  if (!serviceId) {
    const address = JSON.parse(order.shippingAddress) as { cep?: string };
    const cep = (address.cep ?? "").replace(/\D/g, "");
    const quote = await quoteCartShipping(
      cep,
      order.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
    );
    console.log("Cotacao:", quote.source, quote.shippingCarrier, quote.shippingServiceId);

    if (quote.source !== "melhor_envio" || !quote.shippingServiceId) {
      console.error("Cotacao ME indisponivel. Verifique token e CEP origem.");
      process.exit(1);
    }

    serviceId = quote.shippingServiceId;
    await prisma.order.update({
      where: { id: order.id },
      data: {
        melhorEnvioServiceId: quote.shippingServiceId,
        shippingCarrier: quote.shippingCarrier,
      },
    });
    console.log("Atualizado melhorEnvioServiceId:", serviceId);
  }

  const result = await syncMelhorEnvioForOrderId(prisma, order.id);
  console.log("Resultado sync:", JSON.stringify(result, null, 2));

  const refreshed = await prisma.order.findUnique({
    where: { id: order.id },
    select: {
      melhorEnvioStatus: true,
      melhorEnvioShipmentId: true,
      melhorEnvioError: true,
      shippingCarrier: true,
    },
  });
  console.log("Pedido apos sync:", refreshed);

  if (!result.ok) {
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
