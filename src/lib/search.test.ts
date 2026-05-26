import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSearchableText,
  scoreProduct,
  searchAndRankProducts,
  searchProducts,
} from "@/lib/search";
import type { Product } from "@/lib/types";

function makeProduct(overrides: Partial<Product> & Pick<Product, "id" | "name" | "category">): Product {
  return {
    slug: overrides.slug ?? overrides.name.toLowerCase().replace(/\s+/g, "-"),
    price: 99,
    pixDiscountPercent: 5,
    installment: { quantity: 3, amount: 33 },
    stock: 10,
    rating: 4.5,
    reviews: 10,
    shortDescription: "Descricao curta",
    description: "Descricao longa do produto",
    features: ["organizacao", "cozinha"],
    sku: "SKU-001",
    images: [],
    tags: [],
    ...overrides,
  };
}

const sampleProducts: Product[] = [
  makeProduct({
    id: "1",
    name: "Carregador USB Rapido",
    category: "Eletronicos",
    sku: "CAR-USB-01",
    reviews: 50,
    features: ["carregamento rapido", "usb c"],
    shortDescription: "Carregador compacto",
    description: "Carregador para celular",
  }),
  makeProduct({
    id: "2",
    name: "Organizador de Cozinha",
    category: "Organizacao",
    sku: "ORG-COZ-02",
    reviews: 30,
    features: ["organizador", "gaveta"],
    shortDescription: "Organizador modular",
    description: "Para gavetas de cozinha",
  }),
  makeProduct({
    id: "3",
    name: "Kit Utilidades Domesticas",
    category: "Utilidades",
    sku: "UTL-KIT-03",
    reviews: 5,
    features: ["kit basico", "casa"],
    shortDescription: "Kit para casa",
    description: "Utilidades do dia a dia",
  }),
];

test("buildSearchableText inclui sku, features e tags", () => {
  const text = buildSearchableText(
    makeProduct({
      id: "x",
      name: "Produto",
      category: "Presentes",
      sku: "ABC-123",
      badge: "Oferta",
      tags: ["promotion"],
      features: ["presente criativo"],
    }),
  );
  assert.match(text, /ABC-123/);
  assert.match(text, /presente criativo/);
  assert.match(text, /promocao/);
  assert.match(text, /Oferta/);
});

test("encontra produto por categoria sem acento", () => {
  const results = searchProducts(sampleProducts, "eletronico");
  assert.equal(results.length, 1);
  assert.equal(results[0]?.name, "Carregador USB Rapido");
});

test("tolera typo leve no nome", () => {
  const results = searchProducts(sampleProducts, "carregdor");
  assert.ok(results.length >= 1);
  assert.equal(results[0]?.name, "Carregador USB Rapido");
});

test("encontra por SKU parcial", () => {
  const results = searchProducts(sampleProducts, "ORG-COZ");
  assert.equal(results.length, 1);
  assert.equal(results[0]?.name, "Organizador de Cozinha");
});

test("multi-palavra exige todos os tokens", () => {
  const results = searchProducts(sampleProducts, "organizador cozinha");
  assert.ok(results.some((p) => p.name === "Organizador de Cozinha"));
  assert.equal(results[0]?.name, "Organizador de Cozinha");
});

test("ranking prioriza match exato no nome", () => {
  const products = [
    makeProduct({ id: "a", name: "Organizador Portatil", category: "Organizacao", reviews: 100 }),
    makeProduct({ id: "b", name: "Organizador de Cozinha", category: "Organizacao", reviews: 1 }),
  ];
  const results = searchAndRankProducts(products, "organizador cozinha");
  assert.equal(results[0]?.name, "Organizador de Cozinha");
});

test("scoreProduct retorna zero quando token nao combina", () => {
  const product = sampleProducts[0]!;
  assert.equal(scoreProduct(product, "xyz inexistente"), 0);
});

test("query vazia retorna todos os produtos", () => {
  assert.equal(searchProducts(sampleProducts, "").length, sampleProducts.length);
  assert.equal(searchProducts(sampleProducts, "   ").length, sampleProducts.length);
});
