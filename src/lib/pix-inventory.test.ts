/* eslint-disable @typescript-eslint/no-explicit-any */
import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";
import {
  expireReservedPixOrders,
  releaseInventoryReservation,
  reserveInventoryForPixOrder,
} from "@/lib/pix-inventory";

type FakeOrderItem = {
  productId: string;
  productName: string;
  quantity: number;
};

type FakeOrder = {
  id: string;
  userId: string;
  status: string;
  paymentMethodChoice: string;
  inventoryReserved: boolean;
  inventoryReservedAt: Date | null;
  inventoryReserveExpiresAt: Date | null;
  paymentRetryCount: number;
  items: FakeOrderItem[];
};

function makeFakePrisma(seed: { stock: number; orders: FakeOrder[] }) {
  const stocks = new Map<string, number>([["p1", seed.stock]]);
  const orders = new Map(seed.orders.map((order) => [order.id, { ...order }]));

  const prisma = {
    $transaction: async (cb: (tx: any) => Promise<unknown>) => cb(prisma),
    order: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        const order = orders.get(where.id);
        return order ? { ...order, items: order.items.map((item) => ({ ...item })) } : null;
      },
      findMany: async ({ where }: any) => {
        const now = where.inventoryReserveExpiresAt.lte as Date;
        return Array.from(orders.values())
          .filter((order) => {
            return (
              order.paymentMethodChoice === where.paymentMethodChoice &&
              order.status === where.status &&
              order.inventoryReserved === where.inventoryReserved &&
              Boolean(
                order.inventoryReserveExpiresAt &&
                  order.inventoryReserveExpiresAt <= now,
              )
            );
          })
          .map((order) => ({ id: order.id }));
      },
      update: async ({ where, data }: any) => {
        const order = orders.get(where.id);
        if (!order) throw new Error("Order not found");

        if (typeof data.status !== "undefined") order.status = data.status;
        if (typeof data.inventoryReserved !== "undefined") {
          order.inventoryReserved = data.inventoryReserved;
        }
        if ("inventoryReservedAt" in data) {
          order.inventoryReservedAt = data.inventoryReservedAt;
        }
        if ("inventoryReserveExpiresAt" in data) {
          order.inventoryReserveExpiresAt = data.inventoryReserveExpiresAt;
        }
        if (data.paymentRetryCount?.increment) {
          order.paymentRetryCount += data.paymentRetryCount.increment;
        }

        return { ...order, items: order.items.map((item) => ({ ...item })) };
      },
    },
    product: {
      updateMany: async ({ where, data }: any) => {
        const current = stocks.get(where.id) ?? 0;
        const needed = where.stock.gte as number;
        if (current < needed) return { count: 0 };
        stocks.set(where.id, current - data.stock.decrement);
        return { count: 1 };
      },
      update: async ({ where, data }: any) => {
        const current = stocks.get(where.id) ?? 0;
        stocks.set(where.id, current + data.stock.increment);
        return { id: where.id };
      },
    },
    paymentAttempt: {
      updateMany: async () => ({ count: 1 }),
    },
  };

  return {
    prisma: prisma as unknown as PrismaClient,
    getStock: () => stocks.get("p1") ?? 0,
    getOrder: (id: string) => orders.get(id),
  };
}

test("Pix criado reserva estoque", async () => {
  const fake = makeFakePrisma({
    stock: 5,
    orders: [
      {
        id: "o1",
        userId: "u1",
        status: "PENDING_PAYMENT",
        paymentMethodChoice: "PIX",
        inventoryReserved: false,
        inventoryReservedAt: null,
        inventoryReserveExpiresAt: null,
        paymentRetryCount: 0,
        items: [{ productId: "p1", productName: "Produto", quantity: 2 }],
      },
    ],
  });

  await reserveInventoryForPixOrder(fake.prisma, "o1");

  assert.equal(fake.getStock(), 3);
  assert.equal(fake.getOrder("o1")?.inventoryReserved, true);
});

test("Pix falho libera reserva sem duplicidade", async () => {
  const fake = makeFakePrisma({
    stock: 3,
    orders: [
      {
        id: "o1",
        userId: "u1",
        status: "PENDING_PAYMENT",
        paymentMethodChoice: "PIX",
        inventoryReserved: true,
        inventoryReservedAt: new Date(),
        inventoryReserveExpiresAt: new Date(Date.now() + 60_000),
        paymentRetryCount: 0,
        items: [{ productId: "p1", productName: "Produto", quantity: 2 }],
      },
    ],
  });

  await releaseInventoryReservation(fake.prisma, {
    orderId: "o1",
    reason: "PAYMENT_FAILED",
    nextStatus: "FAILED",
  });
  await releaseInventoryReservation(fake.prisma, {
    orderId: "o1",
    reason: "PAYMENT_FAILED",
    nextStatus: "FAILED",
  });

  assert.equal(fake.getStock(), 5);
  assert.equal(fake.getOrder("o1")?.inventoryReserved, false);
});

test("Pix expirado por rotina ativa libera estoque", async () => {
  const now = new Date();
  const fake = makeFakePrisma({
    stock: 1,
    orders: [
      {
        id: "o1",
        userId: "u1",
        status: "PENDING_PAYMENT",
        paymentMethodChoice: "PIX",
        inventoryReserved: true,
        inventoryReservedAt: new Date(now.getTime() - 60_000),
        inventoryReserveExpiresAt: new Date(now.getTime() - 1_000),
        paymentRetryCount: 0,
        items: [{ productId: "p1", productName: "Produto", quantity: 1 }],
      },
    ],
  });

  const result = await expireReservedPixOrders(fake.prisma, now);

  assert.equal(result.matched, 1);
  assert.equal(result.released, 1);
  assert.equal(fake.getStock(), 2);
  assert.equal(fake.getOrder("o1")?.status, "EXPIRED");
});

test("Concorrencia no ultimo estoque sem oversell", async () => {
  const fake = makeFakePrisma({
    stock: 1,
    orders: [
      {
        id: "o1",
        userId: "u1",
        status: "PENDING_PAYMENT",
        paymentMethodChoice: "PIX",
        inventoryReserved: false,
        inventoryReservedAt: null,
        inventoryReserveExpiresAt: null,
        paymentRetryCount: 0,
        items: [{ productId: "p1", productName: "Produto", quantity: 1 }],
      },
      {
        id: "o2",
        userId: "u2",
        status: "PENDING_PAYMENT",
        paymentMethodChoice: "PIX",
        inventoryReserved: false,
        inventoryReservedAt: null,
        inventoryReserveExpiresAt: null,
        paymentRetryCount: 0,
        items: [{ productId: "p1", productName: "Produto", quantity: 1 }],
      },
    ],
  });

  const [a, b] = await Promise.allSettled([
    reserveInventoryForPixOrder(fake.prisma, "o1"),
    reserveInventoryForPixOrder(fake.prisma, "o2"),
  ]);

  const okCount = [a, b].filter((result) => result.status === "fulfilled").length;
  assert.equal(okCount, 1);
  assert.equal(fake.getStock(), 0);
});
