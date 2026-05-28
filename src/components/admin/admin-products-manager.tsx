"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminFlashSaleBadge } from "@/components/admin/admin-flash-sale-badge";
import { ProductEditModal } from "@/components/admin/product-edit-modal";
import { uploadProductImageClient } from "@/lib/admin-product-upload";
import { computeDraftCurrencyLabel } from "@/lib/admin-bulk-enrichment";
import {
  commaSeparatedImageUrlsHadDuplicates,
  mergeCommaSeparatedUniqueImageUrls,
  normalizeCommaSeparatedImageUrls,
  parseCommaSeparatedUniqueImageUrls,
} from "@/lib/product-json";
import { getProductHeroSrc } from "@/lib/product-media";
import { parsePackageFieldsFromForm } from "@/lib/package-dimensions";
import type { Product } from "@/lib/types";
import {
  emptyPackageFields,
  ProductPackageFields,
  type PackageEstimateHint,
} from "@/components/admin/product-package-fields";
import {
  packageEstimateToFormValues,
  productMissingPackageFields,
  requestPackageEstimate,
  type PackageEstimateApiResult,
} from "@/lib/admin-package-estimate-client";
import {
  adminActionButtonClass,
  IconEdit,
  IconSave,
  IconTrash,
} from "@/components/admin/admin-mobile-ui";

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

const DUPLICATE_GALLERY_ERROR =
  "Cada URL da galeria deve ser unica. Duplicatas foram removidas.";
