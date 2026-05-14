import { NextResponse } from "next/server";
import { getProducts } from "@/lib/catalog-server";
import { searchProducts } from "@/lib/search";

function normalizeForPrefix(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") || "").trim();

  const products = (await getProducts()).filter(
    (product) => product.stock > 0 && product.published !== false,
  );

  if (!query) {
    const related = products
      .filter((product) => product.tags.includes("featured") || product.tags.includes("bestSeller"))
      .slice(0, 6)
      .map((product) => ({
        id: product.id,
        slug: product.slug,
        name: product.name,
        category: product.category,
      }));

    return NextResponse.json({ suggestions: related });
  }

  const normalizedQuery = normalizeForPrefix(query);
  const startsWithMatches = products.filter((product) =>
    normalizeForPrefix(product.name).startsWith(normalizedQuery),
  );

  const fuzzyMatches = searchProducts(products, query);
  const merged = [...startsWithMatches, ...fuzzyMatches];
  const deduped = Array.from(new Map(merged.map((p) => [p.id, p])).values())
    .slice(0, 8)
    .map((product) => ({
      id: product.id,
      slug: product.slug,
      name: product.name,
      category: product.category,
    }));

  return NextResponse.json({ suggestions: deduped });
}
