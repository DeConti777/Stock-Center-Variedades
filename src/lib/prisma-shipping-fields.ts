import { Prisma } from "@prisma/client";

/** True apos `npx prisma generate` com schema de despacho de frete. */
export function prismaHasShippingDispatchFields() {
  return (
    "shippingDispatchMode" in Prisma.OrderScalarFieldEnum &&
    "shippingQuotedDeliveryDays" in Prisma.OrderScalarFieldEnum
  );
}

export function orderCreateShippingFieldExtras(input: {
  shippingQuotedDeliveryDays: number | null;
}): {
  shippingQuotedDeliveryDays?: number | null;
} {
  if (!prismaHasShippingDispatchFields()) {
    return {};
  }
  return {
    shippingQuotedDeliveryDays: input.shippingQuotedDeliveryDays,
  };
}

export function orderUpdateShippingDispatchExtras(input: {
  shippingDispatchMode?: string;
}): { shippingDispatchMode?: string } {
  if (!input.shippingDispatchMode || !prismaHasShippingDispatchFields()) {
    return {};
  }
  return { shippingDispatchMode: input.shippingDispatchMode };
}
