export type LegalDocumentKind = "privacy" | "terms" | "returns";

const meta: Record<
  LegalDocumentKind,
  { eyebrow: string; title: string; lead: string }
> = {
  privacy: {
    eyebrow: "Privacidade e LGPD",
    title: "Politica de privacidade e tratamento de dados",
    lead: "Como coletamos, usamos e protegemos seus dados nesta loja online.",
  },
  terms: {
    eyebrow: "Termos de uso",
    title: "Condicoes gerais de uso do site",
    lead: "Regras para navegacao, cadastro, compras e relacionamento com a loja.",
  },
  returns: {
    eyebrow: "Trocas e devolucoes",
    title: "Politica de trocas, arrependimento e garantia",
    lead: "Prazos, condicoes e canais para solicitar troca ou devolucao conforme o CDC.",
  },
};

function PrivacyBody() {
  return (
    <>
      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold text-[var(--color-ink)]">
          1. Responsavel pelo tratamento
        </h2>
        <p className="text-base leading-8 text-[var(--color-muted)]">
          A Stock Center Variedades e responsavel pelo tratamento dos dados pessoais
          coletados por este site, em conformidade com a Lei nº 13.709/2018 (LGPD).
        </p>
      </section>
      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold text-[var(--color-ink)]">
          2. Dados que podemos coletar
        </h2>
        <p className="text-base leading-8 text-[var(--color-muted)]">
          Podemos tratar identificacao e contato (nome, e-mail, telefone, CPF quando
          necessario para a compra), dados de entrega, historico de pedidos, dados de
          navegacao (cookies e identificadores tecnicos) e comunicacoes com o suporte.
        </p>
      </section>
      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold text-[var(--color-ink)]">
          3. Finalidades
        </h2>
        <p className="text-base leading-8 text-[var(--color-muted)]">
          Os dados sao utilizados para criar e manter sua conta, processar pagamentos e
          entregas, prevenir fraudes, enviar comunicacoes sobre pedidos, cumprir
          obrigacoes legais e, quando permitido, enviar ofertas e novidades.
        </p>
      </section>
      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold text-[var(--color-ink)]">
          4. Seus direitos
        </h2>
        <p className="text-base leading-8 text-[var(--color-muted)]">
          Voce pode solicitar confirmacao de tratamento, acesso, correcao, anonimizacao,
          portabilidade, eliminacao de dados desnecessarios, informacao sobre
          compartilhamentos e revogacao de consentimento, quando aplicavel, entrando em
          contato pelos canais oficiais da loja.
        </p>
      </section>
      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold text-[var(--color-ink)]">
          5. Retencao e seguranca
        </h2>
        <p className="text-base leading-8 text-[var(--color-muted)]">
          Mantemos os dados pelo tempo necessario para as finalidades descritas e
          obrigacoes legais, adotando medidas tecnicas e administrativas razoaveis para
          protege-los. Revise este texto periodicamente; atualizacoes serao publicadas
          nesta pagina.
        </p>
      </section>
    </>
  );
}

