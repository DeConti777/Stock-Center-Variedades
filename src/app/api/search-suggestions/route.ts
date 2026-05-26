import { NextResponse } from "next/server";
import { getProducts } from "@/lib/catalog-server";
import { groupProductsByCategory, searchAndRankProducts } from "@/lib/search";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") || "").trim();

  const products = (await getProducts()).filter(
    (product) => product.stock > 0 && product.published !== false,
  );

  if (!query) {
    const related = products
      .filter(
        (product) =>
          product.tags.includes("featured") || product.tags.includes("bestSeller"),
      )
      .slice(0, 6)
      .map((product) => ({
        id: product.id,
        slug: product.slug,
        name: product.name,
        category: product.category,
      }));

    return NextResponse.json({
      query: "",
      suggestions: related,
      categories: [],
    });
  }

  const ranked = searchAndRankProducts(products, query);
  const categories = groupProductsByCategory(ranked).slice(0, 2);

  return NextResponse.json({
    query,
    suggestions: ranked.slice(0, 6).map((product) => ({
      id: product.id,
      slug: product.slug,
      name: product.name,
      category: product.category,
    })),
    categories,
  });
}
