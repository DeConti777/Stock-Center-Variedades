"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { uploadProductImageClient } from "@/lib/admin-product-upload";
import { dedupeImageUrlsExact, mergeCommaSeparatedUniqueImageUrls, parseCommaSeparatedUniqueImageUrls } from "@/lib/product-json";
import { isFlashSaleActive } from "@/lib/flash-sale";
import type { Product, ProductTag } from "@/lib/types";

type ProductEditModalProps = {
  product: Product | null;
  open: boolean;
  categories: string[];
  onClose: () => void;
  onSaved: (product: Product) => void;
};

const TAG_OPTIONS: { value: ProductTag; label: string }[] = [
  { value: "featured", label: "Destaque" },
  { value: "bestSeller", label: "Mais vendido" },
  { value: "promotion", label: "Promocao" },
  { value: "new", label: "Novo" },
];

const VALID_TAGS: readonly ProductTag[] = ["featured", "bestSeller", "promotion", "new"];

function normalizeTags(tags: ProductTag[]): ProductTag[] {
  return tags.filter((t): t is ProductTag =>
    (VALID_TAGS as readonly string[]).includes(t),
  );
}

type Draft = {
  name: string;
  slug: string;
  sku: string;
  category: string;
  price: string;
  cost: string;
  originalPrice: string;
  pixDiscountPercent: string;
  installmentQuantity: string;
  installmentAmount: string;
  stock: string;
  rating: string;
  reviews: string;
  shortDescription: string;
  description: string;
  badge: string;
  coverImage: string;
  images: string;
  features: string;
  tags: ProductTag[];
  published: boolean;
  flashSaleActive: boolean;
  flashSaleDiscountPercent: string;
};

function productToDraft(p: Product): Draft {
  return {
    name: p.name,
    slug: p.slug,
    sku: p.sku,
    category: p.category,
    price: String(p.price),
    cost: p.cost != null ? String(p.cost) : "",
    originalPrice: p.originalPrice != null ? String(p.originalPrice) : "",
    pixDiscountPercent: String(p.pixDiscountPercent),
    installmentQuantity: String(p.installment.quantity),
    installmentAmount: String(p.installment.amount),
    stock: String(p.stock),
    rating: String(p.rating),
    reviews: String(p.reviews),
    shortDescription: p.shortDescription,
    description: p.description,
    badge: p.badge ?? "",
    coverImage: p.coverImage ?? "",
    images: dedupeImageUrlsExact(p.images).join(", "),
    features: p.features.join("\n"),
    tags: normalizeTags(p.tags),
    published: p.published ?? true,
    flashSaleActive: isFlashSaleActive(p),
    flashSaleDiscountPercent:
      p.flashSaleDiscountPercent != null ? String(p.flashSaleDiscountPercent) : "",
  };
}

