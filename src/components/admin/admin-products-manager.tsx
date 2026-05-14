"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProductEditModal } from "@/components/admin/product-edit-modal";
import { uploadProductImageClient } from "@/lib/admin-product-upload";
import { computeDraftCurrencyLabel } from "@/lib/admin-bulk-enrichment";
import { mergeCommaSeparatedUniqueImageUrls, parseCommaSeparatedUniqueImageUrls } from "@/lib/product-json";
import { getProductHeroSrc } from "@/lib/product-media";
import type { Product } from "@/lib/types";

type BulkDraft = {
  inputName: string;
  confidence: number;
  warnings: string[];
  sources?: Array<{ provider: string; url: string }>;
  payload: {
    name: string;
    slug: string;
    sku: string;
    category: string;
    price: number;
    stock?: number;
    shortDescription: string;
    description: string;
    coverImage?: string;
    images?: string[];
    features?: string[];
    tags?: string[];
    pixDiscountPercent?: number;
    installmentQuantity?: number;
    installmentAmount?: number;
    published?: boolean;
  };
};

function parseBulkEntries(raw: string): string[] {
  const lines = raw
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean);

  const entries: string[] = [];
  for (const line of lines) {
    const hasUrl = /https?:\/\//i.test(line);
    if (hasUrl) {
      entries.push(line);
      continue;
    }
    const chunks = line.split(",").map((item) => item.trim()).filter(Boolean);
    entries.push(...chunks);
  }
  return entries;
}

function buildProductUpdates(products: Product[]) {
  return products.reduce(
    (acc: Record<string, { stock: string }>, product: Product) => {
      acc[product.id] = {
        stock: String(product.stock),
      };
      return acc;
    },
    {},
  );
}

function AdminProductThumb({ product }: { product: Product }) {
  const src = getProductHeroSrc(product);
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className="h-14 w-14 rounded-xl border border-[var(--color-line)] object-cover"
      />
    );
  }
  const a = product.images[0] ?? "#e2e8f0";
  const b = product.images[1] ?? a;
  return (
    <div
      className="h-14 w-14 rounded-xl border border-[var(--color-line)]"
      style={{ background: `linear-gradient(145deg, ${a}, ${b})` }}
    />
  );
}

async function fetchProducts() {
  const response = await fetch("/api/admin/products");

  if (!response.ok) {
    const json = await response.json();
    throw new Error(json?.error || "Erro ao carregar produtos.");
  }

  const json = await response.json();
  return (json.products || []) as Product[];
}

async function fetchCategories() {
  // Since we don't have an API for categories, we'll fetch products and extract unique categories
  const products = await fetchProducts();
  const categories = [...new Set(products.map(p => p.category))];
  return categories;
}