const COVER_IN_GALLERY_ERROR = "A capa nao pode repetir uma URL da galeria.";

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
    ...emptyPackageFields(),
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [packageEstimating, setPackageEstimating] = useState(false);
  const [packageEstimateHint, setPackageEstimateHint] =
    useState<PackageEstimateHint | null>(null);
  const [packageBatchRunning, setPackageBatchRunning] = useState(false);

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

  const [newCategory, setNewCategory] = useState("");
  const [bulkNamesInput, setBulkNamesInput] = useState("");
  const [bulkDrafts, setBulkDrafts] = useState<BulkDraft[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkSelected, setBulkSelected] = useState<Record<string, boolean>>({});
  const isManageOnly = mode === "manage";
  const isCreateOnly = mode === "create";
  const productsMissingPackageCount = products.filter(productMissingPackageFields)
    .length;

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

  async function handleEstimateNewProductPackage() {
    if (!newProduct.name.trim()) {
      setMessage("Informe o nome do produto antes de estimar a embalagem.");
      return;
    }
    setPackageEstimating(true);
    setMessage(null);
    try {
      const estimate = await requestPackageEstimate({
        name: newProduct.name.trim(),
        category:
          newProduct.category === "nova"
            ? newCategory.trim() || undefined
            : newProduct.category || undefined,
        shortDescription: newProduct.shortDescription.trim() || undefined,
        coverImage: newProduct.coverImage.trim() || undefined,
        images: parseCommaSeparatedUniqueImageUrls(newProduct.images ?? ""),
      });
      setPackageEstimateHint(estimateToHint(estimate));
      const fields = packageEstimateToFormValues(estimate);
      setNewProduct((current) => ({ ...current, ...fields }));
      if (estimate.packageWidthCm == null) {
        setMessage(
          estimate.skippedReason ||
            "IA nao definiu medidas (confianca baixa ou erro). Revise manualmente.",
        );
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Falha na estimativa de embalagem.");
    } finally {
      setPackageEstimating(false);
    }
  }

  async function handlePackageBatchEstimate() {
    setPackageBatchRunning(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/products/estimate-package-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 25 }),
      });
      const json = (await response.json().catch(() => null)) as
        | {
            processed?: number;
            updated?: number;
            skipped?: number;
            errors?: Array<{ name: string; message: string }>;
            error?: string;
          }
        | null;
      if (!response.ok) {
        throw new Error(json?.error || "Falha no lote de embalagens.");
      }
      const processed = json?.processed ?? 0;
      const updated = json?.updated ?? 0;
      const skipped = json?.skipped ?? 0;
      setMessage(
        `Lote IA: ${updated} atualizados, ${skipped} ignorados, ${processed} processados.`,
      );
      if (json?.errors?.length) {
        setMessage(
          (prev) =>
            `${prev ?? ""} Erros: ${json.errors!
              .slice(0, 2)
              .map((e) => e.name)
              .join(", ")}.`,
        );
      }
      await loadProducts();
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Falha ao preencher embalagens em lote.",
      );
    } finally {
      setPackageBatchRunning(false);
    }
  }

  function estimateToHint(estimate: PackageEstimateApiResult): PackageEstimateHint {
    return {
      confidence: estimate.confidence,
      reasoning: estimate.reasoning,
      warnings: estimate.warnings,
      skippedReason: estimate.skippedReason,
    };
  }

  function getCoverInGalleryError(coverImageRaw: string, imagesCsvRaw: string): string | null {
    const cover = coverImageRaw.trim();
    if (!cover) return null;
    const gallery = parseCommaSeparatedUniqueImageUrls(imagesCsvRaw);
    return gallery.includes(cover) ? COVER_IN_GALLERY_ERROR : null;
  }

  function handleNewProductCoverChange(nextCover: string) {
    setNewProduct((current) => ({ ...current, coverImage: nextCover }));
    setValidationErrors((current) => {
      const next = { ...current };
      const coverError = getCoverInGalleryError(nextCover, newProduct.images);
      if (coverError) next.coverImage = coverError;
      else if (next.coverImage === COVER_IN_GALLERY_ERROR) delete next.coverImage;
      return next;
    });
  }

  function handleNewProductGalleryChange(rawImages: string) {
    const hadDuplicates = commaSeparatedImageUrlsHadDuplicates(rawImages);
    const normalized = normalizeCommaSeparatedImageUrls(rawImages);
    setNewProduct((current) => ({ ...current, images: normalized }));
    setValidationErrors((current) => {
      const next = { ...current };
      if (hadDuplicates) next.images = DUPLICATE_GALLERY_ERROR;
      else delete next.images;

      const coverError = getCoverInGalleryError(newProduct.coverImage, normalized);
      if (coverError) next.coverImage = coverError;
      else if (next.coverImage === COVER_IN_GALLERY_ERROR) delete next.coverImage;
      return next;
    });
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

    const normalizedGallery = normalizeCommaSeparatedImageUrls(newProduct.images ?? "");
    if (commaSeparatedImageUrlsHadDuplicates(newProduct.images ?? "")) {
      errors.images = DUPLICATE_GALLERY_ERROR;
    }
    const coverInGalleryError = getCoverInGalleryError(newProduct.coverImage, normalizedGallery);
    if (coverInGalleryError) {
      errors.coverImage = coverInGalleryError;
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

    const pkg = parsePackageFieldsFromForm(newProduct);
    if ("error" in pkg) {
      errors.package = pkg.error;
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
          images: parseCommaSeparatedUniqueImageUrls(normalizedGallery),
          flashSaleActive: newProduct.flashSaleActive,
          flashSaleDiscountPercent: newProduct.flashSaleActive
            ? Number(newProduct.flashSaleDiscountPercent)
            : null,
          ...(!("error" in pkg) ? pkg : {}),
        }),
      });

      if (!response.ok) {
        const json = await response.json();
        throw new Error(json?.error || "Falha ao criar produto.");
      }

      const createdJson = (await response.json()) as {
        product?: Product;
        packageAiEstimate?: PackageEstimateApiResult;
        error?: string;
      };
      if (!createdJson?.product) {
        throw new Error(
          createdJson?.error || "Resposta do servidor sem dados do produto.",
        );
      }
      let successMsg = "✓ Produto criado com sucesso!";
      const aiEst = createdJson.packageAiEstimate;
      if (aiEst?.packageWidthCm != null) {
        successMsg += ` Embalagem estimada pela IA (confianca ${Math.round(aiEst.confidence * 100)}%).`;
        setPackageEstimateHint(estimateToHint(aiEst));
      } else {
        setPackageEstimateHint(null);
      }

      setMessage(successMsg);
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
        ...emptyPackageFields(),
      });
      setNewCategory("");
      setValidationErrors({});
      if (!aiEst?.packageWidthCm) {
        setPackageEstimateHint(null);
      }
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
            {saving ? "Salvando..." : "Alteracoes salvas no banco de dados."}
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
              disabled={saving}
              className={adminActionButtonClass({ tone: "primary" })}
            >
              <IconSave className="h-4 w-4" />
              Salvar Todas Alterações
            </button>
            {productsMissingPackageCount > 0 ? (
              <button
                type="button"
                onClick={() => void handlePackageBatchEstimate()}
                disabled={saving || packageBatchRunning}
                title="Estima embalagem com IA para ate 25 produtos sem medidas cadastradas"
                className="touch-target-mobile inline-flex items-center rounded-full border border-violet-300 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-950 hover:bg-violet-100 disabled:opacity-50"
              >
                {packageBatchRunning
                  ? "IA embalagem..."
                  : `Preencher embalagens (IA) · ${productsMissingPackageCount}`}
              </button>
            ) : null}
            <Link
              href="/admin/criacao-produtos"
              className={adminActionButtonClass({})}
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
                    <div className="mt-2">
                      <AdminFlashSaleBadge product={product} />
                    </div>
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
                    className={adminActionButtonClass({ compact: true })}
                  >
                    <IconEdit className="h-4 w-4" />
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteProduct(product.id)}
                    disabled={saving}
                    className={adminActionButtonClass({ tone: "danger", compact: true })}
                  >
                    <IconTrash className="h-4 w-4" />
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
                  <th className="px-4 py-3 font-semibold text-[var(--color-ink)]">
                    Oferta relampago
                  </th>
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
                      <AdminFlashSaleBadge product={product} />
                    </td>
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
                          className="touch-target-mobile inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:border-[var(--color-primary)] disabled:opacity-50"
                        >
                          <IconEdit className="h-[18px] w-[18px]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(product.id)}
                          disabled={saving}
                          className={adminActionButtonClass({ tone: "danger", compact: true })}
                        >
                          <IconTrash className="h-4 w-4" />
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
            className={adminActionButtonClass({ tone: "primary", compact: true })}
          >
            {bulkLoading ? "Gerando..." : "Gerar preview em lote"}
          </button>
          <button
            type="button"
            onClick={handlePersistBulkDrafts}
            disabled={bulkSaving || bulkDrafts.length === 0}
            className={adminActionButtonClass({ compact: true })}
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
              onChange={(event) => handleNewProductCoverChange(event.target.value)}
              className={`mt-2 w-full rounded-2xl border ${validationErrors.coverImage ? "border-red-500" : "border-[var(--color-line)]"} bg-[var(--color-surface)] px-3 py-2 text-sm`}
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
                    handleNewProductCoverChange(url);
                  } catch (err) {
                    setMessage(err instanceof Error ? err.message : "Falha no upload da capa.");
                  }
                }}
              />
            </label>
            {validationErrors.coverImage && (
              <span className="mt-1 text-xs text-red-500">{validationErrors.coverImage}</span>
            )}
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
              onChange={(event) => handleNewProductGalleryChange(event.target.value)}
              className={`mt-2 w-full rounded-2xl border ${validationErrors.images ? "border-red-500" : "border-[var(--color-line)]"} bg-[var(--color-surface)] px-3 py-2 text-sm`}
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
                    setNewProduct((current) => {
                      const existingImages = parseCommaSeparatedUniqueImageUrls(current.images);
                      const mergedImages = mergeCommaSeparatedUniqueImageUrls(
                        current.images,
                        urls,
                      );
                      const mergedImagesCount =
                        parseCommaSeparatedUniqueImageUrls(mergedImages).length;
                      const hadDuplicates =
                        mergedImagesCount < existingImages.length + urls.length;

                      setValidationErrors((currentErrors) => {
                        const next = { ...currentErrors };
                        if (hadDuplicates) next.images = DUPLICATE_GALLERY_ERROR;
                        else delete next.images;

                        const coverError = getCoverInGalleryError(
                          current.coverImage,
                          mergedImages,
                        );
                        if (coverError) next.coverImage = coverError;
                        else if (next.coverImage === COVER_IN_GALLERY_ERROR) {
                          delete next.coverImage;
                        }
                        return next;
                      });

                      return {
                        ...current,
                        images: mergedImages,
                      };
                    });
                  } catch (err) {
                    setMessage(err instanceof Error ? err.message : "Falha no upload.");
                  }
                }}
              />
            </label>
            {validationErrors.images && (
              <span className="mt-1 text-xs text-red-500">{validationErrors.images}</span>
            )}
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
          <ProductPackageFields
            className="sm:col-span-2"
            values={{
              packageWidthCm: newProduct.packageWidthCm,
              packageHeightCm: newProduct.packageHeightCm,
              packageLengthCm: newProduct.packageLengthCm,
              packageWeightKg: newProduct.packageWeightKg,
            }}
            errors={validationErrors}
            canEstimate={newProduct.name.trim().length >= 2}
            estimating={packageEstimating}
            onEstimate={() => void handleEstimateNewProductPackage()}
            estimateHint={packageEstimateHint}
            onChange={(field, value) =>
              setNewProduct((current) => ({ ...current, [field]: value }))
            }
          />
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
            className={adminActionButtonClass({ tone: "primary" })}
          >
            <IconSave className="h-4 w-4" />
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
