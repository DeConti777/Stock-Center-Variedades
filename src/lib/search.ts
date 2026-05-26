import type { Product, ProductTag } from "@/lib/types";

const TAG_LABELS: Record<ProductTag, string> = {
  featured: "destaque",
  bestSeller: "mais vendido",
  promotion: "promocao",
  new: "novo",
};

export function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string) {
  return normalizeText(value).split(" ").filter(Boolean);
}

function editDistance(a: string, b: string) {
  if (a === b) return 0;
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;

  const prev = new Array(bl + 1);
  const curr = new Array(bl + 1);

  for (let j = 0; j <= bl; j += 1) prev[j] = j;

  for (let i = 1; i <= al; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= bl; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= bl; j += 1) prev[j] = curr[j];
  }

  return prev[bl];
}

function fuzzyTokenMatch(queryToken: string, productTokens: string[]) {
  if (queryToken.length <= 2) {
    return productTokens.some((token) => token.startsWith(queryToken));
  }

  return productTokens.some((token) => {
    if (token.includes(queryToken) || queryToken.includes(token)) return true;
    const distance = editDistance(queryToken, token);
    const maxDistance = queryToken.length >= 7 ? 2 : 1;
    return distance <= maxDistance;
  });
}

export function buildSearchableText(product: Product) {
  const tagLabels = product.tags.map((tag) => TAG_LABELS[tag]).join(" ");
  return [
    product.name,
    product.category,
    product.sku,
    product.shortDescription,
    product.description,
    product.badge ?? "",
    ...product.features,
    tagLabels,
  ]
    .filter(Boolean)
    .join(" ");
}

function scoreTokenInField(token: string, fieldTokens: string[], weights: { exact: number; prefix: number; includes: number; fuzzy: number }) {
  if (fieldTokens.some((t) => t === token)) return weights.exact;
  if (fieldTokens.some((t) => t.startsWith(token))) return weights.prefix;
  if (fieldTokens.some((t) => t.includes(token))) return weights.includes;
  if (fuzzyTokenMatch(token, fieldTokens)) return weights.fuzzy;
  return 0;
}

function skuMatchesQuery(sku: string, query: string, normalizedQuery: string) {
  const skuLower = sku.toLowerCase();
  const queryLower = query.toLowerCase().trim();
  if (queryLower && skuLower.includes(queryLower)) return true;
  const compactSku = normalizeText(sku).replace(/\s/g, "");
  const compactQuery = normalizedQuery.replace(/\s/g, "");
  return Boolean(compactQuery && compactSku.includes(compactQuery));
}

export function scoreProduct(product: Product, query: string) {
  const normalized = normalizeText(query);
  if (!normalized) return 0;

  const queryTokens = tokenize(query);
  const nameNorm = normalizeText(product.name);
  const categoryNorm = normalizeText(product.category);
  const skuNorm = normalizeText(product.sku);
  const fullNorm = normalizeText(buildSearchableText(product));
  const nameTokens = tokenize(product.name);
  const categoryTokens = tokenize(product.category);
  const skuTokens = tokenize(product.sku);
  const featureTokens = tokenize(
    [product.shortDescription, product.description, product.badge ?? "", ...product.features].join(" "),
  );
  const fuzzyTokens = [...nameTokens, ...categoryTokens, ...skuTokens];

  let score = 0;

  if (nameNorm === normalized) {
    score += 140;
  } else if (nameNorm.includes(normalized)) {
    score += 90;
  } else if (fullNorm.includes(normalized)) {
    score += 45;
  }

  if (nameNorm.startsWith(normalized)) {
    score += 55;
  }

  if (skuMatchesQuery(product.sku, query, normalized)) {
    score += skuNorm === normalized ? 70 : 45;
  }

  if (categoryNorm === normalized || categoryNorm.includes(normalized)) {
    score += categoryNorm === normalized ? 50 : 28;
  }

  for (const token of queryTokens) {
    const nameScore = scoreTokenInField(token, nameTokens, {
      exact: 35,
      prefix: 28,
      includes: 18,
      fuzzy: 12,
    });
    const categoryScore = scoreTokenInField(token, categoryTokens, {
      exact: 22,
      prefix: 18,
      includes: 14,
      fuzzy: 8,
    });
    const skuScore = scoreTokenInField(token, skuTokens, {
      exact: 30,
      prefix: 24,
      includes: 20,
      fuzzy: 0,
    });
    const featureScore = scoreTokenInField(token, featureTokens, {
      exact: 12,
      prefix: 10,
      includes: 8,
      fuzzy: 0,
    });
    const fuzzyScore = fuzzyTokenMatch(token, fuzzyTokens) ? 10 : 0;
    const tokenScore = Math.max(nameScore, categoryScore, skuScore, featureScore, fuzzyScore);

    if (tokenScore === 0) {
      return 0;
    }

    score += tokenScore;
  }

  return score;
}

export function searchAndRankProducts(products: Product[], query: string) {
  const normalized = normalizeText(query);
  if (!normalized) {
    return products;
  }

  return products
    .map((product) => ({ product, score: scoreProduct(product, query) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.product.reviews !== a.product.reviews) {
        return b.product.reviews - a.product.reviews;
      }
      return a.product.name.localeCompare(b.product.name, "pt-BR");
    })
    .map((entry) => entry.product);
}

export function searchProducts(products: Product[], query: string) {
  return searchAndRankProducts(products, query);
}

export function groupProductsByCategory(products: Product[]) {
  const counts = new Map<string, number>();
  for (const product of products) {
    counts.set(product.category, (counts.get(product.category) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}