function TermsBody() {
  return (
    <>
      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold text-[var(--color-ink)]">
          1. Aceitacao
        </h2>
        <p className="text-base leading-8 text-[var(--color-muted)]">
          Ao acessar ou usar o site, voce declara que leu e concorda com estes termos.
          Se nao concordar, interrompa o uso imediatamente.
        </p>
      </section>
      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold text-[var(--color-ink)]">
          2. Cadastro e conta
        </h2>
        <p className="text-base leading-8 text-[var(--color-muted)]">
          Voce se compromete a fornecer informacoes verdadeiras e manter seus dados de
          acesso em sigilo. E responsavel por atividades realizadas na sua conta ate que
          notifique a loja sobre uso indevido.
        </p>
      </section>
      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold text-[var(--color-ink)]">
          3. Produtos, precos e disponibilidade
        </h2>
        <p className="text-base leading-8 text-[var(--color-muted)]">
          Esforcamo-nos para exibir informacoes corretas. Erros de digitacao, imagens
          ilustrativas ou indisponibilidade momentanea podem ocorrer; nesses casos
          informaremos e corrigiremos ou cancelaremos o pedido com reembolso quando
          aplicavel.
        </p>
      </section>
      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold text-[var(--color-ink)]">
          4. Pagamento e contrato
        </h2>
        <p className="text-base leading-8 text-[var(--color-muted)]">
          O contrato de compra e venda considera-se firmado apos confirmacao do pedido e
          aprovacao do pagamento conforme regras do meio de pagamento escolhido.
        </p>
      </section>
      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold text-[var(--color-ink)]">
          5. Limitacao de responsabilidade
        </h2>
        <p className="text-base leading-8 text-[var(--color-muted)]">
          Na medida permitida pela lei aplicavel, a loja nao se responsabiliza por danos
          indiretos ou lucros cessantes; a responsabilidade limita-se ao valor pago na
          compra relacionada, salvo disposicao legal em contrario.
        </p>
      </section>
    </>
  );
}

function ReturnsBody() {
  return (
    <>
      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold text-[var(--color-ink)]">
          1. Direito de arrependimento (compras online)
        </h2>
        <p className="text-base leading-8 text-[var(--color-muted)]">
          Nos termos do Codigo de Defesa do Consumidor, para compras realizadas fora do
          estabelecimento comercial, voce pode desistir em ate 7 dias corridos a partir
          do recebimento do produto, desde que o item esteja sem uso, com etiquetas e
          embalagem originais quando couber.
        </p>
      </section>
      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold text-[var(--color-ink)]">
          2. Defeito e garantia legal
        </h2>
        <p className="text-base leading-8 text-[var(--color-muted)]">
          Em caso de vicio ou defeito, aplicam-se as garantias legais. Entre em contato
          com o suporte informando numero do pedido e evidencias (fotos ou videos) para
          analise e instrucoes de devolucao ou troca.
        </p>
      </section>
      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold text-[var(--color-ink)]">
          3. Como solicitar
        </h2>
        <p className="text-base leading-8 text-[var(--color-muted)]">
          Utilize o formulario de contato do site, o e-mail cadastrado na conta ou o
          WhatsApp oficial informado no rodape. Responderemos no menor prazo possivel
          com o protocolo e os proximos passos.
        </p>
      </section>
      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold text-[var(--color-ink)]">
          4. Reembolso
        </h2>
        <p className="text-base leading-8 text-[var(--color-muted)]">
          Apos aprovacao da devolucao e recebimento do produto em nosso centro logico,
          o reembolso sera processado pelo mesmo meio de pagamento utilizado na compra,
          nos prazos praticados pelo banco ou operadora, salvo combinacao diversa.
        </p>
      </section>
    </>
  );
}

export function LegalDocumentView({ kind }: { kind: LegalDocumentKind }) {
  const m = meta[kind];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <header className="rounded-[2rem] bg-[var(--color-ink)] px-5 py-7 text-white sm:rounded-[2.5rem] sm:px-10 sm:py-12">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-white/60">
          {m.eyebrow}
        </p>
        <h1 className="mt-4 max-w-4xl font-display text-4xl font-black tracking-tight sm:text-5xl">
          {m.title}
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-8 text-white/75">{m.lead}</p>
      </header>
      <article className="max-w-3xl space-y-10 rounded-[2rem] border border-[var(--color-line)] bg-white p-8 sm:p-10">
        {kind === "privacy" ? <PrivacyBody /> : null}
        {kind === "terms" ? <TermsBody /> : null}
        {kind === "returns" ? <ReturnsBody /> : null}
        <p className="border-t border-[var(--color-line)] pt-8 text-sm text-[var(--color-muted)]">
          Texto modelo para operacao inicial. Ajuste CNPJ, prazos operacionais e canais
          com seu juridico antes de publicar em producao.
        </p>
      </article>
    </div>
  );
}
