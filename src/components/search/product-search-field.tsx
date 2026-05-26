"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { normalizeText } from "@/lib/search";

type SearchSuggestion = {
  id: string;
  slug: string;
  name: string;
  category: string;
};

type CategorySuggestion = {
  name: string;
  count: number;
};

type SuggestionsResponse = {
  query?: string;
  suggestions?: SearchSuggestion[];
  categories?: CategorySuggestion[];
};

type ProductSearchFieldProps = {
  variant: "header" | "catalog";
  defaultQuery?: string;
  onQueryChange?: (query: string) => void;
  onSubmit?: (query: string) => void;
  inputId?: string;
  className?: string;
};

type DropdownItem =
  | { type: "product"; suggestion: SearchSuggestion }
  | { type: "category"; category: CategorySuggestion }
  | { type: "viewAll"; query: string };

function highlightMatch(text: string, query: string) {
  const tokens = normalizeText(query).split(" ").filter(Boolean);
  if (!tokens.length) return text;

  const normalizedText = normalizeText(text);
  let bestStart = -1;
  let bestLen = 0;

  for (const token of tokens) {
    const index = normalizedText.indexOf(token);
    if (index >= 0 && (bestStart < 0 || index < bestStart)) {
      bestStart = index;
      bestLen = token.length;
    }
  }

  if (bestStart < 0) return text;

  const before = text.slice(0, bestStart);
  const match = text.slice(bestStart, bestStart + bestLen);
  const after = text.slice(bestStart + bestLen);
  return (
    <>
      {before}
      <mark className="rounded bg-[var(--color-accent)]/35 px-0.5 text-inherit">{match}</mark>
      {after}
    </>
  );
}

