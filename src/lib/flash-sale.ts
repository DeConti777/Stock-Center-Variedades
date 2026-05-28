import type { Product } from "@/lib/types";

export const FLASH_SALE_DURATION_MS = 24 * 60 * 60 * 1000;

export function resolveFlashSaleEndsAt(
  existing: Date | null | undefined,
  flashSaleActive: boolean,
  now = Date.now(),
  renew = false,
): Date | null {
  if (!flashSaleActive) return null;
  if (!renew && existing && existing.getTime() > now) return existing;
  return new Date(now + FLASH_SALE_DURATION_MS);
}

export type FlashSaleAdminStatus =
  | "inactive"
  | "active"
  | "expired"
  | "no_stock";

/** Status para badges no admin (independente de published). */
export function getFlashSaleAdminStatus(
  product: Product,
  now = Date.now(),
): FlashSaleAdminStatus {
  const end = product.flashSaleEndsAt;
  if (end == null || end === "") return "inactive";
  const endMs = new Date(end).getTime();
  if (Number.isNaN(endMs)) return "inactive";
  if (endMs <= now) return "expired";
  if (product.stock <= 0) return "no_stock";
  return "active";
}

export function isFlashSaleActive(product: Product, now = Date.now()): boolean {
  if (product.stock <= 0) return false;
  const end = product.flashSaleEndsAt;
  if (end == null || end === "") return false;
  const t = new Date(end).getTime();
  return !Number.isNaN(t) && t > now;
}

/** Preferência ao percentual cadastrado na oferta; senão calcula a partir de originalPrice vs price. */
export function getFlashSaleDisplayPercent(product: Product): number {
  if (isFlashSaleActive(product)) {
    const p = product.flashSaleDiscountPercent;
    if (p != null && p >= 1 && p <= 99) return p;
  }
  if (
    product.originalPrice != null &&
    product.originalPrice > product.price
  ) {
    return Math.round(
      ((product.originalPrice - product.price) / product.originalPrice) * 100,
    );
  }
  return 0;
}

/**
 * Aplica o preco efetivo da Oferta Relampago sem persistir no banco.
 * Quando ativo e com percentual valido, o preco atual vira "de" e o preco
 * com desconto passa a ser o preco exibido/cobrado.
 */
export function applyFlashSalePricing(product: Product): Product {
  if (!isFlashSaleActive(product)) return product;
  const percent = product.flashSaleDiscountPercent;
  if (percent == null || percent < 1 || percent > 99) return product;

  const baseCents = Math.round(product.price * 100);
  const discountedCents = Math.round((baseCents * (100 - percent)) / 100);
  if (discountedCents <= 0 || discountedCents >= baseCents) return product;

  return {
    ...product,
    originalPrice: product.price,
    price: discountedCents / 100,
  };
}
