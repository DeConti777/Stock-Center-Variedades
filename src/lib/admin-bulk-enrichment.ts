import type { AdminProductCreateInput } from "@/lib/admin-server";

const BRT_CURRENCY = "BRL";

const CATEGORY_KEYWORDS: Array<{ category: string; keywords: string[] }> = [
  { category: "Eletronicos", keywords: ["fone", "bluetooth", "usb", "cabo", "smart", "led"] },
  { category: "Acessorios", keywords: ["bolsa", "carteira", "pulseira", "anel", "cinto"] },
  { category: "Skincare", keywords: ["serum", "creme", "hidratante", "protetor", "pele"] },
  { category: "Organizacao", keywords: ["organizador", "caixa", "gaveta", "suporte", "prateleira"] },
  { category: "Utilidades", keywords: ["cozinha", "garrafa", "copo", "escova", "kit", "multiuso"] },
  { category: "Presentes", keywords: ["presente", "gift", "romantico", "decorativo"] },
];

const DEFAULT_FEATURES = [
  "Acabamento de qualidade.",
  "Produto selecionado para uso diario.",
  "Boa relacao custo-beneficio.",
];

export type EnrichmentSource = {
  provider: string;
  url: string;
};

export type AdminBulkDraft = {
  inputName: string;
  confidence: number;
  warnings: string[];
  sources: EnrichmentSource[];
  payload: AdminProductCreateInput;
};

type ExistingProductIdentity = {
  slug: string;
  sku: string;
};

type PriceInsight = {
  estimatedPrice: number;
  confidence: number;
  sources: EnrichmentSource[];
  warnings: string[];
  imageUrls: string[];
  detectedName?: string;
};

type JsonLdProductData = {
  name?: string;
  prices: number[];
  images: string[];
};

