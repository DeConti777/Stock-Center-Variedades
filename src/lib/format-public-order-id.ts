/** Codigo curto do pedido para cliente (e-mail, telas), ex.: #CMPPSV9V */
export function formatPublicOrderId(orderId: string): string {
  return `#${orderId.slice(0, 8).toUpperCase()}`;
}