export function ProductSearchField({
  variant,
  defaultQuery = "",
  onQueryChange,
  onSubmit,
  inputId,
  className = "",
}: ProductSearchFieldProps) {
  const router = useRouter();
  const generatedId = useId();
  const resolvedInputId = inputId ?? `product-search-${generatedId.replace(/:/g, "")}`;
  const [query, setQuery] = useState(defaultQuery);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [categories, setCategories] = useState<CategorySuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(defaultQuery);
  }, [defaultQuery]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/search-suggestions?q=${encodeURIComponent(query.trim())}`,
          { signal: controller.signal },
        );
        if (!res.ok) {
          setSuggestions([]);
          setCategories([]);
          return;
        }
        const data = (await res.json()) as SuggestionsResponse;
        setSuggestions(data.suggestions ?? []);
        setCategories(data.categories ?? []);
      } catch {
        if (!controller.signal.aborted) {
          setSuggestions([]);
          setCategories([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const dropdownItems = useMemo<DropdownItem[]>(() => {
    const items: DropdownItem[] = suggestions.map((suggestion) => ({
      type: "product",
      suggestion,
    }));
    for (const category of categories) {
      items.push({ type: "category", category });
    }
    const trimmed = query.trim();
    if (trimmed) {
      items.push({ type: "viewAll", query: trimmed });
    }
    return items;
  }, [categories, query, suggestions]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [dropdownItems.length, query]);

  const submitSearch = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      setShowDropdown(false);
      if (onSubmit) {
        onSubmit(trimmed);
        return;
      }
      router.push(trimmed ? `/catalogo?q=${encodeURIComponent(trimmed)}` : "/catalogo");
    },
    [onSubmit, router],
  );

  const navigateToItem = useCallback(
    (item: DropdownItem) => {
      setShowDropdown(false);
      if (item.type === "product") {
        router.push(`/produto/${item.suggestion.slug}`);
        setQuery(item.suggestion.name);
        onQueryChange?.(item.suggestion.name);
        return;
      }
      if (item.type === "category") {
        const params = new URLSearchParams();
        params.set("categoria", item.category.name);
        if (query.trim()) params.set("q", query.trim());
        router.push(`/catalogo?${params.toString()}`);
        return;
      }
      submitSearch(item.query);
    },
    [onQueryChange, query, router, submitSearch],
  );

  const isHeader = variant === "header";

  const inputClassName = isHeader
    ? "h-11 w-full rounded-full border border-[rgba(243,210,107,0.35)] bg-white/10 px-4 text-sm font-medium text-white placeholder:text-white/65 outline-none focus:border-[var(--color-accent)]"
    : "w-full rounded-2xl border border-[var(--color-line)] px-4 py-3 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]";

  const dropdownClassName = isHeader
    ? "absolute left-0 right-0 top-[calc(100%+0.35rem)] z-50 overflow-hidden rounded-2xl border border-[rgba(243,210,107,0.35)] bg-[var(--color-ink)]/98 shadow-[0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur-md"
    : "absolute left-0 right-0 top-[calc(100%+0.35rem)] z-50 overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white shadow-[0_18px_50px_rgba(15,23,42,0.12)]";

  return (
    <div ref={containerRef} className={`relative min-w-0 ${className}`}>
      <form
        className="relative min-w-0"
        onSubmit={(event) => {
          event.preventDefault();
          if (activeIndex >= 0 && dropdownItems[activeIndex]) {
            navigateToItem(dropdownItems[activeIndex]!);
            return;
          }
          submitSearch(query);
        }}
      >
        <label className="sr-only" htmlFor={resolvedInputId}>
          Buscar produtos
        </label>
        <input
          id={resolvedInputId}
          type="search"
          value={query}
          onChange={(event) => {
            const value = event.target.value;
            setQuery(value);
            onQueryChange?.(value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => {
            window.setTimeout(() => setShowDropdown(false), 140);
          }}
          onKeyDown={(event) => {
            if (!showDropdown || !dropdownItems.length) return;
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveIndex((current) =>
                current >= dropdownItems.length - 1 ? 0 : current + 1,
              );
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((current) =>
                current <= 0 ? dropdownItems.length - 1 : current - 1,
              );
            } else if (event.key === "Escape") {
              setShowDropdown(false);
              setActiveIndex(-1);
            }
          }}
          placeholder={isHeader ? "Buscar produtos..." : "Busque por produto, categoria ou descricao"}
          className={inputClassName}
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={`${resolvedInputId}-listbox`}
          aria-autocomplete="list"
        />
        {showDropdown ? (
          <div
            id={`${resolvedInputId}-listbox`}
            role="listbox"
            className={dropdownClassName}
          >
            {loading ? (
              <p
                className={`px-4 py-3 text-xs font-medium ${
                  isHeader ? "text-white/70" : "text-[var(--color-muted)]"
                }`}
              >
                Buscando...
              </p>
            ) : dropdownItems.length ? (
              <ul className="max-h-72 overflow-y-auto">
                {dropdownItems.map((item, index) => {
                  const active = index === activeIndex;
                  const rowClass = `block w-full border-b px-4 py-3 text-left last:border-b-0 ${
                    isHeader ? "border-white/10" : "border-[var(--color-line)]"
                  } ${
                    active
                      ? isHeader
                        ? "bg-white/10"
                        : "bg-[var(--color-soft)]"
                      : ""
                  }`;

                  if (item.type === "product") {
                    return (
                      <li key={`product-${item.suggestion.id}`} role="option" aria-selected={active}>
                        <Link
                          href={`/produto/${item.suggestion.slug}`}
                          onClick={() => {
                            setShowDropdown(false);
                            setQuery(item.suggestion.name);
                            onQueryChange?.(item.suggestion.name);
                          }}
                          className={rowClass}
                        >
                          <p
                            className={`truncate text-sm font-bold ${
                              isHeader ? "text-white" : "text-[var(--color-ink)]"
                            }`}
                          >
                            {highlightMatch(item.suggestion.name, query)}
                          </p>
                          <p className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-[var(--color-accent)]">
                            {item.suggestion.category}
                          </p>
                        </Link>
                      </li>
                    );
                  }

                  if (item.type === "category") {
                    const params = new URLSearchParams();
                    params.set("categoria", item.category.name);
                    if (query.trim()) params.set("q", query.trim());
                    return (
                      <li key={`category-${item.category.name}`} role="option" aria-selected={active}>
                        <Link href={`/catalogo?${params.toString()}`} className={rowClass}>
                          <p
                            className={`text-sm font-semibold ${
                              isHeader ? "text-white" : "text-[var(--color-ink)]"
                            }`}
                          >
                            Categoria: {item.category.name}
                          </p>
                          <p
                            className={`mt-0.5 text-xs ${
                              isHeader ? "text-white/65" : "text-[var(--color-muted)]"
                            }`}
                          >
                            {item.category.count}{" "}
                            {item.category.count === 1
                              ? "produto encontrado"
                              : "produtos encontrados"}
                          </p>
                        </Link>
                      </li>
                    );
                  }

                  return (
                    <li key="view-all" role="option" aria-selected={active}>
                      <button type="button" onClick={() => submitSearch(item.query)} className={rowClass}>
                        <p
                          className={`text-sm font-bold ${
                            isHeader ? "text-[var(--color-accent)]" : "text-[var(--color-primary)]"
                          }`}
                        >
                          Ver todos os resultados para &ldquo;{item.query}&rdquo;
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p
                className={`px-4 py-3 text-xs font-medium ${
                  isHeader ? "text-white/70" : "text-[var(--color-muted)]"
                }`}
              >
                Nenhum produto relacionado encontrado.
              </p>
            )}
          </div>
        ) : null}
      </form>
    </div>
  );
}
