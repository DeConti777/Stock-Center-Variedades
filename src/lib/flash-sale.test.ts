import assert from "node:assert/strict";
import test from "node:test";
import {
  FLASH_SALE_DURATION_MS,
  getFlashSaleAdminStatus,
  isFlashSaleActive,
  resolveFlashSaleEndsAt,
} from "./flash-sale.ts";
import type { Product } from "./types.ts";

function baseProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "p1",
    slug: "produto",
    name: "Produto",
    category: "Utilidades",
    price: 100,
    installment: { quantity: 1, amount: 100 },
    stock: 5,
    rating: 4,
    reviews: 10,
    shortDescription: "Descricao curta ok",
    description: "Descricao completa ok",
    features: [],
    tags: [],
    published: true,
    ...overrides,
  };
}

test("resolveFlashSaleEndsAt returns null when inactive", () => {
  assert.equal(resolveFlashSaleEndsAt(new Date(), false), null);
});

test("resolveFlashSaleEndsAt keeps valid existing window", () => {
  const now = Date.now();
  const existing = new Date(now + 60_000);
  const result = resolveFlashSaleEndsAt(existing, true, now);
  assert.equal(result?.getTime(), existing.getTime());
});

test("resolveFlashSaleEndsAt starts new 24h when expired or renew", () => {
  const now = 1_700_000_000_000;
  const expired = new Date(now - 1000);
  const fromExpired = resolveFlashSaleEndsAt(expired, true, now);
  assert.equal(
    fromExpired?.getTime(),
    now + FLASH_SALE_DURATION_MS,
  );

  const stillValid = new Date(now + 3_600_000);
  const renewed = resolveFlashSaleEndsAt(stillValid, true, now, true);
  assert.equal(renewed?.getTime(), now + FLASH_SALE_DURATION_MS);
});

test("isFlashSaleActive requires stock and future end date", () => {
  const now = Date.now();
  const future = new Date(now + 60_000).toISOString();
  assert.equal(
    isFlashSaleActive(
      baseProduct({ flashSaleEndsAt: future, stock: 1 }),
      now,
    ),
    true,
  );
  assert.equal(
    isFlashSaleActive(
      baseProduct({ flashSaleEndsAt: future, stock: 0 }),
      now,
    ),
    false,
  );
  assert.equal(
    isFlashSaleActive(baseProduct({ flashSaleEndsAt: null }), now),
    false,
  );
});

test("getFlashSaleAdminStatus distinguishes active, expired and no stock", () => {
  const now = Date.now();
  const future = new Date(now + 60_000).toISOString();
  const past = new Date(now - 60_000).toISOString();

  assert.equal(
    getFlashSaleAdminStatus(
      baseProduct({ flashSaleEndsAt: future, stock: 2 }),
      now,
    ),
    "active",
  );
  assert.equal(
    getFlashSaleAdminStatus(
      baseProduct({ flashSaleEndsAt: future, stock: 0 }),
      now,
    ),
    "no_stock",
  );
  assert.equal(
    getFlashSaleAdminStatus(
      baseProduct({ flashSaleEndsAt: past }),
      now,
    ),
    "expired",
  );
  assert.equal(getFlashSaleAdminStatus(baseProduct(), now), "inactive");
});
