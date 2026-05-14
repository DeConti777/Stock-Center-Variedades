import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/env";
import { getProducts } from "@/lib/catalog-server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getAppUrl().replace(/\/$/, "");
  const lastModified = new Date();

  const staticPaths: MetadataRoute.Sitemap = [
    "",
    "/catalogo",
    "/sobre",
    "/contato",
    "/login",
    "/privacidade",
    "/termos",
    "/trocas",
    "/perguntas-frequentes",
    "/envio",
    "/carrinho",
    "/checkout",
    "/favoritos",
  ].map((path) => ({
    url: `${base}${path || "/"}`,
    lastModified,
    changeFrequency: path === "" ? ("daily" as const) : ("weekly" as const),
    priority: path === "" ? 1 : 0.7,
  }));

  const products = await getProducts();
  const productEntries: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${base}/produto/${p.slug}`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticPaths, ...productEntries];
}
