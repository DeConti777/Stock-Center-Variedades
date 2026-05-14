export const REVIEWABLE_ORDER_STATUSES = [
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
] as const;

export type ReviewableOrderStatus = (typeof REVIEWABLE_ORDER_STATUSES)[number];
