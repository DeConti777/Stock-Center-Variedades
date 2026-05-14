"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { UserRole } from "@/lib/types";

function IconChevronDown(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden {...props}>
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function truncateName(name: string, max = 18) {
  if (name.length <= max) return name;
  return `${name.slice(0, max - 1).trim()}…`;
}

export function UserAccountMenu({
  viewer,
}: {
  viewer: {
    id: string;
    name?: string | null;
    email?: string | null;
    role: UserRole;
    profileImage?: string | null;
  };
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const displayName = viewer.name?.trim() || viewer.email || "Minha conta";
  const shortName = truncateName(viewer.name?.trim() || viewer.email?.split("@")[0] || "Conta", 16);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const linkClass = (href: string, prefix?: string) => {
    const active = prefix ? pathname.startsWith(prefix) : pathname === href;
    return `block rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
      active
        ? "bg-[var(--color-gold-soft)] text-[var(--color-ink)]"
        : "text-[var(--color-ink)] hover:bg-[var(--color-soft)]"
    }`;
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex max-w-[min(100%,14rem)] items-center gap-2 rounded-full border border-[rgba(243,210,107,0.28)] py-1.5 pl-1.5 pr-3 text-left transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <UserAvatar
          profileImage={viewer.profileImage}
          name={viewer.name}
          email={viewer.email}
          size="sm"
          className="bg-white ring-1 ring-black/10"
        />
        <span className="min-w-0 truncate text-sm font-semibold text-[rgba(255,255,255,0.88)]">
          {shortName}
        </span>
        <IconChevronDown
          className={`h-4 w-4 shrink-0 text-[rgba(255,255,255,0.75)] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div
          className="absolute right-0 top-[calc(100%+0.5rem)] z-[100] w-[min(calc(100vw-1.5rem),18.5rem)] rounded-2xl border border-[var(--color-line)] bg-white py-3 shadow-[0_24px_60px_rgba(15,23,42,0.14)]"
          role="menu"
        >
          <div className="absolute -top-2 right-8 h-3 w-3 rotate-45 border-l border-t border-[var(--color-line)] bg-white" />

          <div className="relative px-4 pb-3">
            <div className="flex gap-3">
              <UserAvatar
                profileImage={viewer.profileImage}
                name={viewer.name}
                email={viewer.email}
                size="md"
                className="border border-[var(--color-line)]"
              />
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="font-display text-sm font-bold leading-snug text-[var(--color-ink)]">
                  {truncateName(displayName, 28)}
                </p>
                <Link
                  href="/conta"
                  className="mt-1 inline-flex items-center gap-0.5 text-xs font-bold text-[var(--color-primary)] hover:underline"
                  onClick={() => setOpen(false)}
                >
                  Meu perfil
                  <span aria-hidden className="text-[10px]">
                    ›
                  </span>
                </Link>
              </div>
            </div>

            <Link
              href="/catalogo"
              className="mt-3 flex w-full items-center justify-center rounded-full bg-gradient-to-r from-[#946a19] to-[#c99728] px-3 py-2.5 text-center text-xs font-bold text-white shadow-[var(--shadow-gold)] transition-opacity hover:opacity-95"
              onClick={() => setOpen(false)}
            >
              Stock Center · Ver catalogo completo
              <span className="ml-1" aria-hidden>
                ›
              </span>
            </Link>
          </div>

          <div className="mx-3 border-t border-[var(--color-line)]" />

          <ul className="relative px-2 py-2" aria-label="Area do cliente">
            <li>
              <Link href="/conta/pedidos" className={linkClass("/conta/pedidos", "/conta/pedidos")} role="menuitem" onClick={() => setOpen(false)}>
                Historico de compras
              </Link>
            </li>
            <li>
              <Link href="/conta/opinioes" className={linkClass("/conta/opinioes")} role="menuitem" onClick={() => setOpen(false)}>
                Opinioes e avaliacoes
              </Link>
            </li>
            <li>
              <Link href="/favoritos" className={linkClass("/favoritos")} role="menuitem" onClick={() => setOpen(false)}>
                Favoritos
              </Link>
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  );
}
