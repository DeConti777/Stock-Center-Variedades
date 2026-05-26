/**
 * Gera apresentacao profissional Stock Center 2.0
 * Uso: npm run presentation:build
 */
import pptxgen from "pptxgenjs";
import { mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "docs", "apresentacao-compradores");
const outFile = join(outDir, "apresentacao-stock-center.pptx");

mkdirSync(outDir, { recursive: true });

/** Paleta alinhada a src/app/globals.css */
const BRAND = {
  ink: "050505",
  primary: "946A19",
  primaryStrong: "5F420F",
  accent: "F3D26B",
  soft: "F7F2E8",
  surface: "FFFFFF",
  muted: "6F6A5F",
  line: "E4DED0",
  success: "137A45",
  goldSoft: "FFF4C7",
};

const FONT_TITLE = "Calibri Light";
const FONT_BODY = "Calibri";
const TOTAL_SLIDES = 22;

const MEDIO_RECEITA_12M = [
  5500, 6490, 7480, 8470, 9460, 10450, 11550, 12540, 13530, 14520, 15510, 16500,
];
const MEDIO_LUCRO_12M = [
  2061, 2433, 2805, 3176, 3548, 3919, 4217, 4589, 4960, 5332, 5704, 6075,
];

function addFooter(slide, page) {
  slide.addShape("rect", {
    x: 0,
    y: 5.35,
    w: "100%",
    h: 0.08,
    fill: { color: BRAND.primary },
  });
  slide.addText("STOCK CENTER VARIEDADES", {
    x: 0.55,
    y: 5.42,
    w: 5,
    h: 0.25,
    fontSize: 8,
    color: BRAND.muted,
    fontFace: FONT_BODY,
    bold: true,
    charSpacing: 1.2,
  });
  slide.addText(`${page} / ${TOTAL_SLIDES}`, {
    x: 8.85,
    y: 5.42,
    w: 0.9,
    h: 0.25,
    fontSize: 9,
    color: BRAND.muted,
    fontFace: FONT_BODY,
    align: "right",
  });
}

function addContentBackground(slide) {
  slide.background = { color: BRAND.soft };
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: 0.14,
    h: "100%",
    fill: { color: BRAND.primary },
  });
}

function addContentHeader(slide, title, subtitle) {
  slide.addText(title, {
    x: 0.55,
    y: 0.45,
    w: 8.9,
    h: 0.65,
    fontSize: 26,
    bold: true,
    color: BRAND.ink,
    fontFace: FONT_TITLE,
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.55,
      y: 1.05,
      w: 8.9,
      h: 0.35,
      fontSize: 12,
      color: BRAND.muted,
      fontFace: FONT_BODY,
    });
  }
  slide.addShape("rect", {
    x: 0.55,
    y: subtitle ? 1.42 : 1.12,
    w: 8.9,
    h: 0.02,
    fill: { color: BRAND.line },
  });
}

