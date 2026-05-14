import type { Metadata } from "next";
import Link from "next/link";
import { MobileHomeShelf } from "@/components/home/mobile-home-shelf";
import {
  BenefitsStrip,
  BudgetFinderSection,
  CouponClaimBanner,
  CategoryShowcase,
  FeaturedProducts,
  HeroSection,
  NewsletterSection,
  PromoBanner,
  RelatedToVisitedSection,
  SocialProof,
  TestimonialSection,
  TopRankedShelf,
} from "@/components/home/home-sections";
import { getProducts } from "@/lib/catalog-server";

export const metadata: Metadata = {
  title: "Stock Center Variedades",
};

export default async function HomePage() {
  const allProducts = await getProducts();
  const featuredProducts = allProducts.filter((p) => p.tags.includes("featured"));
  const bestSellers = allProducts.filter((p) => p.tags.includes("bestSeller"));
  const promoProducts = allProducts.filter((p) => p.tags.includes("promotion"));

  return (
    <div>
      <PromoBanner />
      <div className="sm:hidden">
        <MobileHomeShelf
          products={allProducts}
          featuredProducts={featuredProducts}
        />
      </div>
      <div className="hidden sm:block">
        <HeroSection />
      </div>
      <CategoryShowcase />
      <FeaturedProducts
        eyebrow="Produtos em destaque"
        title="Ofertas imperdiveis para renovar a casa, presentear e economizar."
        description="Selecao forte em utilidades, beleza, organizacao e eletronicos com preco baixo de verdade."
        products={featuredProducts}
      />
      <BenefitsStrip />
      <FeaturedProducts
        eyebrow="Mais vendidos"
        title="Quem compra volta porque encontra variedade, preco e praticidade."
        description="Itens campeoes de venda com giro alto e excelente percepcao de valor."
        products={bestSellers}
        accent="dark"
      />
      <SocialProof />
      <TopRankedShelf products={bestSellers} />
      <BudgetFinderSection products={allProducts} />
      <FeaturedProducts
        eyebrow="Promocoes da semana"
        title="Aproveite as oportunidades que puxam conversao no varejo online."
        description="Produtos com desconto, gatilho de urgencia e vantagens para pagamento no Pix."
        products={promoProducts}
      />
      <TestimonialSection />
      <RelatedToVisitedSection products={allProducts} />
      <section className="mx-auto mt-16 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-5 rounded-[1.25rem] border border-[var(--color-line)] bg-white p-5 shadow-[var(--shadow-soft)] sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
          <article>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-primary)]">
              Compra segura
            </p>
            <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">
              CNPJ e operacao transparente
            </p>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Loja com dados legais exibidos no rodape e politicas claras.
            </p>
          </article>
          <article>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-primary)]">
              Trocas e devolucoes
            </p>
            <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">
              Processo simples e sem surpresa
            </p>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Consulte regras em{" "}
              <Link href="/trocas" className="font-semibold text-[var(--color-primary)]">
                Trocas e devolucoes
              </Link>
              .
            </p>
          </article>
          <article>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-primary)]">
              Envio e prazos
            </p>
            <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">
              Preparacao rapida de pedidos
            </p>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Expedicao em ate 48h e prazo por CEP na cotacao de frete.
            </p>
          </article>
          <article>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-primary)]">
              Atendimento humano
            </p>
            <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">
              WhatsApp em horario comercial
            </p>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Duvias antes da compra? Nosso time ajuda voce a escolher.
            </p>
          </article>
        </div>
      </section>
      <CouponClaimBanner />
      <NewsletterSection />
      <section className="mx-auto mt-16 flex w-full max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--color-primary)]">
            Tudo o que voce precisa em um so lugar
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold text-[var(--color-ink)] sm:text-4xl">
            Compre com confianca: catalogo completo e suporte humano.
          </h2>
          <p className="mt-3 text-base leading-7 text-[var(--color-muted)]">
            Explore o catalogo, tire duvidas nas{" "}
            <Link href="/perguntas-frequentes" className="font-semibold text-[var(--color-primary)]">
              perguntas frequentes
            </Link>
            , veja{" "}
            <Link href="/envio" className="font-semibold text-[var(--color-primary)]">
              envio e prazos
            </Link>{" "}
            ou fale no WhatsApp para atendimento rapido.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/catalogo"
            className="inline-flex items-center justify-center rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-bold text-white transition-transform duration-200 hover:-translate-y-0.5"
          >
            Ver catalogo completo
          </Link>
          <Link
            href="/contato"
            className="inline-flex items-center justify-center rounded-full border border-[var(--color-line)] bg-white px-6 py-3 text-sm font-bold text-[var(--color-ink)]"
          >
            Pedir atendimento
          </Link>
        </div>
      </section>
    </div>
  );
}
