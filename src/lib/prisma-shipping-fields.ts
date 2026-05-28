import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

type PrismaRawClient = Pick<PrismaClient, "$executeRaw" | "$queryRaw">;

/** True quando `npx prisma generate` foi executado com o schema atual. */
export function prismaHasShippingDispatchFields() {
  return (
    "shippingDispatchMode" in Prisma.OrderScalarFieldEnum &&
    "shippingQuotedDeliveryDays" in Prisma.OrderScalarFieldEnum
  );
}

export function orderCreateShippingFieldExtras(input: {
  shippingQuotedDeliveryDays: number | null;
  shippingDispatchMode?: string;
}): {
  shippingQuotedDeliveryDays?: number | null;
  shippingDispatchMode?: string;
} {
  if (!prismaHasShippingDispatchFields()) {
    return {};
  }

  const extras: {
    shippingQuotedDeliveryDays?: number | null;
    shippingDispatchMode?: string;
  } = {
    shippingQuotedDeliveryDays: input.shippingQuotedDeliveryDays,
  };

  if (input.shippingDispatchMode) {
    extras.shippingDispatchMode = input.shippingDispatchMode;
  }

  return extras;
}

export function orderUpdateShippingDispatchExtras(input: {
  shippingDispatchMode?: string;
}): { shippingDispatchMode?: string } {
  if (!input.shippingDispatchMode || !prismaHasShippingDispatchFields()) {
    return {};
  }
  return { shippingDispatchMode: input.shippingDispatchMode };
}

/** Persiste modo de despacho quando o Prisma Client em cache ainda nao conhece o campo. */
export async function persistShippingDispatchModeRaw(
  prisma: PrismaRawClient,
  orderId: string,
  shippingDispatchMode: string,
) {
  await prisma.$executeRaw`
    UPDATE "Order"
    SET "shippingDispatchMode" = ${shippingDispatchMode}
    WHERE id = ${orderId}
  `;
}

export async function fetchShippingDispatchModesRaw(
  prisma: PrismaRawClient,
  orderIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (orderIds.length === 0) {
    return map;
  }

  const rows = await prisma.$queryRaw<Array<{ id: string; shippingDispatchMode: string }>>`
    SELECT id, "shippingDispatchMode"
    FROM "Order"
    WHERE id IN (${Prisma.join(orderIds)})
  `;

  for (const row of rows) {
    map.set(row.id, row.shippingDispatchMode);
  }

  return map;
}