function addCoverSlide(pres) {
  const slide = pres.addSlide();
  slide.background = { color: BRAND.ink };

  slide.addShape("rect", {
    x: 6.2,
    y: -0.5,
    w: 4.5,
    h: 4.5,
    fill: { color: BRAND.primary },
    rotate: 18,
  });
  slide.addShape("rect", {
    x: 7.4,
    y: 3.8,
    w: 3.2,
    h: 3.2,
    fill: { color: BRAND.accent },
    rotate: -12,
  });
  slide.addShape("rect", {
    x: 0,
    y: 5.15,
    w: "100%",
    h: 0.12,
    fill: { color: BRAND.accent },
  });

  slide.addText("STOCK CENTER", {
    x: 0.7,
    y: 0.85,
    w: 8,
    h: 0.4,
    fontSize: 14,
    color: BRAND.accent,
    fontFace: FONT_BODY,
    bold: true,
    charSpacing: 4,
  });

  slide.addText("Variedades 2.0", {
    x: 0.65,
    y: 1.35,
    w: 8.5,
    h: 1.1,
    fontSize: 44,
    bold: true,
    color: BRAND.surface,
    fontFace: FONT_TITLE,
  });

  slide.addText("Loja online profissional para o canal digital da loja física", {
    x: 0.7,
    y: 2.55,
    w: 7.5,
    h: 0.7,
    fontSize: 18,
    color: BRAND.accent,
    fontFace: FONT_BODY,
  });

  const chips = [
    "E-commerce completo",
    "Pix e cartão integrados",
    "Painel com relatório de lucro",
  ];
  chips.forEach((label, i) => {
    const x = 0.7 + i * 3.05;
    slide.addShape("roundRect", {
      x,
      y: 3.55,
      w: 2.85,
      h: 0.55,
      fill: { color: BRAND.primaryStrong },
      rectRadius: 0.08,
    });
    slide.addText(label, {
      x: x + 0.12,
      y: 3.68,
      w: 2.6,
      h: 0.35,
      fontSize: 11,
      color: BRAND.accent,
      fontFace: FONT_BODY,
      align: "center",
    });
  });

  slide.addText("Apresentação para compradores · 2026", {
    x: 0.7,
    y: 5.25,
    w: 5,
    h: 0.3,
    fontSize: 10,
    color: BRAND.muted,
    fontFace: FONT_BODY,
  });
}

function addSectionSlide(pres, num, title, subtitle) {
  const slide = pres.addSlide();
  slide.background = { color: BRAND.surface };

  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: 4.2,
    h: "100%",
    fill: { color: BRAND.primaryStrong },
  });
  slide.addShape("rect", {
    x: 3.5,
    y: 0,
    w: 0.35,
    h: "100%",
    fill: { color: BRAND.accent },
  });

  slide.addText(num, {
    x: 0.5,
    y: 1.6,
    w: 3.2,
    h: 1.4,
    fontSize: 72,
    bold: true,
    color: BRAND.accent,
    fontFace: FONT_TITLE,
  });

  slide.addText(title, {
    x: 4.55,
    y: 2.1,
    w: 5.2,
    h: 1.2,
    fontSize: 32,
    bold: true,
    color: BRAND.ink,
    fontFace: FONT_TITLE,
  });

  if (subtitle) {
    slide.addText(subtitle, {
      x: 4.55,
      y: 3.35,
      w: 5,
      h: 0.6,
      fontSize: 14,
      color: BRAND.muted,
      fontFace: FONT_BODY,
    });
  }
}

function addContentSlide(pres, page, title, bullets, subtitle) {
  const slide = pres.addSlide();
  addContentBackground(slide);
  addContentHeader(slide, title, subtitle);

  const startY = subtitle ? 1.55 : 1.25;
  const bulletText = bullets.map((b) => ({
    text: b,
    options: {
      bullet: { code: "2022", color: BRAND.primary },
      paraSpaceAfter: 8,
    },
  }));

  slide.addText(bulletText, {
    x: 0.55,
    y: startY,
    w: 8.85,
    h: 3.65,
    fontSize: 15,
    color: BRAND.ink,
    fontFace: FONT_BODY,
    valign: "top",
    lineSpacingMultiple: 1.12,
  });

  addFooter(slide, page);
}