export function ProductEditModal({
  product,
  open,
  categories,
  onClose,
  onSaved,
}: ProductEditModalProps) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const resetFromProduct = useCallback((p: Product) => {
    setDraft(productToDraft(p));
    setNewCategory("");
    setError(null);
    setFieldErrors({});
  }, []);

  useEffect(() => {
    if (open && product) {
      resetFromProduct(product);
    }
  }, [open, product, resetFromProduct]);

  const categoryOptions = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const c of categories) {
      if (!seen.has(c)) {
        seen.add(c);
        list.push(c);
      }
    }
    if (product?.category && !seen.has(product.category)) {
      list.unshift(product.category);
    }
    return list;
  }, [categories, product]);

  function toggleTag(tag: ProductTag) {
    setDraft((d) => {
      if (!d) return d;
      const has = d.tags.includes(tag);
      return {
        ...d,
        tags: has ? d.tags.filter((t) => t !== tag) : [...d.tags, tag],
      };
    });
  }

  async function handleSave() {
    if (!product || !draft) return;

    const errors: Record<string, string> = {};

    if (!draft.name.trim() || draft.name.trim().length < 3) {
      errors.name = "Nome deve ter pelo menos 3 caracteres.";
    }
    if (!draft.slug.trim() || draft.slug.trim().length < 3) {
      errors.slug = "Slug deve ter pelo menos 3 caracteres.";
    }
    if (!draft.sku.trim() || draft.sku.trim().length < 3) {
      errors.sku = "SKU deve ter pelo menos 3 caracteres.";
    }

    let category = draft.category;
    if (category === "nova") {
      if (!newCategory.trim() || newCategory.trim().length < 3) {
        errors.category = "Digite uma nova categoria (min. 3 caracteres).";
      } else {
        category = newCategory.trim();
      }
    } else if (!category) {
      errors.category = "Selecione uma categoria.";
    }

    const price = Number(draft.price);
    if (!draft.price || Number.isNaN(price) || price <= 0) {
      errors.price = "Preco deve ser maior que 0.";
    }

    const stock = Number(draft.stock);
    if (!Number.isFinite(stock) || stock < 0 || Math.floor(stock) !== stock) {
      errors.stock = "Estoque deve ser um inteiro maior ou igual a 0.";
    }

    if (!draft.shortDescription.trim() || draft.shortDescription.trim().length < 10) {
      errors.shortDescription = "Descricao curta deve ter pelo menos 10 caracteres.";
    }
    if (!draft.description.trim() || draft.description.trim().length < 10) {
      errors.description = "Descricao completa deve ter pelo menos 10 caracteres.";
    }

    const pixDiscountPercent = Number(draft.pixDiscountPercent);
    if (
      !Number.isFinite(pixDiscountPercent) ||
      pixDiscountPercent < 0 ||
      pixDiscountPercent > 100 ||
      Math.floor(pixDiscountPercent) !== pixDiscountPercent
    ) {
      errors.pixDiscountPercent = "Use um inteiro entre 0 e 100.";
    }

    const installmentQuantity = Number(draft.installmentQuantity);
    if (
      !Number.isFinite(installmentQuantity) ||
      installmentQuantity < 1 ||
      Math.floor(installmentQuantity) !== installmentQuantity
    ) {
      errors.installmentQuantity = "Parcelas deve ser um inteiro >= 1.";
    }

    const installmentAmount = Number(draft.installmentAmount);
    if (Number.isNaN(installmentAmount) || installmentAmount < 0) {
      errors.installmentAmount = "Valor da parcela invalido.";
    }

    const rating = Number(draft.rating);
    if (Number.isNaN(rating) || rating < 0 || rating > 5) {
      errors.rating = "Nota entre 0 e 5.";
    }

    const reviews = Number(draft.reviews);
    if (!Number.isFinite(reviews) || reviews < 0 || Math.floor(reviews) !== reviews) {
      errors.reviews = "Quantidade de avaliacoes deve ser um inteiro >= 0.";
    }

    if (draft.flashSaleActive) {
      const fp = Number(draft.flashSaleDiscountPercent);
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

    const costTrim = draft.cost.trim();
    if (costTrim) {
      const c = Number(costTrim.replace(",", "."));
      if (Number.isNaN(c) || c < 0) {
        errors.cost = "Custo invalido (use valor >= 0).";
      }
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError("Corrija os campos destacados.");
      return;
    }

    const images = parseCommaSeparatedUniqueImageUrls(draft.images);

    const features = draft.features
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const body: Record<string, unknown> = {
      id: product.id,
      name: draft.name.trim(),
      slug: draft.slug.trim(),
      sku: draft.sku.trim(),
      category,
      price,
      stock,
      shortDescription: draft.shortDescription.trim(),
      description: draft.description.trim(),
      pixDiscountPercent,
      installmentQuantity,
      installmentAmount,
      rating,
      reviews,
      badge: draft.badge.trim(),
      coverImage: draft.coverImage.trim() || null,
      images,
      features,
      tags: draft.tags,
      published: draft.published,
      flashSaleActive: draft.flashSaleActive,
      flashSaleDiscountPercent: draft.flashSaleActive
        ? Number(draft.flashSaleDiscountPercent)
        : null,
    };

    if (draft.originalPrice.trim()) {
      const op = Number(draft.originalPrice);
      if (!Number.isNaN(op) && op > 0) {
        body.originalPrice = op;
      }
    }

    if (costTrim) {
      const c = Number(costTrim.replace(",", "."));
      body.cost = !Number.isNaN(c) && c > 0 ? c : null;
    } else {
      body.cost = null;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => null)) as
        | { product?: Product; error?: string }
        | null;
      if (!res.ok) {
        throw new Error(json?.error || "Nao foi possivel salvar.");
      }
      if (json?.product) {
        onSaved(json.product);
        onClose();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  if (!open || !product || !draft) {
    return null;
  }

  const inputClass =
    "mt-2 w-full rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-sm";
  const err = (key: string) =>
    fieldErrors[key] ? "border-red-500" : "border-[var(--color-line)]";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-edit-modal-title"
    >
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-[var(--color-line)] bg-white p-5 pb-24 shadow-2xl sm:p-6 sm:pb-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)]">
              Editar produto
            </p>
            <h2
              id="product-edit-modal-title"
              className="mt-2 font-display text-xl font-bold text-[var(--color-ink)]"
            >
              {product.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--color-line)] px-3 py-1 text-sm font-semibold text-[var(--color-muted)] hover:bg-[var(--color-surface)]"
          >
            Fechar
          </button>
        </div>

        <p className="mt-4 text-sm text-[var(--color-muted)]">
          Ajuste nome, SKU, precos, textos, capa e galeria (URL ou upload).
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            Nome
            <input
              value={draft.name}
              onChange={(e) => setDraft((d) => (d ? { ...d, name: e.target.value } : d))}
              className={`mt-2 w-full rounded-2xl border bg-[var(--color-surface)] px-3 py-2 text-sm ${err("name")}`}
            />
            {fieldErrors.name ? (
              <span className="mt-1 text-xs text-red-500">{fieldErrors.name}</span>
            ) : null}
          </label>

          <label className="block text-sm">
            Slug
            <input
              value={draft.slug}
              onChange={(e) => setDraft((d) => (d ? { ...d, slug: e.target.value } : d))}
              className={`mt-2 w-full rounded-2xl border bg-[var(--color-surface)] px-3 py-2 text-sm ${err("slug")}`}
            />
            {fieldErrors.slug ? (
              <span className="mt-1 text-xs text-red-500">{fieldErrors.slug}</span>
            ) : null}
          </label>

          <label className="block text-sm">
            SKU
            <input
              value={draft.sku}
              onChange={(e) => setDraft((d) => (d ? { ...d, sku: e.target.value } : d))}
              className={`mt-2 w-full rounded-2xl border bg-[var(--color-surface)] px-3 py-2 text-sm ${err("sku")}`}
            />
            {fieldErrors.sku ? (
              <span className="mt-1 text-xs text-red-500">{fieldErrors.sku}</span>
            ) : null}
          </label>

          <label className="block text-sm sm:col-span-2">
            Categoria
            <select
              value={draft.category}
              onChange={(e) =>
                setDraft((d) => (d ? { ...d, category: e.target.value } : d))
              }
              className={`mt-2 w-full rounded-2xl border bg-[var(--color-surface)] px-3 py-2 text-sm ${err("category")}`}
            >
              <option value="">Selecione</option>
              {categoryOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="nova">Criar nova categoria</option>
            </select>
            {draft.category === "nova" ? (
              <input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Nome da nova categoria"
                className={`mt-2 w-full rounded-2xl border bg-[var(--color-surface)] px-3 py-2 text-sm ${err("category")}`}
              />
            ) : null}
            {fieldErrors.category ? (
              <span className="mt-1 text-xs text-red-500">{fieldErrors.category}</span>
            ) : null}
          </label>

          <label className="block text-sm">
            Preco (R$)
            <input
              type="number"
              min="0"
              step="0.01"
              value={draft.price}
              onChange={(e) => setDraft((d) => (d ? { ...d, price: e.target.value } : d))}
              className={`mt-2 w-full rounded-2xl border bg-[var(--color-surface)] px-3 py-2 text-sm ${err("price")}`}
            />
            {fieldErrors.price ? (
              <span className="mt-1 text-xs text-red-500">{fieldErrors.price}</span>
            ) : null}
          </label>

          <label className="block text-sm">
            Custo / CMV (R$, opcional)
            <input
              type="number"
              min="0"
              step="0.01"
              value={draft.cost}
              onChange={(e) => setDraft((d) => (d ? { ...d, cost: e.target.value } : d))}
              className={`mt-2 w-full rounded-2xl border bg-[var(--color-surface)] px-3 py-2 text-sm ${err("cost")}`}
            />
            <span className="mt-1 block text-xs text-[var(--color-muted)]">
              Usado nos relatorios de lucro (custo unitario de aquisicao).
            </span>
            {fieldErrors.cost ? (
              <span className="mt-1 text-xs text-red-500">{fieldErrors.cost}</span>
            ) : null}
          </label>

          <label className="block text-sm">
            Preco original (R$, opcional)
            <input
              type="number"
              min="0"
              step="0.01"
              value={draft.originalPrice}
              onChange={(e) =>
                setDraft((d) => (d ? { ...d, originalPrice: e.target.value } : d))
              }
              className={inputClass}
            />
          </label>

          <label className="block text-sm">
            Desconto PIX (%)
            <input
              type="number"
              min="0"
              max="100"
              value={draft.pixDiscountPercent}
              onChange={(e) =>
                setDraft((d) => (d ? { ...d, pixDiscountPercent: e.target.value } : d))
              }
              className={`mt-2 w-full rounded-2xl border bg-[var(--color-surface)] px-3 py-2 text-sm ${err("pixDiscountPercent")}`}
            />
            {fieldErrors.pixDiscountPercent ? (
              <span className="mt-1 text-xs text-red-500">
                {fieldErrors.pixDiscountPercent}
              </span>
            ) : null}
          </label>

          <label className="block text-sm">
            Estoque
            <input
              type="number"
              min="0"
              value={draft.stock}
              onChange={(e) => setDraft((d) => (d ? { ...d, stock: e.target.value } : d))}
              className={`mt-2 w-full rounded-2xl border bg-[var(--color-surface)] px-3 py-2 text-sm ${err("stock")}`}
            />
            {fieldErrors.stock ? (
              <span className="mt-1 text-xs text-red-500">{fieldErrors.stock}</span>
            ) : null}
          </label>

          <label className="block text-sm">
            Parcelas (quantidade)
            <input
              type="number"
              min="1"
              value={draft.installmentQuantity}
              onChange={(e) =>
                setDraft((d) =>
                  d ? { ...d, installmentQuantity: e.target.value } : d,
                )
              }
              className={`mt-2 w-full rounded-2xl border bg-[var(--color-surface)] px-3 py-2 text-sm ${err("installmentQuantity")}`}
            />
            {fieldErrors.installmentQuantity ? (
              <span className="mt-1 text-xs text-red-500">
                {fieldErrors.installmentQuantity}
              </span>
            ) : null}
          </label>

          <label className="block text-sm">
            Valor da parcela (R$)
            <input
              type="number"
              min="0"
              step="0.01"
              value={draft.installmentAmount}
              onChange={(e) =>
                setDraft((d) => (d ? { ...d, installmentAmount: e.target.value } : d))
              }
              className={`mt-2 w-full rounded-2xl border bg-[var(--color-surface)] px-3 py-2 text-sm ${err("installmentAmount")}`}
            />
            {fieldErrors.installmentAmount ? (
              <span className="mt-1 text-xs text-red-500">
                {fieldErrors.installmentAmount}
              </span>
            ) : null}
          </label>

          <label className="block text-sm">
            Nota (0–5)
            <input
              type="number"
              min="0"
              max="5"
              step="0.1"
              value={draft.rating}
              onChange={(e) => setDraft((d) => (d ? { ...d, rating: e.target.value } : d))}
              className={`mt-2 w-full rounded-2xl border bg-[var(--color-surface)] px-3 py-2 text-sm ${err("rating")}`}
            />
            {fieldErrors.rating ? (
              <span className="mt-1 text-xs text-red-500">{fieldErrors.rating}</span>
            ) : null}
          </label>

          <label className="block text-sm">
            Avaliacoes (quantidade)
            <input
              type="number"
              min="0"
              value={draft.reviews}
              onChange={(e) =>
                setDraft((d) => (d ? { ...d, reviews: e.target.value } : d))
              }
              className={`mt-2 w-full rounded-2xl border bg-[var(--color-surface)] px-3 py-2 text-sm ${err("reviews")}`}
            />
            {fieldErrors.reviews ? (
              <span className="mt-1 text-xs text-red-500">{fieldErrors.reviews}</span>
            ) : null}
          </label>

          <label className="block text-sm sm:col-span-2">
            Selo / badge (opcional)
            <input
              value={draft.badge}
              onChange={(e) => setDraft((d) => (d ? { ...d, badge: e.target.value } : d))}
              className={inputClass}
            />
          </label>

          <div className="block text-sm sm:col-span-2">
            <span className="font-semibold text-[var(--color-ink)]">Tags</span>
            <div className="mt-2 flex flex-wrap gap-3">
              {TAG_OPTIONS.map(({ value, label }) => (
                <label key={value} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.tags.includes(value)}
                    onChange={() => toggleTag(value)}
                    className="rounded border-[var(--color-line)]"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div className="block rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4 sm:col-span-2">
            <label className="flex cursor-pointer items-start gap-3 text-sm font-semibold text-[var(--color-ink)]">
              <input
                type="checkbox"
                checked={draft.flashSaleActive}
                onChange={(e) =>
                  setDraft((d) =>
                    d
                      ? {
                          ...d,
                          flashSaleActive: e.target.checked,
                          ...(!e.target.checked
                            ? { flashSaleDiscountPercent: "" }
                            : {}),
                        }
                      : d,
                  )
                }
                className="mt-1 rounded border-[var(--color-line)]"
              />
              <span>
                Oferta Relâmpago
                <span className="mt-1 block text-xs font-normal text-[var(--color-muted)]">
                  {!draft.flashSaleActive
                    ? "Desmarcado: o produto deixa de aparecer no carrossel de Oferta Relâmpago."
                    : isFlashSaleActive(product) && product.flashSaleEndsAt
                      ? `Encerra em ${new Date(product.flashSaleEndsAt).toLocaleString("pt-BR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}. Ao salvar outras alterações, o prazo segue o mesmo enquanto estiver válido.`
                      : "Ao salvar, inicia uma nova janela de 24 horas neste produto."}
                </span>
              </span>
            </label>
            {draft.flashSaleActive ? (
              <label className="mt-3 block text-sm">
                <span className="font-semibold text-[var(--color-ink)]">
                  Desconto exibido na oferta (%)
                </span>
                <input
                  type="number"
                  min={1}
                  max={99}
                  step={1}
                  inputMode="numeric"
                  value={draft.flashSaleDiscountPercent}
                  onChange={(e) =>
                    setDraft((d) =>
                      d
                        ? { ...d, flashSaleDiscountPercent: e.target.value }
                        : d,
                    )
                  }
                  className={`mt-2 w-full max-w-[8rem] rounded-2xl border px-3 py-2 text-sm ${
                    fieldErrors.flashSaleDiscountPercent
                      ? "border-red-500"
                      : "border-[var(--color-line)]"
                  } bg-[var(--color-surface)]`}
                  placeholder="ex.: 30"
                />
                {fieldErrors.flashSaleDiscountPercent ? (
                  <span className="mt-1 block text-xs text-red-500">
                    {fieldErrors.flashSaleDiscountPercent}
                  </span>
                ) : (
                  <span className="mt-1 block text-xs text-[var(--color-muted)]">
                    Este valor aparece para o cliente no selo da Oferta Relâmpago (1 a 99%).
                  </span>
                )}
              </label>
            ) : null}
          </div>

          <label className="flex cursor-pointer items-center gap-3 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={draft.published}
              onChange={(e) =>
                setDraft((d) => (d ? { ...d, published: e.target.checked } : d))
              }
              className="rounded border-[var(--color-line)]"
            />
            Produto publicado (visivel na loja)
          </label>

          <div className="block text-sm sm:col-span-2">
            <span className="font-semibold text-[var(--color-ink)]">Imagem de capa (URL)</span>
            <input
              value={draft.coverImage}
              onChange={(e) =>
                setDraft((d) => (d ? { ...d, coverImage: e.target.value } : d))
              }
              className={inputClass}
            />
            <label className="mt-2 inline-flex cursor-pointer rounded-full bg-[var(--color-ink)] px-4 py-2 text-xs font-bold text-white hover:opacity-90">
              Enviar foto de capa
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  try {
                    const url = await uploadProductImageClient(file);
                    setDraft((d) => (d ? { ...d, coverImage: url } : d));
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Falha no upload.");
                  }
                }}
              />
            </label>
          </div>

          <label className="block text-sm sm:col-span-2">
            Galeria (URLs separadas por virgula)
            <input
              value={draft.images}
              onChange={(e) =>
                setDraft((d) => (d ? { ...d, images: e.target.value } : d))
              }
              className={inputClass}
            />
            <label className="mt-2 inline-flex cursor-pointer rounded-full border border-[var(--color-line)] px-4 py-2 text-xs font-bold hover:bg-[var(--color-surface)]">
              Anexar URLs por upload
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={async (e) => {
                  const files = e.target.files;
                  e.target.value = "";
                  if (!files?.length) return;
                  try {
                    const urls: string[] = [];
                    for (const file of Array.from(files)) {
                      urls.push(await uploadProductImageClient(file));
                    }
                    setDraft((d) =>
                      d
                        ? {
                            ...d,
                            images: mergeCommaSeparatedUniqueImageUrls(d.images, urls),
                          }
                        : d,
                    );
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Falha no upload.");
                  }
                }}
              />
            </label>
          </label>

          <label className="block text-sm sm:col-span-2">
            Descricao curta
            <textarea
              value={draft.shortDescription}
              onChange={(e) =>
                setDraft((d) => (d ? { ...d, shortDescription: e.target.value } : d))
              }
              rows={3}
              className={`mt-2 w-full rounded-3xl border bg-[var(--color-surface)] px-3 py-3 text-sm leading-6 ${err("shortDescription")}`}
            />
            {fieldErrors.shortDescription ? (
              <span className="mt-1 text-xs text-red-500">
                {fieldErrors.shortDescription}
              </span>
            ) : null}
          </label>

          <label className="block text-sm sm:col-span-2">
            Descricao completa
            <textarea
              value={draft.description}
              onChange={(e) =>
                setDraft((d) => (d ? { ...d, description: e.target.value } : d))
              }
              rows={4}
              className={`mt-2 w-full rounded-3xl border bg-[var(--color-surface)] px-3 py-3 text-sm leading-6 ${err("description")}`}
            />
            {fieldErrors.description ? (
              <span className="mt-1 text-xs text-red-500">{fieldErrors.description}</span>
            ) : null}
          </label>

          <label className="block text-sm sm:col-span-2">
            Destaques (um por linha)
            <textarea
              value={draft.features}
              onChange={(e) =>
                setDraft((d) => (d ? { ...d, features: e.target.value } : d))
              }
              rows={5}
              className="mt-2 w-full rounded-3xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-3 text-sm leading-6"
            />
          </label>
        </div>

        {error ? (
          <p className="mt-4 text-sm font-semibold text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <div className="fixed inset-x-4 bottom-4 z-[60] flex gap-3 rounded-2xl border border-[var(--color-line)] bg-white/95 p-3 shadow-lg backdrop-blur-sm sm:static sm:mt-6 sm:flex-wrap sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="touch-target-mobile flex-1 rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-bold text-white disabled:opacity-50 sm:flex-none"
          >
            {saving ? "Salvando..." : "Salvar alteracoes"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="touch-target-mobile flex-1 rounded-full border border-[var(--color-line)] px-6 py-3 text-sm font-semibold sm:flex-none"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
