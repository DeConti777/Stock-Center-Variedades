export const orderStatusLabels: Record<string, string> = {
  DRAFT: "Rascunho",
  PENDING_PAYMENT: "Aguardando pagamento",
  PAID: "Pago",
  PROCESSING: "Em preparacao",
  SHIPPED: "Enviado",
  DELIVERED: "Entregue",
  FAILED: "Falhou",
  EXPIRED: "Expirado",
  REQUIRES_REVIEW: "Revisao manual",
  CANCELED: "Cancelado",
};

export const customerOrderTimeline = [
  { status: "PENDING_PAYMENT", label: "Pedido criado", shortLabel: "Criado" },
  { status: "PAID", label: "Pagamento aprovado", shortLabel: "Pago" },
  { status: "PROCESSING", label: "Preparando", shortLabel: "Preparando" },
  { status: "SHIPPED", label: "Enviado", shortLabel: "Enviado" },
  { status: "DELIVERED", label: "Entrega", shortLabel: "Entrega" },
] as const;

export function getOrderStatusLabel(status: string) {
  return orderStatusLabels[status] || status;
}

export function getReachedOrderStatusIndex(status: string) {
  const index = customerOrderTimeline.findIndex((item) => item.status === status);

  if (index >= 0) {
    return index;
  }

  if (status === "FAILED" || status === "EXPIRED" || status === "CANCELED") {
    return 0;
  }

  return 0;
}