function normalizeSpaces(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function titleCase(value: string): string {
  return normalizeSpaces(value)
    .split(" ")
    .map((chunk) => {
      if (chunk.length <= 2) return chunk.toUpperCase();
      return `${chunk[0]?.toUpperCase() ?? ""}${chunk.slice(1).toLowerCase()}`;
    })
    .join(" ");
}

function slugify(value: string): string {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return normalized || "produto";
}

function ensureUnique(base: string, taken: Set<string>): string {
  if (!taken.has(base)) {
    taken.add(base);
    return base;
  }

  let idx = 2;
  while (taken.has(`${base}-${idx}`)) {
    idx += 1;
  }
  const next = `${base}-${idx}`;
  taken.add(next);
  return next;
}

function buildSkuFromSlug(slug: string, takenSkus: Set<string>): string {
  const alpha = slug.replace(/[^a-z0-9]/g, "").toUpperCase().slice(0, 8) || "PRODUTO";
  let idx = 1;
  let candidate = `${alpha}-${String(idx).padStart(3, "0")}`;
  while (takenSkus.has(candidate)) {
    idx += 1;
    candidate = `${alpha}-${String(idx).padStart(3, "0")}`;
  }
  takenSkus.add(candidate);
  return candidate;
}

function inferCategory(name: string): string {
  const lower = name.toLowerCase();
  const match = CATEGORY_KEYWORDS.find((item) =>
    item.keywords.some((keyword) => lower.includes(keyword)),
  );
  return match?.category ?? "Utilidades";
}

function inferTags(name: string, price: number): string[] {
  const tags: string[] = [];
  const lower = name.toLowerCase();
  if (lower.includes("kit") || lower.includes("combo")) tags.push("promotion");
  if (lower.includes("novo") || lower.includes("lan") || lower.includes("2026")) tags.push("new");
  if (price >= 200) tags.push("featured");
  return Array.from(new Set(tags));
}

function buildShortDescription(name: string, category: string): string {
  return `${name} para ${category.toLowerCase()}, com qualidade e praticidade para o dia a dia.`;
}

function buildDescription(name: string, category: string): string {
  return [
    `${name} e uma escolha versatil para quem busca qualidade, praticidade e bom custo-beneficio.`,
    `Indicado para a categoria de ${category.toLowerCase()}, ele se adapta bem a diferentes rotinas e necessidades.`,
    "Ideal para quem quer comprar com seguranca e ter uma boa experiencia de uso.",
  ].join(" ");
}

function extractPriceCandidates(html: string): number[] {
  const values: number[] = [];
  const numberMatches = html.matchAll(/"price"\s*:\s*"?(\d+(?:[.,]\d{1,2})?)"?/g);
  for (const match of numberMatches) {
    const num = Number(String(match[1]).replace(",", "."));
    if (!Number.isNaN(num) && num > 0) {
      values.push(num);
    }
  }
  return values.filter((value) => value >= 5 && value <= 50000).slice(0, 30);
}

function extractImageCandidates(html: string): string[] {
  const urls = new Set<string>();
  const matches = html.matchAll(/https?:\/\/[^\s"']+\.(?:jpg|jpeg|png|webp)/gi);
  for (const match of matches) {
    const candidate = String(match[0]).replace(/\\\//g, "/");
    if (candidate.includes("http")) {
      urls.add(candidate);
    }
  }
  return Array.from(urls).slice(0, 6);
}

function sanitizeImageUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    const lowerPath = parsed.pathname.toLowerCase();
    if (!/\.(jpg|jpeg|png|webp)$/.test(lowerPath)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function isValidUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function normalizeProductUrl(raw: string): string {
  try {
    const parsed = new URL(raw);
    parsed.hash = "";
    const host = parsed.hostname.toLowerCase();
    if (host.includes("mercadolivre.com.br")) {
      parsed.search = "";
    }
    return parsed.toString();
  } catch {
    return raw;
  }
}

function inferNameFromUrl(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;
    const last = pathname.split("/").filter(Boolean).pop();
    if (!last) return undefined;

    const decoded = decodeURIComponent(last)
      .replace(/[_]+/g, "-")
      .replace(/-?jm$/i, "")
      .replace(/^mlb-\d+-/i, "")
      .replace(/[^a-z0-9-]/gi, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    if (!decoded) return undefined;
    return titleCase(decoded.replace(/-/g, " "));
  } catch {
    return undefined;
  }
}

function extractTitleFromHtml(html: string): string | undefined {
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (ogTitle?.[1]) return normalizeSpaces(ogTitle[1]);
  const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleTag?.[1]) return normalizeSpaces(titleTag[1]);
  return undefined;
}

function extractPriceFromRawText(html: string): number[] {
  const numbers: number[] = [];
  const matches = html.matchAll(/(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d{2})|\d+(?:[.,]\d{1,2}))/g);
  for (const match of matches) {
    const raw = String(match[1]);
    const candidate = raw.includes(",")
      ? raw.replace(/\./g, "").replace(",", ".")
      : raw;
    const value = Number(candidate);
    if (!Number.isNaN(value) && value >= 5 && value <= 50000) {
      numbers.push(value);
    }
  }
  return numbers.slice(0, 40);
}

function toNumberCandidate(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const normalized = value.includes(",")
      ? value.replace(/\./g, "").replace(",", ".")
      : value;
    const num = Number(normalized);
    return Number.isNaN(num) ? null : num;
  }
  return null;
}

function extractJsonLdProducts(html: string): JsonLdProductData {
  const result: JsonLdProductData = { prices: [], images: [] };
  const scripts = html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );

  const pushImage = (value: unknown) => {
    if (typeof value === "string") {
      const sanitized = sanitizeImageUrl(value);
      if (sanitized) result.images.push(sanitized);
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) pushImage(item);
    }
  };

  const parseNode = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const obj = node as Record<string, unknown>;
    const type = String(obj["@type"] ?? "").toLowerCase();
    if (type.includes("product")) {
      if (!result.name && typeof obj.name === "string") {
        result.name = normalizeSpaces(obj.name);
      }
      pushImage(obj.image);
      const offers = obj.offers;
      if (offers && typeof offers === "object") {
        if (Array.isArray(offers)) {
          for (const offer of offers) parseNode(offer);
        } else {
          const offerObj = offers as Record<string, unknown>;
          const price = toNumberCandidate(offerObj.price);
          if (price != null) result.prices.push(price);
          const lowPrice = toNumberCandidate(offerObj.lowPrice);
          if (lowPrice != null) result.prices.push(lowPrice);
        }
      }
    }
  };

  for (const match of scripts) {
    const content = String(match[1] ?? "").trim();
    if (!content) continue;
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        for (const node of parsed) parseNode(node);
      } else {
        parseNode(parsed);
      }
    } catch {
      // ignore invalid json-ld blocks
    }
  }

  result.prices = result.prices.filter((v) => v >= 5 && v <= 50000);
  result.images = Array.from(new Set(result.images));
  return result;
}

