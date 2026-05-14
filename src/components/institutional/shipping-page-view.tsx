import Link from "next/link";

export function ShippingPageView() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8">
      <header className="rounded-[2rem] bg-[var(--color-ink)] px-6 py-10 text-white sm:px-10">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-white/60">
          Logistica
        </p>
        <h1 className="mt-4 font-display text-4xl font-black tracking-tight sm:text-5xl">
          Envio, prazos e cotacao de frete
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-white/75">
          Entenda como preparamos seu pedido, como cotamos o frete no site e onde acompanhar a
          entrega. Para situacoes especificas, nosso time ajuda pelo WhatsApp.
        </p>
      </header>

      <article className="space-y-10 rounded-[2rem] border border-[var(--color-line)] bg-white p-6 sm:p-10">
        <section className="space-y-4">
          <h2 className="font-display text-2xl font-bold text-[var(--color-ink)]">
            Preparacao do pedido
          </h2>
          <p className="text-base leading-8 text-[var(--color-muted)]">
            Apos a confirmacao do pagamento, o pedido entra na fila de separacao e embalagem. Em
            condicoes normais, esse processo leva ate{" "}
            <strong className="text-[var(--color-ink)]">48 horas uteis</strong>, podendo variar em
            campanhas de alto volume, feriados ou quando o produto estiver sujeito a conferencia
            adicional.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-2xl font-bold text-[var(--color-ink)]">
            Cotacao de frete no site
          </h2>
          <p className="text-base leading-8 text-[var(--color-muted)]">
            No carrinho e no checkout informe um CEP valido para ver opcoes de envio e valores. A
            cotacao considera peso, dimensoes e destino. Quando a integracao estiver ativa, as
            opcoes podem incluir transportadoras disponibilizadas via{" "}
            <strong className="text-[var(--color-ink)]">Melhor Envio</strong> (por exemplo Correios,
            Jadlog e outras parceiras), conforme a configuracao da loja naquele momento.
          </p>
          <p className="text-base leading-8 text-[var(--color-muted)]">
            Se o CEP nao retornar cotacao, confira o numero digitado ou fale conosco — pode ser
            restricao temporaria de rota ou CEP fora da area atendida pela transportadora.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-2xl font-bold text-[var(--color-ink)]">
            Prazo de entrega
          </h2>
          <p className="text-base leading-8 text-[var(--color-muted)]">
            O prazo que aparece na cotacao e uma estimativa fornecida pela transportadora (prazo em
            dias uteis ou corridos, conforme exibido na tela). A contagem costuma iniciar apos a
            postagem do pacote, nao no momento em que o pedido e feito.
          </p>
          <p className="text-base leading-8 text-[var(--color-muted)]">
            Eventos fora do nosso controle — como greves, enchentes ou falhas na rede da
            transportadora — podem alterar prazos. Quando houver impacto relevante, comunicamos
            pelos canais cadastrados no pedido.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-2xl font-bold text-[var(--color-ink)]">
            Rastreamento
          </h2>
          <p className="text-base leading-8 text-[var(--color-muted)]">
            Quando o codigo de rastreio estiver disponivel, ele aparece na area{" "}
            <Link href="/conta/pedidos" className="font-semibold text-[var(--color-primary)]">
              Minha conta &gt; Pedidos
            </Link>
            . Tambem enviamos atualizacoes por e-mail conforme o status do pedido evolui.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-2xl font-bold text-[var(--color-ink)]">
            Promocoes de frete
          </h2>
          <p className="text-base leading-8 text-[var(--color-muted)]">
            Quando houver frete promocional (por exemplo para determinada regiao ou valor minimo de
            compra), as regras aparecem no banner do site, no carrinho ou no resumo do checkout. O
            beneficio so vale se as condicoes estiverem atendidas no momento do pagamento.
          </p>
        </section>

        <section className="rounded-[1.25rem] bg-[var(--color-soft)] p-6">
          <h2 className="font-display text-xl font-bold text-[var(--color-ink)]">
            Ainda com duvida?
          </h2>
          <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
            Consulte tambem as{" "}
            <Link href="/perguntas-frequentes" className="font-semibold text-[var(--color-primary)]">
              perguntas frequentes
            </Link>{" "}
            ou a politica de{" "}
            <Link href="/trocas" className="font-semibold text-[var(--color-primary)]">
              trocas e devolucoes
            </Link>
            .
          </p>
        </section>
      </article>
    </div>
  );
}
