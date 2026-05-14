import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBulkProductDrafts,
  computeDraftCurrencyLabel,
} from "@/lib/admin-bulk-enrichment";

test("gera drafts com slug e sku unicos", async () => {
  const originalFetch = global.fetch;
  global.fetch = (async () =>
    new Response(
      `{"price":120.5} {"price":119.9} https://cdn.example.com/produto-1.jpg`,
      { status: 200 },
    )) as typeof fetch;

  const drafts = await buildBulkProductDrafts({
    entries: ["Fone bluetooth", "Fone bluetooth"],
    existingProducts: [{ slug: "fone-bluetooth", sku: "FONEBLU-001" }],
  });

  global.fetch = originalFetch;

  assert.equal(drafts.length, 2);
  assert.notEqual(drafts[0]?.payload.slug, drafts[1]?.payload.slug);
  assert.notEqual(drafts[0]?.payload.sku, drafts[1]?.payload.sku);
  assert.ok((drafts[0]?.payload.images?.length ?? 0) >= 1);
});

test("aplica fallback quando busca de mercado falha", async () => {
  const originalFetch = global.fetch;
  global.fetch = (async () => {
    throw new Error("network error");
  }) as typeof fetch;

  const drafts = await buildBulkProductDrafts({
    entries: ["Produto teste fallback"],
    existingProducts: [],
  });

  global.fetch = originalFetch;

  assert.equal(drafts.length, 1);
  assert.equal(drafts[0]?.payload.price, 49.9);
  assert.ok((drafts[0]?.warnings.length ?? 0) > 0);
});

test("formata preco em BRL", () => {
  assert.equal(computeDraftCurrencyLabel(10).replace(/\u00a0/g, " "), "R$ 10,00");
});

test("extrai nome e preco a partir de URL", async () => {
  const originalFetch = global.fetch;
  global.fetch = (async () =>
    new Response(
      `
      <html>
        <head>
          <title>Escova Secadora Pro 2200W</title>
          <meta property="og:title" content="Escova Secadora Pro 2200W" />
        </head>
        <body>
          {"price":"199.90"}
          <img src="https://cdn.example.com/escova.jpg" />
        </body>
      </html>
      `,
      { status: 200 },
    )) as typeof fetch;

  const drafts = await buildBulkProductDrafts({
    entries: ["https://loja.exemplo.com/produto/escova-secadora-pro"],
    existingProducts: [],
  });

  global.fetch = originalFetch;

  assert.equal(drafts.length, 1);
  assert.equal(drafts[0]?.payload.name, "Escova Secadora Pro 2200w");
  assert.equal(drafts[0]?.payload.price, 199.9);
  assert.ok((drafts[0]?.sources.length ?? 0) > 0);
});

test("normaliza URL do Mercado Livre removendo query e hash", async () => {
  const originalFetch = global.fetch;
  global.fetch = (async () =>
    new Response(
      `
      <html>
        <head><title>Kit Calcinha Renda</title></head>
        <body>{"price":"89.90"}</body>
      </html>
      `,
      { status: 200 },
    )) as typeof fetch;

  const drafts = await buildBulkProductDrafts({
    entries: [
      "https://produto.mercadolivre.com.br/MLB-4914737956-kit-10-calcinhas-fio-duplo-lateral-renda-microfibra-atacado-_JM#reco_item_pos=3&foo=bar",
    ],
    existingProducts: [],
  });

  global.fetch = originalFetch;

  assert.equal(drafts.length, 1);
  const sourceUrl = drafts[0]?.sources[0]?.url ?? "";
  assert.equal(sourceUrl.includes("#"), false);
  assert.equal(sourceUrl.includes("?"), false);
  assert.equal(sourceUrl.includes("MLB-4914737956"), true);
});

test("quando titulo falha, usa nome inferido do slug da URL", async () => {
  const originalFetch = global.fetch;
  global.fetch = (async () => new Response("<html><body>blocked</body></html>", { status: 403 })) as typeof fetch;

  const drafts = await buildBulkProductDrafts({
    entries: [
      "https://produto.mercadolivre.com.br/MLB-4914737956-kit-10-calcinhas-fio-duplo-lateral-renda-microfibra-atacado-_JM#abc",
    ],
    existingProducts: [],
  });

  global.fetch = originalFetch;

  assert.equal(drafts.length, 1);
  assert.equal(
    drafts[0]?.payload.name,
    "Kit 10 Calcinhas Fio Duplo Lateral Renda Microfibra Atacado",
  );
});
