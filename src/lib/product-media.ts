import type { Product } from "@/lib/types";

/** Valores que devem ser exibidos como imagem (URL, caminho local ou data URL). */
export function isProductMediaUrl(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  const lower = v.toLowerCase();
  return (
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.startsWith("/") ||
    lower.startsWith("data:image/")
  );
}

export function getProductHeroSrc(product: {
  coverImage?: string;
  images: string[];
}): string | null {
  if (product.coverImage && isProductMediaUrl(product.coverImage)) {
    return product.coverImage.trim();
  }
  const first = product.images[0];
  if (first && isProductMediaUrl(first)) {
    return first.trim();
  }
  return null;
}

/** Lista de slides do produto (URLs reais ou cores placeholder), mesma ordem usada na PDP. */
export function buildProductDisplayImages(product: Product): string[] {
  const imgs = [...product.images];
  const c = product.coverImage?.trim();
  if (c && isProductMediaUrl(c) && !imgs.includes(c)) {
    return [c, ...imgs];
  }
  return imgs.length ? imgs : c ? [c] : [];
}
