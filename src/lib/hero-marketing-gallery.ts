import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

/** Pasta em `public/` onde voce coloca .mp4, .webm ou .mov para o carrossel do hero. */
export const HERO_MARKETING_GALLERY_DIR = "marketing-videos";

const VIDEO_EXT = /\.(mp4|webm|mov)$/i;

export function readHeroMarketingGalleryPaths(): string[] {
  const abs = join(process.cwd(), "public", HERO_MARKETING_GALLERY_DIR);
  if (!existsSync(abs)) return [];
  try {
    return readdirSync(abs)
      .filter((name) => !name.startsWith(".") && VIDEO_EXT.test(name))
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
      .map((name) => `/${HERO_MARKETING_GALLERY_DIR}/${encodeURIComponent(name)}`);
  } catch {
    return [];
  }
}

export function mergeHeroMarketingVideoUrls(
  galleryPaths: string[],
  envUrls: string[],
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of [...galleryPaths, ...envUrls]) {
    const k = u.trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}
