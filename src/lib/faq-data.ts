export type FaqItem = {
  id: string;
  question: string;
  /** Paragrafos separados por linha em branco (renderizados no site). */
  answer: string;
};

export const faqItems: FaqItem[] = [
  {
    id: "logistica-reversa",
    question: "O que é logistica reversa?",
    answer:
      "É o fluxo que devolve produtos ao estoque após devolução, troca ou remessa de parceiros. Na Stock Center, conferimos procedência e condição antes de revender.\n\nCom isso, conseguimos oferecer variedade com preços mais baixos que o varejo tradicional, sempre com descrição clara do item.",
  },
  {
    id: "pagamento",
    question: "Quais formas de pagamento aceitam?",
    answer:
      "Aceitamos Pix (com desconto quando indicado no produto) e cartao de credito em ate 10x sem juros nos produtos elegiveis.\n\nO pagamento e processado de forma segura; no checkout voce ve o valor final com todas as condicoes aplicaveis.",
  },
  {
    id: "pix-desconto",
    question: "Como funciona o desconto no Pix?",
    answer:
      "Quando o produto oferece desconto para Pix, o valor com desconto aparece na pagina do produto e no carrinho. Apos confirmar o pedido, siga as instrucoes de pagamento exibidas na tela.\n\nO desconto so vale para o metodo Pix quando essa condicao estiver ativa no item.",
  },
  {
    id: "prazo-envio",
    question: "Em quanto tempo o pedido e enviado?",
    answer:
      "A preparacao (separacao e embalagem) costuma ocorrer em ate 48 horas uteis apos a confirmacao do pagamento, salvo feriados ou campanhas com prazo divulgado na home.\n\nO prazo de entrega na sua regiao depende do transportador e da modalidade escolhida no checkout.",
  },
  {
    id: "frete-calculo",
    question: "Como o frete e calculado?",
    answer:
      "No carrinho ou checkout informe seu CEP para cotar opcoes de envio disponiveis. O valor considera peso, dimensoes e destino conforme a transportadora.\n\nPromocoes de frete, quando existirem, aparecem destacadas no site ou no resumo do pedido.",
  },
  {
    id: "rastreio",
    question: "Como rastreio meu pedido?",
    answer:
      "Apos o despacho, quando houver codigo de rastreio disponivel, ele aparece na area Minha conta > Pedidos.\n\nTambem enviamos atualizacoes por e-mail conforme o status do pedido muda.",
  },
  {
    id: "entrega-endereco",
    question: "Entregam em todo o Brasil?",
    answer:
      "Atendemos envios para a maior parte do territorio nacional conforme a cobertura das transportadoras integradas ao checkout.\n\nSe seu CEP nao tiver cotacao, fale conosco pelo WhatsApp ou formulario de contato para ver alternativas.",
  },
  {
    id: "trocas",
    question: "Posso trocar ou devolver um produto?",
    answer:
      "Sim, seguimos a legislacao aplicavel ao e-commerce e consumidor. Os prazos e condicoes detalhadas estao na pagina Trocas e devolucoes.\n\nEm caso de defeito ou divergencia na entrega, abra um chamado pelo canal de atendimento indicado na mesma pagina.",
  },
  {
    id: "arrependimento",
    question: "Tenho direito de arrependimento?",
    answer:
      "Para compras pela internet, quando aplicavel, o consumidor pode exercer o direito de arrependimento dentro do prazo legal, conforme descrito na politica de trocas e devolucoes.\n\nProdutos devem estar sem uso, com embalagem e acessorios originais quando couber.",
  },
  {
    id: "cupom",
    question: "Como uso um cupom de desconto?",
    answer:
      "No carrinho ou checkout ha campo para informar o codigo do cupom. Apos validar, o desconto aparece no resumo antes do pagamento.\n\nCupons podem ter data de validade, valor minimo de compra ou categorias elegiveis — a mensagem de erro explica quando algo nao se aplica.",
  },
  {
    id: "conta",
    question: "Preciso criar conta para comprar?",
    answer:
      "O fluxo de checkout pode exigir identificacao para emissao de pedido, rastreio e notificacoes. Criar conta permite salvar endereco, ver historico e favoritos.\n\nSe tiver duvidas no cadastro, fale com o suporte pelo WhatsApp.",
  },
  {
    id: "seguranca",
    question: "Meus dados estao seguros?",
    answer:
      "Tratamos dados pessoais conforme a LGPD. Detalhes sobre coleta, uso e direitos estao na Politica de privacidade.\n\nUsamos conexao segura (HTTPS) e boas praticas para proteger informacoes de pagamento junto aos provedores integrados.",
  },
  {
    id: "atendimento",
    question: "Como falo com a loja?",
    answer:
      "O canal mais rapido e o WhatsApp comercial (link no site e no rodape). Tambem ha formulario na pagina Contato e Instagram oficial para novidades.\n\nHorarios de atendimento estao descritos na pagina de contato.",
  },
];

function answerAsPlainText(answer: string): string {
  return answer.replace(/\s+/g, " ").trim();
}

export function buildFaqPageJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: answerAsPlainText(item.answer),
      },
    })),
  };
}
