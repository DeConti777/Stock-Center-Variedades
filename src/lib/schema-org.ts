import { buildProductDisplayImages, isProductMediaUrl } from "@/lib/product-media";
import type { Product } from "@/lib/types";

/** Evita quebra de `</script>` e reduz vetor XSS em JSON-LD. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function normalizeBase(baseUrl: string): string {
  return baseUrl.replace(/\/$/, "");
}

function toAbsoluteMediaUrl(base: string, path: string): string {
  const p = path.trim();
  if (p.startsWith("http://") || p.startsWith("https://")) return p;
  return `${base}${p.startsWith("/") ? "" : "/"}${p}`;
}

export function productAbsoluteImageUrls(product: Product, baseUrl: string): string[] {
  const base = normalizeBase(baseUrl);
  return buildProductDisplayImages(product)
    .filter((src) => isProductMediaUrl(src))
    .map((src) => toAbsoluteMediaUrl(base, src))
    .filter((url) => url.startsWith("http"));
}

export function buildSiteWideGraph(baseUrl: string, sameAs: string[]) {
  const base = normalizeBase(baseUrl);
  const logoUrl = `${base}/stock-center-logo.png`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${base}/#organization`,
        name: "Stock Center Variedades",
        url: base,
        description:
          "Loja online brasileira com utilidades, presentes, eletronicos e organizacao com compra segura e envio rapido.",
        logo: {
          "@type": "ImageObject",
          url: logoUrl,
        },
        contactPoint: [
          {
            "@type": "ContactPoint",
            contactType: "customer service",
            availableLanguage: ["pt-BR"],
            areaServed: "BR",
            url: `${base}/contato`,
          },
        ],
        areaServed: "BR",
        sameAs: sameAs.filter(Boolean),
      },
      {
        "@type": "WebSite",
        "@id": `${base}/#website`,
        url: base,
        name: "Stock Center Variedades",
        inLanguage: "pt-BR",
        publisher: { "@id": `${base}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${base}/catalogo?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
}

export function buildProductPageGraph(baseUrl: string, product: Product) {
  const base = normalizeBase(baseUrl);
  const productUrl = `${base}/produto/${product.slug}`;
  const images = productAbsoluteImageUrls(product, base);

  const productNode: Record<string, unknown> = {
    "@type": "Product",
    "@id": `${productUrl}#product`,
    name: product.name,
    description: product.shortDescription,
    sku: product.sku,
    url: productUrl,
    image: images.length ? images : undefined,
    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: "BRL",
      price: Number(product.price.toFixed(2)),
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };

  if (product.reviews > 0 && product.rating > 0) {
    productNode.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: product.rating,
      reviewCount: product.reviews,
      bestRating: 5,
      worstRating: 1,
    };
  }

  const breadcrumb = {
    "@type": "BreadcrumbList",
    "@id": `${productUrl}#breadcrumb`,
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Inicio",
        item: `${base}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Catalogo",
        item: `${base}/catalogo`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: product.name,
        item: productUrl,
      },
    ],
  };

  return {
    "@context": "https://schema.org",
    "@graph": [productNode, breadcrumb],
  };
}
