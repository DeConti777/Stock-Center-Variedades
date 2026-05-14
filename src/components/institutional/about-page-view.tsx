import { institutionalStats } from "@/lib/site-data";

export function AboutPageView() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] bg-[var(--color-ink)] px-5 py-6 text-white sm:rounded-[2.5rem] sm:px-10 sm:py-12">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-white/60">
          Sobre nos
        </p>
        <h1 className="mt-3 max-w-4xl font-display text-3xl font-black tracking-tight sm:mt-4 sm:text-5xl">
          A Stock Center Variedades nasceu para unir variedade, promocao e confianca em um so lugar.
        </h1>
      </section>
      <section className="grid gap-4 lg:grid-cols-[1fr_1fr] lg:gap-6">
        <article className="rounded-[1.6rem] border border-[var(--color-line)] bg-white p-5 sm:rounded-[2rem] sm:p-6">
          <h2 className="font-display text-xl font-bold text-[var(--color-ink)] sm:text-2xl">
            Nossa historia
          </h2>
          <p className="mt-3 text-sm leading-7 text-[var(--color-muted)] sm:mt-4 sm:text-base sm:leading-8">
            Construimos a marca pensando no consumidor brasileiro que quer
            encontrar boas oportunidades sem abrir mao de praticidade, clareza
            e atendimento humano. A proposta e simples: reunir utilidades,
            eletronicos, presentes, organizacao e itens promocionais em uma
            experiencia moderna, limpa e pensada para quem compra online com tranquilidade.
          </p>
        </article>
        <article className="rounded-[1.6rem] border border-[var(--color-line)] bg-white p-5 sm:rounded-[2rem] sm:p-6">
          <h2 className="font-display text-xl font-bold text-[var(--color-ink)] sm:text-2xl">
            Missao e credibilidade
          </h2>
          <p className="mt-3 text-sm leading-7 text-[var(--color-muted)] sm:mt-4 sm:text-base sm:leading-8">
            Nossa missao e entregar preco justo, navegacao simples, pagamento seguro
            e pos-venda em que voce fala com gente de verdade. Queremos que cada
            compra seja clara do inicio ao fim, do carrinho a entrega na sua porta.
          </p>
        </article>
      </section>
      <section className="grid gap-5 lg:grid-cols-4">
        {institutionalStats.map((stat) => (
          <div key={stat.label} className="rounded-[2rem] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
            <p className="text-sm uppercase tracking-[0.22em] text-[var(--color-muted)]">
              {stat.label}
            </p>
            <p className="mt-3 font-display text-4xl font-black text-[var(--color-ink)]">
              {stat.value}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}