function addInvestmentKpiSlide(pres, page) {
  const slide = pres.addSlide();
  addContentBackground(slide);
  addContentHeader(
    slide,
    "Investimento inicial (único)",
    "Software já desenvolvido — foco em colocar no ar",
  );

  const cards = [
    { label: "Domínio .com.br", value: "R$ 40", note: "1º ano" },
    { label: "Stripe · Resend · Neon", value: "R$ 0", note: "abertura" },
    { label: "CMV + fotos", value: "Interno", note: "operacional" },
    { label: "Total mínimo", value: "R$ 40", note: "estimado", highlight: true },
  ];

  const cardW = 2.15;
  const gap = 0.2;
  const startX = 0.55;

  cards.forEach((card, i) => {
    const x = startX + i * (cardW + gap);
    const fill = card.highlight ? BRAND.primaryStrong : BRAND.surface;
    const textColor = card.highlight ? BRAND.accent : BRAND.ink;
    const labelColor = card.highlight ? BRAND.goldSoft : BRAND.muted;

    slide.addShape("roundRect", {
      x,
      y: 1.75,
      w: cardW,
      h: 2.35,
      fill: { color: fill },
      line: { color: BRAND.line, width: card.highlight ? 0 : 1 },
      rectRadius: 0.06,
      shadow: card.highlight
        ? { type: "outer", blur: 8, offset: 2, angle: 90, opacity: 0.15 }
        : undefined,
    });
    slide.addText(card.label, {
      x: x + 0.15,
      y: 1.95,
      w: cardW - 0.3,
      h: 0.45,
      fontSize: 11,
      color: labelColor,
      fontFace: FONT_BODY,
      bold: true,
    });
    slide.addText(card.value, {
      x: x + 0.15,
      y: 2.55,
      w: cardW - 0.3,
      h: 0.75,
      fontSize: card.highlight ? 28 : 24,
      bold: true,
      color: textColor,
      fontFace: FONT_TITLE,
    });
    slide.addText(card.note, {
      x: x + 0.15,
      y: 3.35,
      w: cardW - 0.3,
      h: 0.35,
      fontSize: 10,
      color: card.highlight ? BRAND.accent : BRAND.muted,
      fontFace: FONT_BODY,
    });
  });

  slide.addText("Marketing pago não incluído · impostos via contador", {
    x: 0.55,
    y: 4.35,
    w: 8.9,
    h: 0.35,
    fontSize: 11,
    italic: true,
    color: BRAND.muted,
    fontFace: FONT_BODY,
  });

  addFooter(slide, page);
}

function addScenarioTableSlide(pres, page) {
  const slide = pres.addSlide();
  addContentBackground(slide);
  addContentHeader(
    slide,
    "Premissas — três cenários (12 meses)",
    "Estimativas transparentes para planejamento",
  );

  const headerOpts = {
    fill: { color: BRAND.primaryStrong },
    color: BRAND.accent,
    bold: true,
    fontSize: 11,
    fontFace: FONT_BODY,
    align: "center",
    valign: "middle",
  };
  const cellOpts = {
    fill: { color: BRAND.surface },
    color: BRAND.ink,
    fontSize: 11,
    fontFace: FONT_BODY,
    align: "center",
    valign: "middle",
  };
  const altCellOpts = { ...cellOpts, fill: { color: BRAND.goldSoft } };

  const rows = [
    [
      { text: "Premissa", options: headerOpts },
      { text: "Conservador", options: headerOpts },
      { text: "Médio", options: headerOpts },
      { text: "Otimista", options: headerOpts },
    ],
    [
      { text: "Pedidos/mês (M1 → M12)", options: cellOpts },
      { text: "25 → 60", options: cellOpts },
      { text: "50 → 150", options: altCellOpts },
      { text: "80 → 300", options: cellOpts },
    ],
    [
      { text: "Ticket médio", options: cellOpts },
      { text: "R$ 95", options: cellOpts },
      { text: "R$ 110", options: altCellOpts },
      { text: "R$ 125", options: cellOpts },
    ],
    [
      { text: "Mix Pix / cartão", options: cellOpts },
      { text: "70% / 30%", options: cellOpts },
      { text: "60% / 40%", options: altCellOpts },
      { text: "55% / 45%", options: cellOpts },
    ],
    [
      { text: "Margem bruta mercadoria", options: cellOpts },
      { text: "35%", options: cellOpts },
      { text: "40%", options: altCellOpts },
      { text: "42%", options: cellOpts },
    ],
  ];

  slide.addTable(rows, {
    x: 0.55,
    y: 1.65,
    w: 8.9,
    colW: [2.4, 2.15, 2.15, 2.2],
    rowH: 0.55,
    border: { type: "solid", color: BRAND.line, pt: 1 },
  });

  addFooter(slide, page);
}

