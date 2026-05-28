/** Modo de despacho definido pelo admin apos pagamento (pedidos SHIP). */
export const SHIPPING_DISPATCH_MODES = [
  "PENDING",
  "MELHOR_ENVIO",
  "OWN_DELIVERY",
] as const;

export type ShippingDispatchMode = (typeof SHIPPING_DISPATCH_MODES)[number];

export function isShippingDispatchMode(value: string): value is ShippingDispatchMode {
  return (SHIPPING_DISPATCH_MODES as readonly string[]).includes(value);
}

export function canAdminChooseShippingDispatch(
  status: string,
  fulfillmentType: string,
): boolean {
  return (
    fulfillmentType === "SHIP" &&
    ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"].includes(status)
  );
}

export function isMelhorEnvioDispatchAllowed(mode: string): boolean {
  return mode === "MELHOR_ENVIO";
}

export const OWN_DELIVERY_CARRIER_LABEL = "Entrega propria";
