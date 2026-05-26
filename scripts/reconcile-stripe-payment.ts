/**
 * Sincroniza pedidos pagos na Stripe mas ainda pendentes no site (webhook nao chegou).
 *
 * Uso:
 *   npx tsx scripts/reconcile-stripe-payment.ts --all
 *   npx tsx scripts/reconcile-stripe-payment.ts cmplm7pva000m10qhc4m12uic
 *   npx tsx scripts/reconcile-stripe-payment.ts cs_test_...
 */

import { PrismaClient } from "@prisma/client";
import { fulfillPaidCheckoutSession } from "../src/lib/stripe-checkout-fulfillment";
import { syncMelhorEnvioForPaidOrder } from "../src/lib/melhor-envio-shipment";
import { getStripe } from "../src/lib/stripe";

const prisma = new PrismaClient();
const stripe = getStripe();

const arg = process.argv[2];

async function loadOrders() {
  if (!arg || arg === "--all") {
    return prisma.order.findMany({
      where: {
        status: { notIn: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELED"] },
        stripeCheckoutSessionId: { not: null },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        stripeCheckoutSessionId: true,
        paymentMethodChoice: true,
      },
    });
  }

  if (arg.startsWith("cs_")) {
    const order = await prisma.order.findFirst({
      where: { stripeCheckoutSessionId: arg },
      select: {
        id: true,
        status: true,
        stripeCheckoutSessionId: true,
        paymentMethodChoice: true,
      },
    });
    return order ? [order] : [];
  }

  const order = await prisma.order.findUnique({
    where: { id: arg },
    select: {
      id: true,
      status: true,
      stripeCheckoutSessionId: true,
      paymentMethodChoice: true,
    },
  });
  return order ? [order] : [];
}

async function main() {
  const orders = await loadOrders();

  if (orders.length === 0) {
    console.error("Nenhum pedido encontrado para o argumento informado.");
    process.exit(1);
  }

  console.log(`Verificando ${orders.length} pedido(s) na Stripe...\n`);

  for (const order of orders) {
    const sessionId = order.stripeCheckoutSessionId;
    if (!sessionId) {
      console.log(`- ${order.id}: sem sessao Stripe, ignorado`);
      continue;
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });

    console.log(
      `- ${order.id} | site=${order.status} | stripe payment_status=${session.payment_status}`,
    );

    if (session.payment_status !== "paid") {
      console.log("  -> ainda nao pago na Stripe, nada a sincronizar\n");
      continue;
    }

    if (["PAID", "PROCESSING", "SHIPPED", "DELIVERED"].includes(order.status)) {
      console.log("  -> ja pago no site\n");
      continue;
    }

    const sessionWithMeta: typeof session = {
      ...session,
      metadata: {
        ...session.metadata,
        orderId: session.metadata?.orderId ?? order.id,
        reconcileSource: "manual_script",
      },
    };

    const result = await fulfillPaidCheckoutSession(prisma, sessionWithMeta);

    if (result) {
      console.log(`  -> sincronizado: status PAID, paidAt=${result.paidAt?.toISOString() ?? "ok"}`);
      const me = await syncMelhorEnvioForPaidOrder(prisma, result);
      if (me.ok) {
        console.log(
          `  -> Melhor Envio: ${me.status} (${me.shipmentId})${me.purchased ? " comprado" : " no carrinho"}`,
        );
      } else if (!me.skipped) {
        console.log(`  -> Melhor Envio falhou: ${me.error}`);
      } else {
        console.log(`  -> Melhor Envio ignorado: ${me.reason}`);
      }
      console.log("");
    } else {
      const refreshed = await prisma.order.findUnique({
        where: { id: order.id },
        select: { status: true },
      });
      console.log(
        `  -> fulfill retornou vazio (status atual: ${refreshed?.status ?? "desconhecido"})\n`,
      );
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