function addProjectionChartSlide(pres, page) {
  const slide = pres.addSlide();
  addContentBackground(slide);
  addContentHeader(
    slide,
    "Projeção — cenário médio",
    "Receita de produtos e lucro após taxas Stripe + infra",
  );

  const labels = MEDIO_RECEITA_12M.map((_, i) => `M${i + 1}`);

  slide.addChart(pres.ChartType.bar, [
    {
      name: "Receita (R$)",
      labels,
      values: MEDIO_RECEITA_12M,
    },
    {
      name: "Lucro líquido (R$)",
      labels,
      values: MEDIO_LUCRO_12M,
    },
  ], {
    x: 0.5,
    y: 1.55,
    w: 5.9,
    h: 3.55,
    barDir: "col",
    chartColors: [BRAND.primary, BRAND.success],
    showLegend: true,
    legendPos: "b",
    legendFontSize: 9,
    catAxisLabelFontSize: 8,
    valAxisLabelFontSize: 8,
    valGridLine: { color: BRAND.line, size: 0.5 },
    dataLabelPosition: "outEnd",
    dataLabelFontSize: 7,
    showValue: false,
  });

  const highlights = [
    { m: "Mês 1", rec: "R$ 5.500", lucro: "R$ 2.061" },
    { m: "Mês 6", rec: "R$ 10.450", lucro: "R$ 3.920" },
    { m: "Mês 12", rec: "R$ 16.500", lucro: "R$ 6.075" },
  ];

  slide.addShape("roundRect", {
    x: 6.55,
    y: 1.65,
    w: 3.0,
    h: 3.4,
    fill: { color: BRAND.surface },
    line: { color: BRAND.line, width: 1 },
    rectRadius: 0.05,
  });

  slide.addText("Destaques", {
    x: 6.7,
    y: 1.8,
    w: 2.7,
    h: 0.35,
    fontSize: 13,
    bold: true,
    color: BRAND.primaryStrong,
    fontFace: FONT_TITLE,
  });

  highlights.forEach((h, i) => {
    const y = 2.25 + i * 0.95;
    slide.addText(h.m, {
      x: 6.75,
      y,
      w: 2.6,
      h: 0.3,
      fontSize: 11,
      bold: true,
      color: BRAND.ink,
      fontFace: FONT_BODY,
    });
    slide.addText(`${h.rec} receita · ${h.lucro} lucro*`, {
      x: 6.75,
      y: y + 0.28,
      w: 2.65,
      h: 0.4,
      fontSize: 10,
      color: BRAND.muted,
      fontFace: FONT_BODY,
    });
  });

  slide.addShape("roundRect", {
    x: 6.55,
    y: 4.55,
    w: 3.0,
    h: 0.55,
    fill: { color: BRAND.primaryStrong },
    rectRadius: 0.05,
  });
  slide.addText("12 meses: R$ 48.820", {
    x: 6.65,
    y: 4.68,
    w: 2.8,
    h: 0.35,
    fontSize: 14,
    bold: true,
    color: BRAND.accent,
    fontFace: FONT_TITLE,
    align: "center",
  });

  slide.addText("*Sem impostos, salários ou mídia paga", {
    x: 6.55,
    y: 5.12,
    w: 3,
    h: 0.25,
    fontSize: 8,
    color: BRAND.muted,
    fontFace: FONT_BODY,
    italic: true,
  });

  addFooter(slide, page);
}

