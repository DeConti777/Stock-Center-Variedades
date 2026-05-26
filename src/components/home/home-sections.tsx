import Link from "next/link";
import { VisitedProductGrid } from "@/components/store/visited-product-grid";
import { SectionHeading } from "@/components/ui/section-heading";
import { NewsletterForm } from "@/components/forms/newsletter-form";
import {
  BudgetFinderSection,
  CouponClaimBanner,
  RelatedToVisitedSection,
  TopRankedShelf,
} from "@/components/home/home-engagement-sections";
import { HeroMarketingCarousel } from "@/components/home/hero-marketing-carousel";
import { PromoBannerCarousel } from "@/components/home/promo-banner-carousel";
import {
  mergeHeroMarketingVideoUrls,
  readHeroMarketingGalleryPaths,
} from "@/lib/hero-marketing-gallery";
import {
  categories,
  heroMarketingVideoUrlsFromEnv,
  institutionalStats,
  storeHighlights,
  testimonials,
} from "@/lib/site-data";
import type { Product } from "@/lib/types";

function StarRow({ rating }: { rating: number }) {
  const rounded = Math.min(5, Math.max(0, Math.round(rating)));
  return (
    <p
      className="mt-1.5 flex gap-px text-[10px] leading-none text-[var(--color-accent)] sm:mt-2 sm:gap-0.5 sm:text-xs lg:mt-3 lg:gap-0.5 lg:text-lg"
      aria-label={`${rating} de 5 estrelas`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < rounded ? "" : "text-[var(--color-line)]"} aria-hidden>
          ★
        </span>
      ))}
    </p>
  );
}

