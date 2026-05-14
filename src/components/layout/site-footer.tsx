import Image from "next/image";
import Link from "next/link";
import { getStoreLegalLines } from "@/lib/store-public";
import { instagramLink, whatsappLink } from "@/lib/site-data";

export function Footer() {
  const { legalName, cnpj } = getStoreLegalLines();
  const hasLegal = Boolean(legalName || cnpj);

  return (
    <footer className="mt-20 border-t border-[rgba(201,151,40,0.28)] bg-[var(--color-ink)] text-white">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.4fr_repeat(3,1fr)] lg:px-8">
        <div>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-14 w-14 overflow-hidden rounded-full border border-[rgba(243,210,107,0.55)] bg-black">
              <Image
                src="/stock-center-logo.png"
                alt="Logo Stock Center"
                width={56}
                height={56}
                className="h-full w-full object-cover"
              />
            </span>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--color-accent)]">
              Stock Center Variedades
            </p>
          </div>
          <h2 className="mt-5 font-display text-3xl font-bold">
            Tudo o que voce precisa em um so lugar.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-7 text-white/70">
            Loja online com variedade, promocao de verdade, compra segura e
            atendimento humano em todo o Brasil.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
            Navegacao
          </h3>
          <div className="mt-4 flex flex-col gap-3 text-sm text-white/80">
            <Link href="/catalogo">Catalogo</Link>
            <Link href="/favoritos">Favoritos</Link>
            <Link href="/conta">Minha conta</Link>
            <Link href="/checkout">Checkout</Link>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
            Atendimento
          </h3>
          <div className="mt-4 flex flex-col gap-3 text-sm text-white/80">
            <a href={whatsappLink} target="_blank" rel="noreferrer">
              WhatsApp comercial
            </a>
            <a href={instagramLink} target="_blank" rel="noreferrer">
              Instagram oficial
            </a>
            <Link href="/contato">Endereco e formulario</Link>
            <Link href="/sobre">Credibilidade da marca</Link>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
            Informacoes
          </h3>
          <div className="mt-4 flex flex-col gap-3 text-sm text-white/80">
            <Link href="/perguntas-frequentes">Perguntas frequentes</Link>
            <Link href="/envio">Envio e prazos</Link>
            <Link href="/privacidade">Politica de privacidade</Link>
            <Link href="/termos">Termos de uso</Link>
            <Link href="/trocas">Trocas e devolucoes</Link>
            <p className="text-white/60">www.stockcentervariedades.com.br</p>
          </div>
        </div>
      </div>
      <div className="border-t border-[rgba(201,151,40,0.22)]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-5 text-sm text-white/60 sm:px-6 lg:px-8">
          {hasLegal ? (
            <div className="space-y-1 text-white/70">
              {legalName ? <p>{legalName}</p> : null}
              {cnpj ? (
                <p>
                  CNPJ{" "}
                  <span className="font-semibold text-white/85">{cnpj}</span>
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <p>2026 Stock Center Variedades. Todos os direitos reservados.</p>
            <p>Compra segura, atendimento rapido e experiencia mobile first.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
