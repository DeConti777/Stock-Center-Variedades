"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AccountControls } from "@/components/layout/account-controls";
import { ProductSearchField } from "@/components/search/product-search-field";
import { useStore } from "@/components/store/store-provider";
import { CartLink } from "@/components/ui/store-buttons";
import type { UserRole } from "@/lib/types";

const navLinks = [
  { href: "/", label: "Inicio" },
  { href: "/catalogo", label: "Catalogo" },
  { href: "/sobre", label: "Sobre nos" },
  { href: "/contato", label: "Contato" },
  { href: "/perguntas-frequentes", label: "Duvidas" },
];

const mobileAjudaLinks = [
  { href: "/perguntas-frequentes", label: "Perguntas frequentes" },
  { href: "/envio", label: "Envio e prazos" },
  { href: "/trocas", label: "Trocas e devolucoes" },
  { href: "/termos", label: "Termos de uso" },
  { href: "/privacidade", label: "Privacidade" },
];

function IconMenu(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  );
}

function IconCart(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden {...props}>
      <path d="M6 6h15l-1.5 9H7.5L6 6zm0 0L5 3H2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="20" r="1" fill="currentColor" stroke="none" />
      <circle cx="18" cy="20" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconClose(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden {...props}>
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

export function Header({
  viewer,
}: {
  viewer:
    | {
        id: string;
        name?: string | null;
        email?: string | null;
        role: UserRole;
        profileImage?: string | null;
      }
    | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { cartCount } = useStore();

  const handleSearchSubmit = (query: string) => {
    router.push(query ? `/catalogo?q=${encodeURIComponent(query)}` : "/catalogo");
  };

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileMenuOpen]);

  const mobileNavLinkClass = (active: boolean) =>
    `block rounded-xl px-4 py-3 text-base font-semibold ${
      active
        ? "bg-[var(--color-accent)] text-[var(--color-ink)]"
        : "bg-[var(--color-soft)] text-[var(--color-ink)]"
    }`;

  const contaResumoAtivo =
    pathname === "/conta" ||
    pathname.startsWith("/conta/informacoes") ||
    pathname.startsWith("/conta/enderecos") ||
    pathname.startsWith("/conta/pedidos") ||
    pathname.startsWith("/conta/opinioes") ||
    pathname.startsWith("/login");

  const mobileDrawer =
    mobileMenuOpen && typeof document !== "undefined" ? (
      <div
        className="fixed inset-0 z-[200] flex justify-end lg:hidden"
        id="mobile-nav-drawer"
        role="presentation"
      >
        <button
          type="button"
          className="absolute inset-0 bg-black/45"
          aria-label="Fechar menu"
          onClick={() => setMobileMenuOpen(false)}
        />
        <div
          className="relative flex h-[100dvh] max-h-[100dvh] min-h-0 w-[min(100%,20rem)] flex-col bg-white shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-line)] px-4 py-3">
            <span className="font-display text-sm font-bold text-[var(--color-ink)]">Conta e atalhos</span>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--color-ink)] hover:bg-[var(--color-soft)]"
              aria-label="Fechar"
            >
              <IconClose className="h-5 w-5" />
            </button>
          </div>
          <nav
            className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-y-contain p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] touch-pan-y"
            aria-label="Menu principal"
          >
            <div
              className={`mb-2 shrink-0 rounded-2xl border px-4 py-3 ${
                contaResumoAtivo
                  ? "border-[var(--color-accent)]/50 bg-[var(--color-gold-soft)]"
                  : "border-[var(--color-line)] bg-[var(--color-soft)]"
              }`}
            >
              {viewer ? (
                <>
                  <p className="text-xs font-medium text-[var(--color-muted)]">Logado como</p>
                  <p className="mt-0.5 truncate text-sm font-bold text-[var(--color-ink)]">
                    {viewer.name?.trim() || viewer.email || "Cliente"}
                  </p>
                  <div className="mt-3 flex flex-col gap-2">
                    <Link
                      href="/conta"
                      className={mobileNavLinkClass(
                        pathname === "/conta" ||
                          pathname.startsWith("/conta/informacoes") ||
                          pathname.startsWith("/conta/enderecos"),
                      )}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Minha conta
                    </Link>
                    <Link
                      href="/conta/pedidos"
                      className={mobileNavLinkClass(pathname.startsWith("/conta/pedidos"))}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Meus pedidos
                    </Link>
                    <Link
                      href="/conta/opinioes"
                      className={mobileNavLinkClass(pathname.startsWith("/conta/opinioes"))}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Opinioes
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-[var(--color-ink)]">
                    Acesse pedidos e dados salvos
                  </p>
                  <Link
                    href="/login?next=/conta"
                    className={`mt-3 ${mobileNavLinkClass(pathname.startsWith("/login"))}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Entrar
                  </Link>
                </>
              )}
            </div>

            <p className="shrink-0 px-1 pt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]">
              Compras
            </p>
            <Link
              href="/carrinho"
              className={`shrink-0 ${mobileNavLinkClass(pathname === "/carrinho")}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="flex items-center justify-between gap-2">
                Carrinho
                {cartCount > 0 ? (
                  <span className="rounded-full bg-[var(--color-accent)] px-2 py-0.5 text-xs font-black text-[var(--color-ink)]">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                ) : null}
              </span>
            </Link>
            <Link
              href="/favoritos"
              className={`shrink-0 ${mobileNavLinkClass(pathname === "/favoritos")}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Favoritos
            </Link>
            <Link
              href="/catalogo"
              className={`shrink-0 ${mobileNavLinkClass(pathname === "/catalogo")}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Catalogo
            </Link>

            <p className="mt-3 shrink-0 px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]">
              Navegacao
            </p>
            {navLinks
              .filter((link) => link.href !== "/catalogo")
              .map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`shrink-0 ${mobileNavLinkClass(pathname === link.href)}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}

            <p className="mt-3 shrink-0 px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]">
              Ajuda e politicas
            </p>
            {mobileAjudaLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`shrink-0 ${mobileNavLinkClass(pathname === link.href)}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}

            {viewer?.role === "ADMIN" ? (
              <>
                <p className="mt-3 shrink-0 px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                  Loja
                </p>
                <Link
                  href="/admin"
                  className={`shrink-0 ${mobileNavLinkClass(pathname === "/admin")}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Painel admin
                </Link>
              </>
            ) : null}

            {viewer ? (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  void signOut({ callbackUrl: "/" });
                }}
                className="mt-4 shrink-0 rounded-xl border border-[var(--color-line)] bg-white px-4 py-3 text-center text-base font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-soft)]"
              >
                Sair da conta
              </button>
            ) : null}
          </nav>
        </div>
      </div>
    ) : null;

  return (
    <>
      <header className="sticky top-0 z-50" data-site-header>
      <div className="hidden border-b border-[rgba(201,151,40,0.28)] bg-[var(--color-ink)]/96 shadow-[0_18px_50px_rgba(0,0,0,0.18)] backdrop-blur-md lg:block">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="min-w-0 shrink-0">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[rgba(243,210,107,0.72)] bg-black shadow-[0_0_28px_rgba(201,151,40,0.28)]">
                <Image
                  src="/stock-center-logo.png"
                  alt="Logo Stock Center"
                  width={56}
                  height={56}
                  className="h-full w-full translate-y-[5%] object-cover"
                  priority
                />
              </span>
              <div className="min-w-0">
                <p className="whitespace-nowrap font-display text-lg font-bold text-white sm:text-xl">
                  Stock Center Variedades
                </p>
                <p className="whitespace-nowrap text-xs uppercase tracking-[0.24em] text-[var(--color-accent)]">
                  Compra simples, segura e premium
                </p>
              </div>
            </div>
          </Link>

          <div className="hidden shrink-0 items-center gap-4 lg:flex lg:gap-6">
            <nav className="flex items-center gap-6">
              {viewer?.role === "ADMIN" ? (
                <Link
                  href="/admin"
                  className={`text-sm font-semibold transition-colors ${
                    pathname === "/admin"
                      ? "text-[var(--color-accent)]"
                      : "text-[rgba(255,255,255,0.78)] hover:text-[var(--color-accent)]"
                  }`}
                >
                  Admin
                </Link>
              ) : null}
              {navLinks.map((link) => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`whitespace-nowrap text-sm font-semibold transition-colors ${
                      active
                        ? "text-[var(--color-accent)]"
                        : "text-[rgba(255,255,255,0.78)] hover:text-[var(--color-accent)]"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <CartLink />

            <AccountControls viewer={viewer} />
          </div>
        </div>
      </div>

      <div className="border-b border-[rgba(201,151,40,0.28)] bg-[var(--color-ink)]/96 shadow-[0_18px_50px_rgba(0,0,0,0.18)] backdrop-blur-md lg:hidden">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-2.5 px-4 py-3 sm:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[rgba(243,210,107,0.72)] bg-black shadow-[0_0_20px_rgba(201,151,40,0.22)]">
              <Image
                src="/stock-center-logo.png"
                alt="Logo Stock Center"
                width={44}
                height={44}
                className="h-full w-full translate-y-[5%] object-cover"
                priority
              />
            </span>
          </Link>
          <ProductSearchField
            variant="header"
            className="min-w-0 flex-1"
            onSubmit={handleSearchSubmit}
            inputId="mobile-header-search"
          />

          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 text-white hover:border-[var(--color-accent)]/50 hover:text-[var(--color-accent)]"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-drawer"
            aria-label="Abrir menu"
          >
            <IconMenu className="h-5 w-5" />
          </button>

          <Link
            href="/carrinho"
            className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 text-white hover:border-[var(--color-accent)]/50 hover:text-[var(--color-accent)]"
            aria-label="Carrinho"
          >
            <IconCart className="h-5 w-5" />
            {cartCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--color-accent)] px-1 text-[10px] font-black text-[var(--color-ink)]">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            ) : null}
          </Link>
        </div>
      </div>
    </header>
      {mobileDrawer ? createPortal(mobileDrawer, document.body) : null}
    </>
  );
}