export function HeroSection() {
  const heroVideoUrls = mergeHeroMarketingVideoUrls(
    readHeroMarketingGalleryPaths(),
    heroMarketingVideoUrlsFromEnv,
  );
  const hasHeroVideo = heroVideoUrls.length > 0;

  return (
    <section className="relative overflow-hidden bg-[var(--color-ink)] text-white">
      <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--color-accent),transparent)]" />
      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(201,151,40,0.18)_0%,transparent_32%,rgba(255,255,255,0.06)_68%,rgba(201,151,40,0.14)_100%)]" />
      <div
        className={`mx-auto grid min-h-[72svh] w-full max-w-7xl items-center gap-8 px-4 py-10 sm:min-h-[calc(100svh-88px)] sm:px-6 sm:py-12 lg:gap-12 lg:px-8 lg:py-16 ${
          hasHeroVideo ? "lg:grid-cols-[1fr_1fr]" : ""
        }`}
      >
        <div className="relative z-10 w-full min-w-0 max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--color-accent)]">
            Stock Center Variedades
          </p>
          <h1 className="mt-4 max-w-full break-words font-display text-3xl font-black leading-[1] tracking-tight sm:mt-6 sm:text-6xl lg:text-7xl">
            Compre com seguranca e receba rapido.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-white/80 sm:mt-6 sm:text-lg sm:leading-8">
            Trabalhamos com{" "}
            <strong className="font-semibold text-white">logística reversa</strong>
            : reaproveitamos devoluções e estoques de parceiros com procedência
            conferida, o que permite preços mais baixos que o varejo tradicional.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/catalogo"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-black text-[var(--color-ink)] shadow-[var(--shadow-gold)] transition-transform duration-200 hover:-translate-y-0.5 hover:bg-white"
            >
              Comprar agora
            </Link>
            <Link
              href="/contato"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[rgba(243,210,107,0.35)] bg-white/5 px-6 py-3 text-sm font-bold text-white transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              Falar com atendimento
            </Link>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-white/80 sm:mt-6 sm:text-sm">
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5">
              Pix com desconto
            </span>
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5">
              Entrega para todo o Brasil
            </span>
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5">
              Suporte em horario comercial
            </span>
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5">
              Logística reversa
            </span>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-10 sm:gap-4 sm:grid-cols-3">
            {storeHighlights.map((highlight) => (
              <div
                key={highlight}
                className="rounded-[1rem] border border-[rgba(243,210,107,0.22)] bg-white/[0.06] px-3 py-3 text-xs font-semibold text-white/85 backdrop-blur-sm transition-colors hover:border-[var(--color-accent)] hover:bg-white/[0.09] sm:px-4 sm:py-4 sm:text-sm"
              >
                {highlight}
              </div>
            ))}
          </div>
        </div>

        {hasHeroVideo ? (
          <div className="relative z-10 hidden w-full min-w-0 justify-center lg:flex lg:justify-end">
            <div className="relative w-full max-w-[min(760px,calc((min(100dvh,100svh)-100px)*9/16))] rounded-[1.5rem] border border-[rgba(243,210,107,0.32)] bg-white/[0.07] p-2 shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-md sm:p-3">
              <div className="relative aspect-[9/16] w-full min-w-[260px] overflow-hidden rounded-[1.15rem] border border-[rgba(243,210,107,0.55)] bg-black shadow-[0_0_55px_rgba(201,151,40,0.24)]">
                <HeroMarketingCarousel urls={heroVideoUrls} />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function PromoBanner() {
  return <PromoBannerCarousel />;
}

export {
  BudgetFinderSection,
  CouponClaimBanner,
  RelatedToVisitedSection,
  TopRankedShelf,
};

export function CategoryShowcase() {
  return (
    <section className="hidden sm:block mx-auto mt-6 w-full max-w-7xl px-4 sm:mt-16 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Categorias principais"
        title="Uma vitrine organizada para quem quer variedade sem perder tempo."
        description="Categorias claras aumentam navegacao, descoberta de produtos e taxa de conversao."
      />
      <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-10 md:grid-cols-2 xl:grid-cols-4">
        {categories.map((category) => (
          <Link
            key={category.name}
            href={`/catalogo?categoria=${encodeURIComponent(category.name)}`}
            className="group rounded-[1.25rem] bg-[linear-gradient(135deg,var(--color-accent),var(--color-primary-strong))] p-[1px] transition-transform duration-200 hover:-translate-y-1"
          >
            <div
              className="relative flex h-full min-h-36 flex-col justify-between overflow-hidden rounded-[calc(1.25rem-1px)] bg-[var(--color-ink)] p-4 text-white sm:min-h-52 sm:p-6"
              style={{
                backgroundImage: `linear-gradient(170deg, rgba(2,6,23,0.2) 0%, rgba(2,6,23,0.88) 62%, rgba(2,6,23,0.96) 100%), url(${category.backgroundImage})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div className="relative">
                <h3 className="font-display text-xl font-bold sm:text-2xl">
                  {category.name}
                </h3>
                <p className="mt-2 text-xs leading-5 text-white/70 sm:mt-3 sm:text-sm sm:leading-6">
                  {category.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function FeaturedProducts({
  eyebrow,
  title,
  description,
  products,
  accent = "light",
  flushTopOnMobile = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  products: Product[];
  accent?: "light" | "dark";
  /** Encosta no bloco anterior no mobile (ex.: apos o carrossel da home). */
  flushTopOnMobile?: boolean;
}) {
  const dark = accent === "dark";

  return (
    <section
      className={`mx-auto w-full max-w-7xl rounded-[1.5rem] px-4 sm:px-6 lg:px-8 ${
        flushTopOnMobile
          ? "mt-0 pb-6 pt-3 sm:mt-18 sm:py-12"
          : "mt-10 py-8 sm:mt-18 sm:py-12"
      } ${
        dark
          ? "bg-[var(--color-ink)] text-white shadow-[0_28px_80px_rgba(0,0,0,0.18)]"
          : ""
      }`}
    >
      <SectionHeading
        eyebrow={eyebrow}
        title={title}
        description={description}
      />
      <VisitedProductGrid products={products} />
    </section>
  );
}

export function BenefitsStrip() {
  const benefits = [
    {
      title: "Entrega rapida",
      description: "Expedicao agil para ganhar confianca e reduzir abandono.",
    },
    {
      title: "Pagamento seguro",
      description: "Pix e cartao com resumo claro e gatilhos de seguranca.",
    },
    {
      title: "Atendimento no WhatsApp",
      description: "Suporte comercial rapido para tirar duvidas e fechar pedido.",
    },
  ];

  return (
    <section className="mx-auto mt-16 grid w-full max-w-7xl grid-cols-1 gap-3 px-4 sm:grid-cols-3 sm:px-6 lg:gap-4 lg:px-8">
      {benefits.map((benefit) => (
        <div
          key={benefit.title}
          className="premium-card rounded-[1rem] p-3 transition-transform duration-200 hover:-translate-y-1 sm:rounded-[1.25rem] sm:p-6"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--color-primary-strong)] sm:text-xs sm:tracking-[0.22em]">
            Beneficio
          </p>
          <h3 className="mt-2 font-display text-base font-bold leading-5 text-[var(--color-ink)] sm:mt-3 sm:text-2xl">
            {benefit.title}
          </h3>
          <p className="mt-2 text-xs leading-4 text-[var(--color-muted)] sm:mt-3 sm:text-sm sm:leading-6">
            {benefit.description}
          </p>
        </div>
      ))}
    </section>
  );
}

export function SocialProof() {
  const totalReviews = testimonials.length;
  const latestReviewDate = testimonials[0]?.reviewedAt;

  return (
    <section className="mx-auto mt-16 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-4 gap-2 rounded-[1.5rem] border border-[var(--color-line)] bg-white p-4 shadow-[var(--shadow-soft)] sm:gap-6 sm:p-8 lg:gap-6">
        {institutionalStats.map((item) => (
          <div key={item.label} className="min-w-0">
            <p className="text-[10px] font-semibold uppercase leading-tight tracking-wide text-[var(--color-muted)] sm:text-sm sm:tracking-[0.22em]">
              {item.label}
            </p>
            <p className="mt-1 font-display text-base font-black leading-tight text-[var(--color-ink)] sm:mt-3 sm:text-4xl sm:leading-none">
              {item.value}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-xs leading-5 text-[var(--color-muted)]">
        Indicadores consolidados da operacao; prazos de entrega na sua regiao aparecem na cotacao de
        frete com seu CEP.
      </p>
      <p className="mt-2 text-center text-xs leading-5 text-[var(--color-muted)]">
        Baseado em {totalReviews} depoimentos exibidos e atualizados em {latestReviewDate}.
      </p>
    </section>
  );
}

export function TestimonialSection() {
  return (
    <section className="mx-auto mt-18 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Quem comprou recomenda"
        title="Depoimentos de clientes sobre entrega, preco e atendimento."
        description="Experiencias reais de quem ja recebeu pedido pela loja."
      />
      <div
        className="mt-10 grid grid-cols-3 gap-1.5 sm:gap-3 lg:gap-5"
        role="region"
        aria-label="Depoimentos de clientes"
      >
        {testimonials.map((testimonial) => (
          <article
            key={testimonial.id}
            className="premium-card flex min-w-0 flex-col rounded-[0.65rem] p-2 sm:rounded-xl sm:p-3 lg:rounded-[1.25rem] lg:p-6"
          >
            <p className="line-clamp-6 text-[10px] font-medium leading-snug text-[var(--color-ink)] sm:line-clamp-none sm:text-xs sm:leading-normal lg:text-lg lg:leading-8">
              &quot;{testimonial.quote}&quot;
            </p>
            <StarRow rating={testimonial.rating} />
            <div className="mt-2 min-w-0 lg:mt-6">
              <p className="truncate text-[10px] font-bold text-[var(--color-ink)] sm:text-xs lg:text-base">
                {testimonial.name}
              </p>
              <p className="truncate text-[9px] text-[var(--color-muted)] sm:text-[11px] lg:text-sm">
                {testimonial.city}
              </p>
              {testimonial.reviewedAt ? (
                <p className="mt-0.5 line-clamp-2 text-[8px] leading-tight text-[var(--color-muted)] sm:line-clamp-none sm:text-[10px] lg:mt-1 lg:text-xs">
                  Compra verificada em {testimonial.reviewedAt}
                </p>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function NewsletterSection() {
  return (
    <section className="mx-auto mt-18 w-full max-w-5xl px-4 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-[1.5rem] border border-[rgba(243,210,107,0.28)] bg-[var(--color-ink)] px-6 py-10 text-white shadow-[0_28px_80px_rgba(0,0,0,0.18)] sm:px-10">
        <SectionHeading
          eyebrow="Newsletter"
          title="Receba promocoes da semana antes de todo mundo."
          description="Cadastre-se para receber alertas de preco, novidades e cupons exclusivos."
        />
        <NewsletterForm source="home" />
      </div>
    </section>
  );
}
