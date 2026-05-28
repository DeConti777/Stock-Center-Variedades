/** Modo de despacho definido pelo admin apos pagamento (pedidos SHIP). */
export const SHIPPING_DISPATCH_MODES = ["MELHOR_ENVIO", "OWN_DELIVERY"] as const;

export type ShippingDispatchMode = (typeof SHIPPING_DISPATCH_MODES)[number];

export const DEFAULT_SHIPPING_DISPATCH_MODE: ShippingDispatchMode = "OWN_DELIVERY";

export const SHIPPING_DISPATCH_MODE_LABELS: Record<ShippingDispatchMode, string> = {
  MELHOR_ENVIO: "Melhor Envio",
  OWN_DELIVERY: "Stock Center Variedades",
};

export const OWN_DELIVERY_CARRIER_LABEL = "Stock Center Variedades";

export function isShippingDispatchMode(value: string): value is ShippingDispatchMode {
  return (SHIPPING_DISPATCH_MODES as readonly string[]).includes(value);
}

/** Valor legado no banco — tratado como entrega Stock Center. */
export function normalizeShippingDispatchMode(
  mode: string | null | undefined,
): ShippingDispatchMode {
  if (mode === "MELHOR_ENVIO") {
    return "MELHOR_ENVIO";
  }
  return DEFAULT_SHIPPING_DISPATCH_MODE;
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