function addRoiKpiSlide(pres, page) {
  const slide = pres.addSlide();
  addContentBackground(slide);
  addContentHeader(slide, "ROI e payback", "Retorno sobre investimento em infraestrutura");

  const kpis = [
    { label: "Investimento mínimo", value: "~R$ 40", sub: "domínio .com.br" },
    { label: "Lucro acumulado 12m", value: "R$ 48.820", sub: "cenário médio", accent: true },
    { label: "Payback infra", value: "Mês 1", sub: "cobre domínio no 1º mês" },
  ];

  const w = 2.85;
  kpis.forEach((kpi, i) => {
    const x = 0.55 + i * (w + 0.15);
    slide.addShape("roundRect", {
      x,
      y: 1.7,
      w,
      h: 2.5,
      fill: { color: kpi.accent ? BRAND.primaryStrong : BRAND.surface },
      line: { color: BRAND.line, width: kpi.accent ? 0 : 1 },
      rectRadius: 0.06,
    });
    slide.addText(kpi.label, {
      x: x + 0.2,
      y: 1.95,
      w: w - 0.4,
      h: 0.4,
      fontSize: 12,
      color: kpi.accent ? BRAND.goldSoft : BRAND.muted,
      fontFace: FONT_BODY,
      bold: true,
    });
    slide.addText(kpi.value, {
      x: x + 0.15,
      y: 2.45,
      w: w - 0.3,
      h: 0.9,
      fontSize: kpi.accent ? 32 : 28,
      bold: true,
      color: kpi.accent ? BRAND.accent : BRAND.ink,
      fontFace: FONT_TITLE,
      align: "center",
    });
    slide.addText(kpi.sub, {
      x: x + 0.2,
      y: 3.55,
      w: w - 0.4,
      h: 0.35,
      fontSize: 10,
      color: kpi.accent ? BRAND.accent : BRAND.muted,
      fontFace: FONT_BODY,
      align: "center",
    });
  });

  slide.addText(
    "Payback real do negócio depende de operação, estoque e marketing. Infra ano 1 (médio): ~R$ 744.",
    {
      x: 0.55,
      y: 4.45,
      w: 8.9,
      h: 0.5,
      fontSize: 12,
      color: BRAND.ink,
      fontFace: FONT_BODY,
    },
  );

  addFooter(slide, page);
}

function addRisksTableSlide(pres, page) {
  const slide = pres.addSlide();
  addContentBackground(slide);
  addContentHeader(slide, "Riscos e mitigação", "Transparência gera confiança");

  const headerOpts = {
    fill: { color: BRAND.primaryStrong },
    color: BRAND.accent,
    bold: true,
    fontSize: 11,
    fontFace: FONT_BODY,
    valign: "middle",
  };
  const riskOpts = {
    fill: { color: BRAND.surface },
    color: BRAND.ink,
    fontSize: 11,
    fontFace: FONT_BODY,
    valign: "middle",
  };
  const mitOpts = {
    fill: { color: BRAND.goldSoft },
    color: BRAND.primaryStrong,
    fontSize: 11,
    fontFace: FONT_BODY,
    valign: "middle",
  };

  const rows = [
    [
      { text: "Risco", options: { ...headerOpts, align: "left" } },
      { text: "Mitigação no sistema", options: { ...headerOpts, align: "left" } },
    ],
    [
      { text: "Pix não pago — estoque preso", options: riskOpts },
      { text: "Job libera estoque em 30 minutos", options: mitOpts },
    ],
    [
      { text: "Pagamento sem baixa de estoque", options: riskOpts },
      { text: "Webhook Stripe confirma automaticamente", options: mitOpts },
    ],
    [
      { text: "Margem errada no relatório", options: riskOpts },
      { text: "Cadastrar CMV em cada produto no admin", options: mitOpts },
    ],
    [
      { text: "Limite de e-mail ou banco", options: riskOpts },
      { text: "Monitorar Resend e Neon; upgrade de plano", options: mitOpts },
    ],
    [
      { text: "Estatísticas de marketing no site", options: riskOpts },
      { text: "Validar com dados reais do painel admin", options: mitOpts },
    ],
  ];

  slide.addTable(rows, {
    x: 0.55,
    y: 1.6,
    w: 8.9,
    colW: [3.2, 5.7],
    rowH: 0.52,
    border: { type: "solid", color: BRAND.line, pt: 1 },
  });

  addFooter(slide, page);
}

