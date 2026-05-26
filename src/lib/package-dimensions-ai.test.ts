import assert from "node:assert/strict";
import test from "node:test";
import type { AdminProductCreateInput } from "@/lib/admin-server";
import {
  collectProductImageUrls,
  formatGeminiEstimateError,
  getPackageAiModelCandidates,
  hasAnyPackageField,
  isGeminiQuotaError,
  maybeEnrichPackageOnCreate,
  normalizePackageAiOutput,
  resolveAbsoluteImageUrl,
} from "./package-dimensions-ai.ts";

test("normalizePackageAiOutput applies clamp and nulls on low confidence", () => {
  const result = normalizePackageAiOutput(
    {
      packageWidthCm: 30.7,
      packageHeightCm: 8.2,
      packageLengthCm: 22.1,
      packageWeightKg: 0.441,
      confidence: 0.35,
      reasoning: "Nome generico.",
      warnings: [],
    },
    0.5,
  );
  assert.equal(result.packageWidthCm, null);
  assert.equal(result.confidence, 0.35);
  assert.ok(result.warnings.some((w) => w.includes("Confianca")));
});

test("normalizePackageAiOutput swaps width/length when width > length", () => {
  const result = normalizePackageAiOutput(
    {
      packageWidthCm: 40,
      packageHeightCm: 12,
      packageLengthCm: 25,
      packageWeightKg: 0.8,
      confidence: 0.8,
      reasoning: "Caixa media.",
      warnings: [],
    },
    0.5,
  );
  assert.equal(result.packageWidthCm, 25);
  assert.equal(result.packageLengthCm, 40);
  assert.equal(result.packageWeightKg, 0.8);
});

test("hasAnyPackageField detects partial package input", () => {
  assert.equal(hasAnyPackageField({ packageWeightKg: 0.5 }), true);
  assert.equal(hasAnyPackageField({}), false);
});

test("maybeEnrichPackageOnCreate skips when package already set", async () => {
  const input: AdminProductCreateInput = {
    name: "Produto Teste",
    slug: "produto-teste",
    sku: "SKU-001",
    category: "Utilidades",
    price: 10,
    shortDescription: "Descricao curta de teste.",
    description: "Descricao completa de teste do produto.",
    packageWidthCm: 20,
    packageHeightCm: 10,
    packageLengthCm: 25,
    packageWeightKg: 0.4,
  };
  const { input: out, estimate } = await maybeEnrichPackageOnCreate(input, {
    generate: async () => {
      throw new Error("should not call AI");
    },
  });
  assert.equal(out.packageWidthCm, 20);
  assert.equal(estimate, undefined);
});

test("maybeEnrichPackageOnCreate merges AI result", async () => {
  const input: AdminProductCreateInput = {
    name: "Espelho LED",
    slug: "espelho-led",
    sku: "SKU-002",
    category: "Skincare",
    price: 49,
    shortDescription: "Espelho portatil com LED.",
    description: "Espelho de maquiagem portatil com iluminacao LED.",
  };
  const { input: out, estimate } = await maybeEnrichPackageOnCreate(input, {
    generate: async () => ({
      packageWidthCm: 20,
      packageHeightCm: 9,
      packageLengthCm: 25,
      packageWeightKg: 0.48,
      confidence: 0.75,
      reasoning: "Espelho portatil em caixa fina.",
      warnings: [],
    }),
  });
  assert.equal(out.packageWidthCm, 20);
  assert.equal(out.packageWeightKg, 0.48);
  assert.equal(estimate?.confidence, 0.75);
});

test("collectProductImageUrls dedupes cover and gallery", () => {
  const urls = collectProductImageUrls("/a.jpg", ["/a.jpg", "/b.jpg", "/c.jpg"], 2);
  assert.deepEqual(urls, ["/a.jpg", "/b.jpg"]);
});

test("isGeminiQuotaError detects quota messages", () => {
  assert.equal(
    isGeminiQuotaError(new Error("Quota exceeded for metric: free_tier")),
    true,
  );
  assert.equal(isGeminiQuotaError(new Error("network timeout")), false);
});

test("getPackageAiModelCandidates includes fallbacks", () => {
  const prev = process.env.PACKAGE_AI_MODEL;
  delete process.env.PACKAGE_AI_MODEL;
  const models = getPackageAiModelCandidates();
  assert.ok(models.includes("gemini-2.5-flash-lite"));
  assert.ok(models.length >= 2);
  process.env.PACKAGE_AI_MODEL = prev;
});

test("formatGeminiEstimateError returns friendly text for quota", () => {
  const msg = formatGeminiEstimateError(
    new Error("You exceeded your current quota"),
  );
  assert.match(msg, /Cota gratuita do Gemini/);
});

test("resolveAbsoluteImageUrl prefixes relative paths", () => {
  const prev = process.env.NEXT_PUBLIC_APP_URL;
  process.env.NEXT_PUBLIC_APP_URL = "https://loja.exemplo.com";
  assert.equal(
    resolveAbsoluteImageUrl("/uploads/x.jpg"),
    "https://loja.exemplo.com/uploads/x.jpg",
  );
  process.env.NEXT_PUBLIC_APP_URL = prev;
});