export function AdminProductsManager({
  embedded = false,
  mode = "all",
}: {
  embedded?: boolean;
  mode?: "all" | "manage" | "create";
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updates, setUpdates] = useState<Record<string, { stock: string }>>({});
  const [textEditProduct, setTextEditProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [newProduct, setNewProduct] = useState({
    name: "",
    slug: "",
    sku: "",
    category: "",
    price: "0",
    cost: "",
    stock: "0",
    shortDescription: "",
    description: "",
    coverImage: "",
    images: "",
    flashSaleActive: false,
    flashSaleDiscountPercent: "",
  });
  const [saving, setSaving] = useState(false);
  const [catalogDedupeRunning, setCatalogDedupeRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  async function loadProducts() {
    setLoading(true);
    setError(null);

    try {
      const nextProducts = await fetchProducts();
      setProducts(nextProducts);
      setUpdates(buildProductUpdates(nextProducts));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar produtos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function initializeProducts() {
      try {
        const nextProducts = await fetchProducts();
        const nextCategories = await fetchCategories();

        if (!active) {
          return;
        }

        setProducts(nextProducts);
        setCategories(nextCategories);
        setUpdates(buildProductUpdates(nextProducts));
        setError(null);
      } catch (err) {
        if (!active) {
          return;
        }

        setError(err instanceof Error ? err.message : "Erro ao carregar produtos.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void initializeProducts();

    return () => {
      active = false;
    };
  }, []);

  async function handleBulkUpdate() {
    setSaving(true);
    setMessage(null);

    try {
      const promises = Object.entries(updates).map(async ([productId, pending]) => {
        if (!pending) return;
        const response = await fetch("/api/admin/products", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: productId,
            stock: Number(pending.stock),
          }),
        });
        if (!response.ok) {
          throw new Error(`Falha ao atualizar produto ${productId}`);
        }
      });

      await Promise.all(promises);
      setMessage("Todos os produtos atualizados com sucesso.");
      await loadProducts();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Falha ao atualizar produtos.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDedupeGlobalImages() {
    if (
      !window.confirm(
        "Cada URL de imagem ficara em apenas um produto em todo o catalogo (capa + galeria). Produtos mais antigos mantem a URL; duplicatas em produtos mais novos serao removidas. Continuar?",
      )
    ) {
      return;
    }

    setCatalogDedupeRunning(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/products/dedupe-global-images", {
        method: "POST",
      });
      const json = (await response.json().catch(() => null)) as {
        productsUpdated?: number;
        galleryUrlsRemoved?: number;
        coversCleared?: number;
        error?: string;
      } | null;
      if (!response.ok) {
        throw new Error(json?.error || "Falha ao deduplicar URLs.");
      }
      const pu = json?.productsUpdated ?? 0;
      const gr = json?.galleryUrlsRemoved ?? 0;
      const cc = json?.coversCleared ?? 0;
      setMessage(
        `Catalogo: ${pu} produto(s) atualizado(s), ${gr} URL(s) removida(s) da galeria, ${cc} capa(s) limpa(s).`,
      );
      await loadProducts();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Falha ao deduplicar URLs.");
    } finally {
      setCatalogDedupeRunning(false);
    }
  }

  const [newCategory, setNewCategory] = useState("");
  const [bulkNamesInput, setBulkNamesInput] = useState("");
  const [bulkDrafts, setBulkDrafts] = useState<BulkDraft[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkSelected, setBulkSelected] = useState<Record<string, boolean>>({});
  const isManageOnly = mode === "manage";
  const isCreateOnly = mode === "create";

  async function handleDeleteProduct(productId: string) {
    if (!window.confirm("Tem certeza que deseja excluir este produto?")) {
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: productId }),
      });

      if (!response.ok) {
        const json = await response.json();
        throw new Error(json?.error || "Falha ao excluir produto.");
      }

      setMessage("Produto excluído com sucesso.");
      await loadProducts();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Falha ao excluir produto.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateProduct() {
    setSaving(true);
    setMessage(null);
    const errors: Record<string, string> = {};

    // Validação de campos obrigatórios
    if (!newProduct.name || newProduct.name.trim().length === 0) {
      errors.name = "Nome é obrigatório.";
    } else if (newProduct.name.length < 3) {
      errors.name = "Nome deve ter pelo menos 3 caracteres.";
    }

    if (!newProduct.slug || newProduct.slug.trim().length === 0) {
      errors.slug = "Slug é obrigatório.";
    } else if (newProduct.slug.length < 3) {
      errors.slug = "Slug deve ter pelo menos 3 caracteres.";
    }

    if (!newProduct.sku || newProduct.sku.trim().length === 0) {
      errors.sku = "SKU é obrigatório.";
    } else if (newProduct.sku.length < 3) {
      errors.sku = "SKU deve ter pelo menos 3 caracteres.";
    }

    let category = newProduct.category;
    if (category === "nova") {
      if (!newCategory || newCategory.trim().length === 0) {
        errors.category = "Digite uma nova categoria.";
      } else if (newCategory.length < 3) {
        errors.category = "Categoria deve ter pelo menos 3 caracteres.";
      } else {
        category = newCategory;
      }
    } else if (!category || category.length === 0) {
      errors.category = "Selecione uma categoria.";
    }

    if (!newProduct.price || Number(newProduct.price) <= 0) {
      errors.price = "Preço deve ser maior que 0.";
    }

    if (!newProduct.shortDescription || newProduct.shortDescription.trim().length === 0) {
      errors.shortDescription = "Descrição curta é obrigatória.";
    } else if (newProduct.shortDescription.length < 10) {
      errors.shortDescription = "Descrição curta deve ter pelo menos 10 caracteres.";
    }

    if (!newProduct.description || newProduct.description.trim().length === 0) {
      errors.description = "Descrição completa é obrigatória.";
    } else if (newProduct.description.length < 10) {
      errors.description = "Descrição completa deve ter pelo menos 10 caracteres.";
    }

    if (newProduct.flashSaleActive) {
      const fp = Number(newProduct.flashSaleDiscountPercent);
      if (
        !Number.isFinite(fp) ||
        fp < 1 ||
        fp > 99 ||
        Math.floor(fp) !== fp
      ) {
        errors.flashSaleDiscountPercent =
          "Informe um inteiro entre 1 e 99 para o desconto exibido na oferta.";
      }
    }

    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      setMessage("Preencha todos os campos obrigatórios corretamente.");
      setSaving(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProduct.name,
          slug: newProduct.slug,
          sku: newProduct.sku,
          category,
          price: Number(newProduct.price),
          ...(newProduct.cost.trim()
            ? (() => {
                const c = Number(newProduct.cost.replace(",", "."));
                return !Number.isNaN(c) && c > 0 ? { cost: c } : {};
              })()
            : {}),
          stock: Number(newProduct.stock) || 0,
          shortDescription: newProduct.shortDescription,
          description: newProduct.description,
          coverImage: newProduct.coverImage || undefined,
          images: parseCommaSeparatedUniqueImageUrls(newProduct.images ?? ""),
          flashSaleActive: newProduct.flashSaleActive,
          flashSaleDiscountPercent: newProduct.flashSaleActive
            ? Number(newProduct.flashSaleDiscountPercent)
            : null,
        }),
      });

      if (!response.ok) {
        const json = await response.json();
        throw new Error(json?.error || "Falha ao criar produto.");
      }

      setMessage("✓ Produto criado com sucesso!");
      setNewProduct({
        name: "",
        slug: "",
        sku: "",
        category: "",
        price: "0",
        cost: "",
        stock: "0",
        shortDescription: "",
        description: "",
        coverImage: "",
        images: "",
        flashSaleActive: false,
        flashSaleDiscountPercent: "",
      });
      setNewCategory("");
      setValidationErrors({});
      await loadProducts();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Falha ao criar produto.");
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateBulkDrafts() {
    setBulkError(null);
    setMessage(null);
    const entries = parseBulkEntries(bulkNamesInput);
    if (entries.length === 0) {
      setBulkError("Cole ao menos um nome ou URL para gerar o lote.");
      return;
    }

    setBulkLoading(true);
    try {
      const response = await fetch("/api/admin/products/bulk-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      const json = (await response.json().catch(() => null)) as
        | { drafts?: BulkDraft[]; error?: string }
        | null;
      if (!response.ok) {
        throw new Error(json?.error || "Falha ao gerar preview em lote.");
      }
      const drafts = json?.drafts ?? [];
      setBulkDrafts(drafts);
      setBulkSelected(
        drafts.reduce(
          (acc, draft) => ({ ...acc, [draft.payload.slug]: true }),
          {} as Record<string, boolean>,
        ),
      );
      setMessage(`Preview gerado para ${drafts.length} produtos.`);
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : "Falha ao gerar preview.");
    } finally {
      setBulkLoading(false);
    }
  }

  function updateDraftField(
    slug: string,
    key: keyof BulkDraft["payload"],
    value: string | number | string[] | boolean | undefined,
  ) {
    setBulkDrafts((current) =>
      current.map((draft) =>
        draft.payload.slug !== slug
          ? draft
          : {
              ...draft,
              payload: {
                ...draft.payload,
                [key]: value,
              },
            },
      ),
    );
  }

  async function handlePersistBulkDrafts() {
    setBulkSaving(true);
    setBulkError(null);
    setMessage(null);
    try {
      const selectedItems = bulkDrafts
        .filter((draft) => bulkSelected[draft.payload.slug])
        .map((draft) => draft.payload);
      if (selectedItems.length === 0) {
        throw new Error("Selecione ao menos um item para salvar.");
      }

      const response = await fetch("/api/admin/products/bulk-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: selectedItems }),
      });
      const json = (await response.json().catch(() => null)) as
        | { created?: Product[]; errors?: Array<{ name: string; message: string }>; error?: string }
        | null;
      if (!response.ok) {
        throw new Error(json?.error || "Falha ao salvar lote.");
      }

      const created = json?.created?.length ?? 0;
      const errors = json?.errors ?? [];
      if (errors.length > 0) {
        setMessage(
          `Lote parcial: ${created} criados. Erros em ${errors.length}: ${errors
            .slice(0, 3)
            .map((item) => `${item.name} (${item.message})`)
            .join(" | ")}`,
        );
      } else {
        setMessage(`Lote salvo com sucesso. ${created} produtos criados.`);
      }
      await loadProducts();
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : "Falha ao salvar lote.");
    } finally {
      setBulkSaving(false);
    }
  }

  return (
    <div className="mt-8 space-y-8">
      {!isCreateOnly ? (
      <div className="rounded-[2rem] border border-[var(--color-line)] bg-white p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {!embedded ? (
            <div>
              <h2 className="font-display text-2xl font-bold text-[var(--color-ink)]">
                Gerenciar produtos
              </h2>
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                Atualize estoque em lote. Para alterar dados e imagens de um produto, use o ícone
                de lápis ao lado de Excluir (URL ou envio de arquivo).
              </p>
            </div>
          ) : <div />}
          <div className="text-sm text-[var(--color-muted)]">
            {saving || catalogDedupeRunning ? "Salvando..." : "Alteracoes salvas no banco de dados."}
          </div>
        </div>

        {message ? (
          <div className="mt-6 rounded-3xl bg-[var(--color-surface)] p-4 text-sm text-[var(--color-ink)]">
            {message}
          </div>
        ) : null}

        <div className="mt-6">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleBulkUpdate}
              disabled={saving || catalogDedupeRunning}
              className="touch-target-mobile rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white"
            >
              Salvar Todas Alterações
            </button>
            <button
              type="button"
              onClick={() => void handleDedupeGlobalImages()}
              disabled={saving || catalogDedupeRunning}
              title="Remove URLs repetidas entre todos os produtos; cada URL fica so uma vez no catalogo"
              className="touch-target-mobile rounded-full border border-amber-600/40 bg-amber-50 px-6 py-3 text-sm font-semibold text-amber-950 hover:bg-amber-100 disabled:opacity-50"
            >
              {catalogDedupeRunning ? "Limpando..." : "URLs unicas no catalogo"}
            </button>
            <Link
              href="/admin/criacao-produtos"
              className="touch-target-mobile inline-flex items-center rounded-full border border-[var(--color-line)] px-6 py-3 text-sm font-semibold text-[var(--color-ink)] hover:bg-[var(--color-surface)]"
            >
              Ir para Criacao de Produtos
            </Link>
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-3xl bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <p className="mt-6 text-sm text-[var(--color-muted)]">Carregando produtos...</p>
        ) : (
          <>
          <div className="mt-6 space-y-3 md:hidden">
            {products.map((product) => (
              <article key={product.id} className="rounded-[1.4rem] border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
                <div className="flex items-center gap-3">
                  <AdminProductThumb product={product} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[var(--color-ink)]">{product.name}</p>
                    <p className="text-xs text-[var(--color-muted)]">{product.category}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                    Estoque
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={updates[product.id]?.stock ?? String(product.stock)}
                    onChange={(event) =>
                      setUpdates((current) => ({
                        ...current,
                        [product.id]: {
                          ...current[product.id],
                          stock: event.target.value,
                        },
                      }))
                    }
                    className="mt-1 w-full rounded-2xl border border-[var(--color-line)] bg-white px-3 py-2 text-sm text-[var(--color-ink)]"
                  />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTextEditProduct(product)}
                    disabled={saving}
                    className="touch-target-mobile inline-flex items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-sm font-semibold text-[var(--color-ink)] disabled:opacity-50"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteProduct(product.id)}
                    disabled={saving}
                    className="touch-target-mobile rounded-full bg-red-500 px-3 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50"
                  >
                    Excluir
                  </button>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-6 hidden overflow-x-auto md:block">
            <table className="min-w-full divide-y divide-[var(--color-line)] text-left text-sm">
              <thead>
                <tr>
                  <th className="px-4 py-3 font-semibold text-[var(--color-ink)]">Miniatura</th>
                  <th className="px-4 py-3 font-semibold text-[var(--color-ink)]">Produto</th>
                  <th className="px-4 py-3 font-semibold text-[var(--color-ink)]">Estoque</th>
                  <th className="px-4 py-3 font-semibold text-[var(--color-ink)]">Açoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-line)]">
                {products.map((product) => (
                  <tr key={product.id}>
                    <td className="px-4 py-3">
                      <AdminProductThumb product={product} />
                    </td>
                    <td className="px-4 py-3">{product.name}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="0"
                        value={updates[product.id]?.stock ?? String(product.stock)}
                        onChange={(event) =>
                          setUpdates((current) => ({
                            ...current,
                            [product.id]: {
                              ...current[product.id],
                              stock: event.target.value,
                            },
                          }))
                        }
                        className="w-28 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)]"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setTextEditProduct(product)}
                          disabled={saving}
                          aria-label="Editar produto"
                          title="Editar produto"
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:border-[var(--color-primary)] disabled:opacity-50"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            width="18"
                            height="18"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden
                          >
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(product.id)}
                          disabled={saving}
                          className="rounded-full bg-red-500 px-4 py-2 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
      ) : null}

      {!isManageOnly ? (
      <div className="rounded-[2rem] border border-[var(--color-line)] bg-white p-6">
        <h3 className="font-display text-xl font-bold text-[var(--color-ink)]">
          Cadastro em massa com IA
        </h3>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Cole nomes de produtos ou URLs (quebra de linha ou virgula). O sistema tenta
          extrair nome, preco e imagem da URL, e completa descricao para revisao.
        </p>
        <textarea
          value={bulkNamesInput}
          onChange={(event) => setBulkNamesInput(event.target.value)}
          rows={5}
          placeholder={
            "Ex.: Fone Bluetooth X100\nhttps://www.exemplo.com/produto/123\nKit Organizador de Gaveta"
          }
          className="mt-4 w-full rounded-3xl border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3 text-sm leading-6"
        />
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleGenerateBulkDrafts}
            disabled={bulkLoading}
            className="rounded-full bg-[var(--color-primary)] px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {bulkLoading ? "Gerando..." : "Gerar preview em lote"}
          </button>
          <button
            type="button"
            onClick={handlePersistBulkDrafts}
            disabled={bulkSaving || bulkDrafts.length === 0}
            className="rounded-full border border-[var(--color-line)] px-5 py-2 text-sm font-semibold text-[var(--color-ink)] disabled:opacity-60"
          >
            {bulkSaving ? "Salvando..." : "Salvar itens selecionados"}
          </button>
        </div>
        {bulkError ? (
          <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">{bulkError}</p>
        ) : null}

        {bulkDrafts.length > 0 ? (
          <div className="mt-6 space-y-4">
            {bulkDrafts.map((draft) => (
              <article
                key={draft.payload.slug}
                className="rounded-3xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <label className="inline-flex items-center gap-2 text-sm font-semibold">
                    <input
                      type="checkbox"
                      checked={Boolean(bulkSelected[draft.payload.slug])}
                      onChange={(event) =>
                        setBulkSelected((current) => ({
                          ...current,
                          [draft.payload.slug]: event.target.checked,
                        }))
                      }
                    />
                    Selecionar item
                  </label>
                  <span className="text-xs text-[var(--color-muted)]">
                    Confianca: {Math.round(draft.confidence * 100)}% -{" "}
                    {computeDraftCurrencyLabel(draft.payload.price)}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs">
                    Nome
                    <input
                      value={draft.payload.name}
                      onChange={(event) =>
                        updateDraftField(draft.payload.slug, "name", event.target.value)
                      }
                      className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="text-xs">
                    Preco
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={draft.payload.price}
                      onChange={(event) =>
                        updateDraftField(
                          draft.payload.slug,
                          "price",
                          Number(event.target.value) || 0,
                        )
                      }
                      className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="text-xs">
                    Categoria
                    <select
                      value={draft.payload.category}
                      onChange={(event) =>
                        updateDraftField(draft.payload.slug, "category", event.target.value)
                      }
                      className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 text-sm"
                    >
                      {Array.from(
                        new Set([draft.payload.category, ...categories].filter(Boolean)),
                      ).map((categoryOption) => (
                        <option key={categoryOption} value={categoryOption}>
                          {categoryOption}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs">
                    Imagem de capa (URL)
                    <input
                      value={draft.payload.coverImage ?? ""}
                      onChange={(event) =>
                        updateDraftField(draft.payload.slug, "coverImage", event.target.value)
                      }
                      className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 text-sm"
                    />
                  </label>
                </div>

                <label className="mt-3 block text-xs">
                  Descricao curta
                  <textarea
                    value={draft.payload.shortDescription}
                    onChange={(event) =>
                      updateDraftField(
                        draft.payload.slug,
                        "shortDescription",
                        event.target.value,
                      )
                    }
                    rows={2}
                    className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 text-sm"
                  />
                </label>

                <label className="mt-3 block text-xs">
                  Descricao completa
                  <textarea
                    value={draft.payload.description}
                    onChange={(event) =>
                      updateDraftField(draft.payload.slug, "description", event.target.value)
                    }
                    rows={3}
                    className="mt-1 w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 text-sm"
                  />
                </label>

                {draft.warnings.length > 0 ? (
                  <p className="mt-2 text-xs text-amber-700">{draft.warnings.join(" | ")}</p>
                ) : null}
                {draft.sources?.[0]?.url ? (
                  <p className="mt-1 text-xs text-[var(--color-muted)]">
                    Fonte: {draft.sources[0].provider} - {draft.sources[0].url}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        ) : null}
      </div>
      ) : null}

      {!isManageOnly ? (
      <div className="rounded-[2rem] border border-[var(--color-line)] bg-white p-6">
        <h3 className="font-display text-xl font-bold text-[var(--color-ink)]">
          Adicionar novo produto
        </h3>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            Nome
            <input
              value={newProduct.name}
              onChange={(event) =>
                setNewProduct((current) => ({ ...current, name: event.target.value }))
              }
              className={`mt-2 w-full rounded-2xl border ${validationErrors.name ? "border-red-500" : "border-[var(--color-line)]"} bg-[var(--color-surface)] px-3 py-2 text-sm`}
            />
            {validationErrors.name && <span className="mt-1 text-xs text-red-500">{validationErrors.name}</span>}
          </label>
          <label className="block text-sm">
            Slug
            <input
              value={newProduct.slug}
              onChange={(event) =>
                setNewProduct((current) => ({ ...current, slug: event.target.value }))
              }
              className={`mt-2 w-full rounded-2xl border ${validationErrors.slug ? "border-red-500" : "border-[var(--color-line)]"} bg-[var(--color-surface)] px-3 py-2 text-sm`}
            />
            {validationErrors.slug && <span className="mt-1 text-xs text-red-500">{validationErrors.slug}</span>}
          </label>
          <label className="block text-sm">
            SKU
            <input
              value={newProduct.sku}
              onChange={(event) =>
                setNewProduct((current) => ({ ...current, sku: event.target.value }))
              }
              className={`mt-2 w-full rounded-2xl border ${validationErrors.sku ? "border-red-500" : "border-[var(--color-line)]"} bg-[var(--color-surface)] px-3 py-2 text-sm`}
            />
            {validationErrors.sku && <span className="mt-1 text-xs text-red-500">{validationErrors.sku}</span>}
          </label>
          <label className="block text-sm">
            Categoria
            <select
              value={newProduct.category}
              onChange={(event) =>
                setNewProduct((current) => ({ ...current, category: event.target.value }))
              }
              className={`mt-2 w-full rounded-2xl border ${validationErrors.category ? "border-red-500" : "border-[var(--color-line)]"} bg-[var(--color-surface)] px-3 py-2 text-sm`}
            >
              <option value="">Selecione uma categoria</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
              <option value="nova">Criar nova categoria</option>
            </select>
            {newProduct.category === "nova" && (
              <input
                value={newCategory}
                onChange={(event) => setNewCategory(event.target.value)}
                placeholder="Digite a nova categoria"
                className={`mt-2 w-full rounded-2xl border ${validationErrors.category ? "border-red-500" : "border-[var(--color-line)]"} bg-[var(--color-surface)] px-3 py-2 text-sm`}
              />
            )}
            {validationErrors.category && <span className="mt-1 text-xs text-red-500">{validationErrors.category}</span>}
          </label>
          <div className="block text-sm">
            <span className="font-semibold text-[var(--color-ink)]">Imagem de capa (URL ou envio)</span>
            <input
              value={newProduct.coverImage}
              onChange={(event) =>
                setNewProduct((current) => ({ ...current, coverImage: event.target.value }))
              }
              className="mt-2 w-full rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-sm"
            />
            <label className="mt-2 inline-flex cursor-pointer rounded-full bg-[var(--color-ink)] px-4 py-2 text-xs font-bold text-white hover:opacity-90">
              Enviar foto de capa
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  try {
                    const url = await uploadProductImageClient(file);
                    setNewProduct((current) => ({ ...current, coverImage: url }));
                  } catch (err) {
                    setMessage(err instanceof Error ? err.message : "Falha no upload da capa.");
                  }
                }}
              />
            </label>
          </div>
          <label className="block text-sm">
            Preco (R$)
            <input
              type="number"
              min="0"
              step="0.01"
              value={newProduct.price}
              onChange={(event) =>
                setNewProduct((current) => ({ ...current, price: event.target.value }))
              }
              className={`mt-2 w-full rounded-2xl border ${validationErrors.price ? "border-red-500" : "border-[var(--color-line)]"} bg-[var(--color-surface)] px-3 py-2 text-sm`}
            />
            {validationErrors.price && <span className="mt-1 text-xs text-red-500">{validationErrors.price}</span>}
          </label>
          <label className="block text-sm">
            Custo / CMV (R$, opcional)
            <input
              type="number"
              min="0"
              step="0.01"
              value={newProduct.cost}
              onChange={(event) =>
                setNewProduct((current) => ({ ...current, cost: event.target.value }))
              }
              className="mt-2 w-full rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            Estoque
            <input
              type="number"
              min="0"
              value={newProduct.stock}
              onChange={(event) =>
                setNewProduct((current) => ({ ...current, stock: event.target.value }))
              }
              className="mt-2 w-full rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-sm"
            />
          </label>
          <div className="block text-sm sm:col-span-2">
            <span className="font-semibold text-[var(--color-ink)]">
              Galeria (URLs separadas por virgula, ou envie fotos)
            </span>
            <input
              value={newProduct.images}
              onChange={(event) =>
                setNewProduct((current) => ({ ...current, images: event.target.value }))
              }
              className="mt-2 w-full rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-sm"
            />
            <label className="mt-2 inline-flex cursor-pointer rounded-full border border-[var(--color-line)] px-4 py-2 text-xs font-bold hover:bg-[var(--color-surface)]">
              Enviar fotos na galeria
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={async (event) => {
                  const files = event.target.files;
                  event.target.value = "";
                  if (!files?.length) return;
                  try {
                    const urls: string[] = [];
                    for (const file of Array.from(files)) {
                      urls.push(await uploadProductImageClient(file));
                    }
                    setNewProduct((current) => ({
                      ...current,
                      images: mergeCommaSeparatedUniqueImageUrls(current.images, urls),
                    }));
                  } catch (err) {
                    setMessage(err instanceof Error ? err.message : "Falha no upload.");
                  }
                }}
              />
            </label>
          </div>
          <label className="block text-sm sm:col-span-2">
            Descricao curta
            <textarea
              value={newProduct.shortDescription}
              onChange={(event) =>
                setNewProduct((current) => ({
                  ...current,
                  shortDescription: event.target.value,
                }))
              }
              className={`mt-2 w-full rounded-3xl border ${validationErrors.shortDescription ? "border-red-500" : "border-[var(--color-line)]"} bg-[var(--color-surface)] px-3 py-3 text-sm leading-6`}
              rows={3}
            />
            {validationErrors.shortDescription && <span className="mt-1 text-xs text-red-500">{validationErrors.shortDescription}</span>}
          </label>
          <label className="block text-sm sm:col-span-2">
            Descricao completa
            <textarea
              value={newProduct.description}
              onChange={(event) =>
                setNewProduct((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              className={`mt-2 w-full rounded-3xl border ${validationErrors.description ? "border-red-500" : "border-[var(--color-line)]"} bg-[var(--color-surface)] px-3 py-3 text-sm leading-6`}
              rows={4}
            />
            {validationErrors.description && <span className="mt-1 text-xs text-red-500">{validationErrors.description}</span>}
          </label>
          <label className="flex cursor-pointer items-start gap-3 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={newProduct.flashSaleActive}
              onChange={(event) =>
                setNewProduct((current) => ({
                  ...current,
                  flashSaleActive: event.target.checked,
                  ...(!event.target.checked
                    ? { flashSaleDiscountPercent: "" }
                    : {}),
                }))
              }
              className="mt-1 rounded border-[var(--color-line)]"
            />
            <span>
              Oferta Relâmpago (24h após criar)
              <span className="mt-1 block text-xs font-normal text-[var(--color-muted)]">
                O produto entra no carrossel com contagem regressiva de 24 horas.
              </span>
            </span>
          </label>
          {newProduct.flashSaleActive ? (
            <label className="block text-sm sm:col-span-2">
              <span className="font-semibold text-[var(--color-ink)]">
                Desconto exibido na oferta (%)
              </span>
              <input
                type="number"
                min={1}
                max={99}
                step={1}
                inputMode="numeric"
                value={newProduct.flashSaleDiscountPercent}
                onChange={(event) =>
                  setNewProduct((current) => ({
                    ...current,
                    flashSaleDiscountPercent: event.target.value,
                  }))
                }
                className={`mt-2 w-full max-w-[8rem] rounded-3xl border px-3 py-2 text-sm ${
                  validationErrors.flashSaleDiscountPercent
                    ? "border-red-500"
                    : "border-[var(--color-line)]"
                } bg-[var(--color-surface)]`}
                placeholder="ex.: 30"
              />
              {validationErrors.flashSaleDiscountPercent ? (
                <span className="mt-1 block text-xs text-red-500">
                  {validationErrors.flashSaleDiscountPercent}
                </span>
              ) : (
                <span className="mt-1 block text-xs text-[var(--color-muted)]">
                  Valor mostrado ao cliente no selo da oferta (1 a 99%).
                </span>
              )}
            </label>
          ) : null}
        </div>
        <div className="mt-6">
          <button
            type="button"
            onClick={handleCreateProduct}
            className="rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white"
          >
            Criar produto
          </button>
        </div>
      </div>
      ) : null}

      {!isCreateOnly ? (
        <ProductEditModal
          product={textEditProduct}
          open={Boolean(textEditProduct)}
          categories={categories}
          onClose={() => setTextEditProduct(null)}
          onSaved={(updated) => {
            setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
            setUpdates((prev) => ({
              ...prev,
              [updated.id]: { stock: String(updated.stock) },
            }));
            setCategories((prev) =>
              updated.category && !prev.includes(updated.category)
                ? [...prev, updated.category]
                : prev,
            );
            setMessage("Produto atualizado.");
            setTextEditProduct(null);
          }}
        />
      ) : null}
    </div>
  );
}