function addClosingSlide(pres) {
  const slide = pres.addSlide();
  slide.background = { color: BRAND.ink };

  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: "100%",
    h: 0.1,
    fill: { color: BRAND.accent },
  });

  slide.addText("Próximos passos", {
    x: 0.7,
    y: 0.55,
    w: 8,
    h: 0.7,
    fontSize: 34,
    bold: true,
    color: BRAND.surface,
    fontFace: FONT_TITLE,
  });

  const steps = [
    "Registrar domínio e configurar DNS na Vercel",
    "Ativar Stripe, Resend e Neon em modo Live",
    "Subir catálogo real com fotos e CMV",
    "Treinamento do painel admin (~1 hora)",
    "Revisar projeção após 30 dias de operação",
  ];

  steps.forEach((step, i) => {
    const y = 1.45 + i * 0.62;
    slide.addShape("ellipse", {
      x: 0.7,
      y: y + 0.02,
      w: 0.45,
      h: 0.45,
      fill: { color: BRAND.accent },
    });
    slide.addText(String(i + 1), {
      x: 0.7,
      y: y + 0.06,
      w: 0.45,
      h: 0.4,
      fontSize: 14,
      bold: true,
      color: BRAND.primaryStrong,
      fontFace: FONT_BODY,
      align: "center",
    });
    slide.addText(step, {
      x: 1.35,
      y,
      w: 7.8,
      h: 0.5,
      fontSize: 15,
      color: "F0F0F0",
      fontFace: FONT_BODY,
    });
  });

  slide.addShape("roundRect", {
    x: 0.7,
    y: 4.55,
    w: 5.5,
    h: 0.75,
    fill: { color: BRAND.primary },
    rectRadius: 0.08,
  });
  slide.addText("Meta mês 1: 30+ pedidos online", {
    x: 0.85,
    y: 4.72,
    w: 5.2,
    h: 0.45,
    fontSize: 18,
    bold: true,
    color: BRAND.accent,
    fontFace: FONT_TITLE,
    align: "center",
  });

  slide.addText("Stock Center Variedades · Obrigado", {
    x: 0.7,
    y: 5.2,
    w: 5,
    h: 0.3,
    fontSize: 11,
    color: BRAND.muted,
    fontFace: FONT_BODY,
  });
}

// --- Build presentation ---
const pres = new pptxgen();
pres.author = "Stock Center Variedades";
pres.title = "Stock Center 2.0 — Apresentação para compradores";
pres.layout = "LAYOUT_16x9";
pres.theme = { headFontFace: FONT_TITLE, bodyFontFace: FONT_BODY };

let page = 0;

addCoverSlide(pres);
page++;

const contentSlides = [
  {
    title: "Por que ir além da loja física?",
    bullets: [
      "Vendas 24 horas, inclusive fora do horário da loja",
      "Alcance para todo o Brasil (envio) ou retirada na loja",
      "Mesmo estoque e marca — um só negócio, dois canais",
      "Cliente digital já espera comprar online",
    ],
  },
  {
    title: "Sem canal digital estruturado",
    bullets: [
      "Estoque vendido no WhatsApp sem baixa automática",
      "Sem Pix/cartão oficial com confirmação automática",
      "Planilhas para pedidos, frete e margem",
      "Sem lucro bruto por produto em tempo real",
    ],
  },
  {
    title: "Stock Center 2.0 — a solução",
    bullets: [
      "Site moderno (Next.js + React) — rápido e responsivo",
      "PostgreSQL + painel administrativo /admin",
      "Stripe: Pix e cartão com webhook automático",
      "Frete (Melhor Envio) + e-mails transacionais",
    ],
  },
  {
    title: "Experiência de compra",
    subtitle: "Para o cliente final",
    bullets: [
      "Home promocional, catálogo com filtros e busca",
      "Pix com desconto + cartão em até 10x",
      "Cupom, cotação de frete por CEP",
      "Conta: pedidos, rastreio e favoritos",
      "WhatsApp e Instagram integrados",
    ],
  },
  {
    title: "Painel administrativo",
    subtitle: "Para os donos da loja",
    bullets: [
      "Pedidos: status, rastreio e nota fiscal",
      "Produtos: estoque, CMV e ofertas relâmpago",
      "Cupons e gráficos de vendas por categoria",
      "Relatório: receita, CMV, lucro bruto e margem %",
    ],
  },
];

