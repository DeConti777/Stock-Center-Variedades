import type { Product } from "@/lib/types";

function normalizeText(value: string) {
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
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost,
      );
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

export function searchProducts(products: Product[], query: string) {
  const normalized = normalizeText(query);

  if (!normalized) {
    return products;
  }

  const queryTokens = tokenize(query);

  return products.filter((product) => {
    const searchableText = [
      product.name,
      product.category,
      product.shortDescription,
      product.description,
    ].join(" ");

    const normalizedProductText = normalizeText(searchableText);
    if (normalizedProductText.includes(normalized)) return true;

    const productTokens = tokenize(searchableText);
    return queryTokens.every((token) => fuzzyTokenMatch(token, productTokens));
  });
}
