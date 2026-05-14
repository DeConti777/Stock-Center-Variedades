export type HeroMarketingParsed =
  | { kind: "none" }
  | { kind: "youtube"; id: string }
  | { kind: "vimeo"; id: string }
  /** Caminho sem dominio, ex. `/reel/CODE` ou `/p/CODE` (embed oficial). */
  | { kind: "instagram"; embedPath: string }
  | { kind: "direct"; url: string };

const INSTAGRAM_SHORTCODE = /^[A-Za-z0-9_-]+$/;

function instagramFromUrl(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (host !== "instagram.com" && host !== "instagr.am") return null;

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length < 2) return null;

  const [kind, code] = segments;
  if (!code || !INSTAGRAM_SHORTCODE.test(code)) return null;

  if (kind === "reel" || kind === "p" || kind === "tv") {
    return `/${kind}/${code}`;
  }

  return null;
}

function youtubeIdFromUrl(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, "");
  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  }
  if (host === "youtube.com" || host === "m.youtube.com") {
    const path = url.pathname;
    if (path.startsWith("/embed/")) {
      const id = path.split("/")[2];
      return id && /^[\w-]{11}$/.test(id) ? id : null;
    }
    if (path.startsWith("/shorts/")) {
      const id = path.split("/")[2];
      return id && /^[\w-]{11}$/.test(id) ? id : null;
    }
    const v = url.searchParams.get("v");
    return v && /^[\w-]{11}$/.test(v) ? v : null;
  }
  return null;
}

function vimeoIdFromUrl(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, "");
  if (!host.endsWith("vimeo.com")) return null;
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] === "video" && parts[1] && /^\d+$/.test(parts[1])) return parts[1];
  if (parts[0] && /^\d+$/.test(parts[0])) return parts[0];
  return null;
}

export function parseHeroMarketingVideoUrl(
  raw: string | undefined,
): HeroMarketingParsed {
  const trimmed = raw?.trim();
  if (!trimmed) return { kind: "none" };

  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    const pathOnly = trimmed.split(/[?#]/)[0] ?? trimmed;
    if (/\.(mp4|webm|mov)$/i.test(pathOnly)) {
      return { kind: "direct", url: trimmed };
    }
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { kind: "none" };
  }

  const ig = instagramFromUrl(url);
  if (ig) return { kind: "instagram", embedPath: ig };

  const yt = youtubeIdFromUrl(url);
  if (yt) return { kind: "youtube", id: yt };

  const vm = vimeoIdFromUrl(url);
  if (vm) return { kind: "vimeo", id: vm };

  if (url.protocol === "https:" || url.protocol === "http:") {
    return { kind: "direct", url: trimmed };
  }

  return { kind: "none" };
}