for (const s of contentSlides) {
  page++;
  addContentSlide(pres, page, s.title, s.bullets, s.subtitle);
}

page++;
addSectionSlide(pres, "02", "Produto e operação", "Jornada de compra, pagamentos e marketing");

const productSlides = [
  {
    title: "Do clique à entrega",
    bullets: [
      "Catálogo e carrinho → checkout autenticado",
      "Frete cotado por CEP ou retirada na loja",
      "Pagamento Stripe (Pix ou cartão)",
      "Webhook confirma pagamento e baixa estoque",
      "Cliente acompanha tudo em Minha conta",
    ],
  },
  {
    title: "Pagamentos seguros",
    subtitle: "Stripe Brasil",
    bullets: [
      "Pix: reserva de estoque 30 min + cron de expiração",
      "Cartão: checkout hospedado pela Stripe",
      "Taxa Pix: 1,19% · Cartão: 3,99% + R$ 0,39",
      "Estoque só baixa quando o pagamento confirma",
    ],
  },
  {
    title: "Logística e retirada",
    bullets: [
      "Melhor Envio para cotação real (quando configurado)",
      "Fallback: R$ 14,90 (SP) / R$ 21,90 (demais CEPs)",
      "Retirada na loja — sem frete, cliente retira com código",
      "Frete cobrado ao cliente separado no relatório admin",
    ],
  },
  {
    title: "Marketing embutido",
    bullets: [
      "Cupons e ofertas relâmpago (24 horas)",
      "Newsletter, contato e Google Analytics 4",
      "Recuperação de carrinho abandonado",
      "Mídia paga (Meta/Google): orçar à parte",
    ],
  },
];

for (const s of productSlides) {
  page++;
  addContentSlide(pres, page, s.title, s.bullets, s.subtitle);
}

page++;
addSectionSlide(pres, "03", "Investimento e retorno", "Custos, cenários e projeção financeira");

page++;
addInvestmentKpiSlide(pres, page);

page++;
addContentSlide(
  pres,
  page,
  "Custos fixos mensais (infra)",
  [
    "Início (meses 1–6): ~R$ 4/mês — Vercel, Neon e Resend free + domínio",
    "Crescimento (7–12): ~R$ 40–120/mês — upgrade se necessário",
    "Cron Pix via cron-job.org (gratuito) — não usar só cron Vercel Hobby",
    "Escala conforme volume — não paga caro antes da hora",
  ],
  "Hospedagem, banco, e-mail e domínio",
);

page++;
addContentSlide(
  pres,
  page,
  "Custos variáveis por venda",
  [
    "Stripe Pix: 1,19% do valor pago",
    "Stripe cartão: 3,99% + R$ 0,39 por pedido",
    "Frete: repasse ao cliente; custo real = etiqueta Melhor Envio",
    "Margem da mercadoria: cadastro de CMV no painel admin",
  ],
  "O que sai de cada pedido",
);

page++;
addScenarioTableSlide(pres, page);

page++;
addProjectionChartSlide(pres, page);

page++;
addRoiKpiSlide(pres, page);

page++;
addRisksTableSlide(pres, page);

page++;
addSectionSlide(pres, "04", "Próximos passos", "Colocar a loja no ar e operar");

addClosingSlide(pres);

await pres.writeFile({ fileName: outFile });
console.log(`Gerado: ${outFile} (${TOTAL_SLIDES} slides)`);