async function lookupFromProductUrl(url: string): Promise<PriceInsight> {
  const normalizedUrl = normalizeProductUrl(url);
  const isMercadoLivre = normalizedUrl.includes("mercadolivre.com.br");
  try {
    const response = await fetch(normalizedUrl, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
        "accept-language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const blockedWarning =
        isMercadoLivre && (response.status === 403 || response.status === 429)
          ? "Mercado Livre bloqueou a leitura automatica (anti-bot)."
          : "Nao foi possivel acessar a URL informada.";
      return {
        estimatedPrice: 49.9,
        confidence: 0.2,
        sources: [{ provider: "url", url: normalizedUrl }],
        warnings: [blockedWarning],
        imageUrls: [],
      };
    }

    const html = await response.text();
    const jsonLd = extractJsonLdProducts(html);
    const structuredPrices = extractPriceCandidates(html);
    const rawPrices = extractPriceFromRawText(html);
    const prices = [...jsonLd.prices, ...structuredPrices, ...rawPrices]
      .filter((v) => v >= 5 && v <= 50000)
      .sort((a, b) => a - b);
    const images = [...jsonLd.images, ...extractImageCandidates(html)]
      .map(sanitizeImageUrl)
      .filter((item): item is string => Boolean(item));
    const detectedName = jsonLd.name ?? extractTitleFromHtml(html);

    if (prices.length === 0) {
      const blockedByBody =
        isMercadoLivre &&
        /(captcha|robot|are you human|acesso denegado|verifique que voce e humano)/i.test(
          html,
        );
      return {
        estimatedPrice: 49.9,
        confidence: blockedByBody ? 0.2 : 0.35,
        sources: [{ provider: "url", url: normalizedUrl }],
        warnings: [
          blockedByBody
            ? "Mercado Livre bloqueou a leitura automatica nesta URL."
            : "A URL foi lida, mas sem preco confiavel identificado.",
        ],
        imageUrls: images,
        detectedName,
      };
    }

    const median = prices[Math.floor(prices.length / 2)];
    return {
      estimatedPrice: Math.round(median * 100) / 100,
      confidence: Math.min(0.9, 0.5 + Math.min(prices.length, 20) * 0.015),
      sources: [{ provider: "url", url: normalizedUrl }],
      warnings: [],
      imageUrls: images,
      detectedName,
    };
  } catch {
    return {
      estimatedPrice: 49.9,
      confidence: 0.2,
      sources: [{ provider: "url", url: normalizedUrl }],
      warnings: [
        isMercadoLivre
          ? "Falha de rede ou bloqueio do Mercado Livre ao consultar a URL."
          : "Falha de rede ao consultar a URL informada.",
      ],
      imageUrls: [],
    };
  }
}

async function lookupMarketSnapshot(productName: string): Promise<PriceInsight> {
  const encoded = encodeURIComponent(productName);
  const url = `https://lista.mercadolivre.com.br/${encoded}`;

  try {
    const response = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
        "accept-language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        estimatedPrice: 49.9,
        confidence: 0.25,
        sources: [],
        warnings: ["Nao foi possivel consultar referencia de preco online."],
        imageUrls: [],
      };
    }

    const html = await response.text();
    const prices = extractPriceCandidates(html);
    const images = extractImageCandidates(html)
      .map(sanitizeImageUrl)
      .filter((item): item is string => Boolean(item));

    if (prices.length === 0) {
      return {
        estimatedPrice: 49.9,
        confidence: 0.3,
        sources: [{ provider: "mercadolivre", url }],
        warnings: ["Sem precos consistentes nas fontes pesquisadas."],
        imageUrls: images,
      };
    }

    const sorted = prices.sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const clamped = Math.max(5, Math.min(50000, median));

    return {
      estimatedPrice: Math.round(clamped * 100) / 100,
      confidence: Math.min(0.92, 0.45 + sorted.length * 0.02),
      sources: [{ provider: "mercadolivre", url }],
      warnings: [],
      imageUrls: images,
    };
  } catch {
    return {
      estimatedPrice: 49.9,
      confidence: 0.2,
      sources: [],
      warnings: ["Falha de rede ao pesquisar preco e imagens."],
      imageUrls: [],
    };
  }
}

