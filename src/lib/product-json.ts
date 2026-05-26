export function parseStringArray(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function stringifyStringArray(value: string[] | null | undefined): string {
  return JSON.stringify(value ?? []);
}

/**
 * Removes duplicate image URLs using exact string equality.
 * Preserves the order of first occurrence.
 */
export function dedupeImageUrlsExact(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const url of urls) {
    if (seen.has(url)) {
      continue;
    }
    seen.add(url);
    out.push(url);
  }
  return out;
}

/** Parses comma-separated gallery input; trims segments and drops empties; dedupes exactly. */
export function parseCommaSeparatedUniqueImageUrls(raw: string): string[] {
  const parts = raw
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);
  return dedupeImageUrlsExact(parts);
}

export function commaSeparatedImageUrlsHadDuplicates(raw: string): boolean {
  const parts = raw
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);
  return parts.length !== dedupeImageUrlsExact(parts).length;
}

export function normalizeCommaSeparatedImageUrls(raw: string): string {
  return parseCommaSeparatedUniqueImageUrls(raw).join(", ");
}

/** Appends new URLs to an existing comma-separated field and returns a deduped CSV string. */
export function mergeCommaSeparatedUniqueImageUrls(
  existingCsv: string,
  appendedUrls: string[],
): string {
  const parts = existingCsv
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);
  return dedupeImageUrlsExact([...parts, ...appendedUrls]).join(", ");
}