export async function buildBulkProductDrafts(input: {
  entries: string[];
  existingProducts: ExistingProductIdentity[];
}): Promise<AdminBulkDraft[]> {
  const cleanedEntries = input.entries.map(normalizeSpaces).filter(Boolean);
  const takenSlugs = new Set(input.existingProducts.map((item) => item.slug));
  const takenSkus = new Set(input.existingProducts.map((item) => item.sku));

  const drafts: AdminBulkDraft[] = [];
  for (const rawEntry of cleanedEntries) {
    const fromUrl = isValidUrl(rawEntry);
    const urlInsight = fromUrl ? await lookupFromProductUrl(rawEntry) : null;
    const sourceUrl = urlInsight?.sources?.[0]?.url;
    const inferredFromUrl = fromUrl && sourceUrl ? inferNameFromUrl(sourceUrl) : undefined;
    const baseName =
      urlInsight?.detectedName && urlInsight.detectedName.length >= 3
        ? urlInsight.detectedName
        : inferredFromUrl && inferredFromUrl.length >= 3
          ? inferredFromUrl
          : rawEntry;
    const normalizedName = titleCase(baseName);
    const baseSlug = slugify(normalizedName);
    const slug = ensureUnique(baseSlug, takenSlugs);
    const sku = buildSkuFromSlug(slug, takenSkus);
    const market = fromUrl ? urlInsight ?? (await lookupMarketSnapshot(normalizedName)) : await lookupMarketSnapshot(normalizedName);
    const category = inferCategory(normalizedName);
    const images = Array.from(new Set((market?.imageUrls ?? []).map(sanitizeImageUrl).filter((item): item is string => Boolean(item)))).slice(0, 5);
    const coverImage = images[0];
    const shortDescription = buildShortDescription(normalizedName, category);
    const description = buildDescription(normalizedName, category);
    const estimatedPrice = market?.estimatedPrice ?? 49.9;
    const confidence = Math.round((market?.confidence ?? 0.2) * 100) / 100;
    const tags = inferTags(normalizedName, estimatedPrice);
    const pixDiscountPercent = 5;
    const installmentQuantity = 3;
    const installmentAmount = Math.round((estimatedPrice / installmentQuantity) * 100) / 100;

    const warnings = [...(market?.warnings ?? [])];
    if (fromUrl && !urlInsight?.detectedName) {
      if (inferredFromUrl) {
        warnings.push("Nome inferido pela URL (titulo da pagina indisponivel).");
      } else {
        warnings.push("Nao foi possivel extrair nome na URL; nome veio do texto colado.");
      }
    }
    if (!coverImage) {
      warnings.push("Sem imagem encontrada automaticamente.");
    }
    if (confidence < 0.5) {
      warnings.push("Baixa confianca: revise preco e descricao antes de publicar.");
    }

    drafts.push({
      inputName: rawEntry,
      confidence,
      warnings,
      sources: market?.sources ?? [],
      payload: {
        name: normalizedName,
        slug,
        sku,
        category,
        price: estimatedPrice,
        stock: 0,
        shortDescription,
        description,
        coverImage,
        images,
        features: [...DEFAULT_FEATURES],
        tags,
        pixDiscountPercent,
        installmentQuantity,
        installmentAmount,
        published: false,
      },
    });
  }

  return drafts;
}

export function computeDraftCurrencyLabel(price: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: BRT_CURRENCY,
    minimumFractionDigits: 2,
  }).format(price);
}
