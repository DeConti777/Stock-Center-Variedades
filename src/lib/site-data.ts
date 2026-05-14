import type {
  Category,
  Product,
  Testimonial,
} from "@/lib/types";

function splitHeroMarketingUrls(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * URLs externas do hero (env). Arquivos em `public/marketing-videos/` sao somados no componente do hero.
 * Separadas por `;`. YouTube, Vimeo, Instagram ou URL http(s).
 */
export const heroMarketingVideoUrlsFromEnv: string[] = (() => {
  const urlsEnv = process.env.NEXT_PUBLIC_HERO_MARKETING_VIDEO_URLS?.trim();
  const singleEnv = process.env.NEXT_PUBLIC_HERO_MARKETING_VIDEO_URL?.trim();
  if (urlsEnv) return splitHeroMarketingUrls(urlsEnv);
  return splitHeroMarketingUrls(singleEnv);
})();

export const whatsappLink =
  "https://wa.me/5511977324024?text=Oi!%20Quero%20atendimento%20na%20Stock%20Center%20Variedades.";

export const instagramLink =
  "https://www.instagram.com/stock.center.variedades?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==";

export const storeHighlights = [
  "Preco baixo de verdade",
  "Entrega rapida para todo o Brasil",
  "Pagamento seguro no Pix e cartao",
];

export const categories: {
  name: Category;
  description: string;
  accent: string;
  backgroundImage: string;
}[] = [
  {
    name: "Utilidades",
    description: "Itens que facilitam a rotina de casa com praticidade.",
    accent: "from-[#0f172a] to-[#1d4ed8]",
    backgroundImage: "/categories/utilidades.jpg",
  },
  {
    name: "Eletronicos",
    description: "Acessorios inteligentes para o dia a dia e trabalho.",
    accent: "from-[#1e293b] to-[#0ea5e9]",
    backgroundImage: "/categories/eletronicos.jpg",
  },
  {
    name: "Presentes",
    description: "Sugestoes criativas para surpreender sem gastar demais.",
    accent: "from-[#7c2d12] to-[#ea580c]",
    backgroundImage: "/categories/presentes.jpg",
  },
  {
    name: "Acessorios",
    description: "Detalhes de moda e organizacao para todas as rotinas.",
    accent: "from-[#334155] to-[#e11d48]",
    backgroundImage: "/categories/acessorios.jpg",
  },
  {
    name: "Organizacao",
    description: "Solucoes compactas para quarto, cozinha e escritorio.",
    accent: "from-[#14532d] to-[#22c55e]",
    backgroundImage: "/categories/organizacao.jpg",
  },
  {
    name: "Skincare",
    description: "Autocuidado acessivel com itens funcionais e atuais.",
    accent: "from-[#7f1d1d] to-[#fb7185]",
    backgroundImage: "/categories/skincare.jpg",
  },
  {
    name: "Sazonais",
    description: "Datas especiais e oportunidades para vender mais rapido.",
    accent: "from-[#111827] to-[#f59e0b]",
    backgroundImage: "/categories/sazonais.jpg",
  },
  {
    name: "Promocoes",
    description: "Produtos com margem de conversao alta e desconto real.",
    accent: "from-[#991b1b] to-[#ef4444]",
    backgroundImage: "/categories/promocoes.jpg",
  },
];

export const products: Product[] = [
  {
    id: "p1",
    slug: "kit-potes-hermeticos-10-pecas",
    name: "Kit Potes Hermeticos 10 Pecas",
    category: "Organizacao",
    price: 89.9,
    originalPrice: 119.9,
    pixDiscountPercent: 10,
    installment: { quantity: 3, amount: 29.97 },
    stock: 34,
    rating: 4.9,
    reviews: 186,
    shortDescription: "Mais espaco, mais praticidade e cozinha organizada todos os dias.",
    description:
      "Conjunto com 10 potes hermeticos transparentes para manter mantimentos protegidos, visiveis e bem organizados. Ideal para cozinha, lavanderia ou despensa.",
    features: [
      "Vedacao firme e segura",
      "Material resistente e facil de limpar",
      "Empilhavel para ganhar espaco",
      "Perfeito para arroz, feijao, massas e snacks",
    ],
    badge: "Mais vendido",
    sku: "SCV-ORG-001",
    images: ["#fef3c7", "#fde68a", "#f59e0b"],
    tags: ["featured", "bestSeller"],
  },
  {
    id: "p2",
    slug: "mini-caixa-de-som-bluetooth-luz-led",
    name: "Mini Caixa de Som Bluetooth com LED",
    category: "Eletronicos",
    price: 69.9,
    originalPrice: 99.9,
    pixDiscountPercent: 8,
    installment: { quantity: 3, amount: 23.3 },
    stock: 20,
    rating: 4.7,
    reviews: 97,
    shortDescription: "Som potente, visual moderno e alta saida nas promocoes.",
    description:
      "Caixa de som compacta com conexao Bluetooth estavel, bateria recarregavel e iluminacao LED. Excelente opcao de presente e venda por impulso.",
    features: [
      "Conexao sem fio rapida",
      "LED que valoriza a vitrine",
      "Boa duracao de bateria",
      "Portatil e facil de levar",
    ],
    badge: "Oferta da semana",
    sku: "SCV-ELE-002",
    images: ["#082f49", "#0ea5e9", "#38bdf8"],
    tags: ["featured", "promotion"],
  },
  {
    id: "p3",
    slug: "espelho-de-maquiagem-com-led-portatil",
    name: "Espelho de Maquiagem com LED Portatil",
    category: "Skincare",
    price: 59.9,
    originalPrice: 79.9,
    pixDiscountPercent: 10,
    installment: { quantity: 2, amount: 29.95 },
    stock: 28,
    rating: 4.8,
    reviews: 144,
    shortDescription: "Autocuidado com acabamento premium e excelente valor percebido.",
    description:
      "Espelho de mesa com iluminacao LED, design compacto e acabamento elegante para maquiagem, skincare e uso diario.",
    features: [
      "Luz LED uniforme",
      "Base firme e leve",
      "Ideal para penteadeira ou viagem",
      "Visual sofisticado para presentear",
    ],
    sku: "SCV-SKN-003",
    images: ["#fdf2f8", "#fbcfe8", "#fb7185"],
    tags: ["featured", "new"],
  },
  {
    id: "p4",
    slug: "organizador-de-cabos-e-carregadores",
    name: "Organizador de Cabos e Carregadores",
    category: "Acessorios",
    price: 39.9,
    originalPrice: 54.9,
    pixDiscountPercent: 7,
    installment: { quantity: 2, amount: 19.95 },
    stock: 46,
    rating: 4.6,
    reviews: 61,
    shortDescription: "Mantem bolsa, mochila e home office sempre em ordem.",
    description:
      "Bolsa organizadora compacta com divisoes internas para cabos, carregadores, fones e pequenos acessorios.",
    features: [
      "Interior com divisorias",
      "Tecido resistente",
      "Ziper de facil abertura",
      "Otimo para viagem e escritorio",
    ],
    sku: "SCV-ACS-004",
    images: ["#e2e8f0", "#94a3b8", "#334155"],
    tags: ["bestSeller"],
  },
  {
    id: "p5",
    slug: "kit-canecas-presente-especial",
    name: "Kit Canecas Presente Especial",
    category: "Presentes",
    price: 49.9,
    originalPrice: 69.9,
    pixDiscountPercent: 12,
    installment: { quantity: 2, amount: 24.95 },
    stock: 18,
    rating: 4.9,
    reviews: 83,
    shortDescription: "Presente criativo, acessivel e com apelo emocional forte.",
    description:
      "Kit com 2 canecas decoradas em embalagem premium, ideal para datas comemorativas, lembrancas e presentes rapidos.",
    features: [
      "Embalagem pronta para presente",
      "Otimo custo-beneficio",
      "Design moderno",
      "Alta saida em campanhas sazonais",
    ],
    badge: "Presente favorito",
    sku: "SCV-PRS-005",
    images: ["#fff7ed", "#fdba74", "#ea580c"],
    tags: ["promotion", "bestSeller"],
  },
  {
    id: "p6",
    slug: "fritadeira-air-fryer-portatil-compacta",
    name: "Fritadeira Air Fryer Portatil Compacta",
    category: "Utilidades",
    price: 299.9,
    originalPrice: 359.9,
    pixDiscountPercent: 6,
    installment: { quantity: 10, amount: 29.99 },
    stock: 9,
    rating: 4.8,
    reviews: 212,
    shortDescription: "Praticidade na cozinha com ticket medio maior e muita busca.",
    description:
      "Air fryer compacta com cesto antiaderente, controle simples e visual elegante para rotinas mais rapidas e saudaveis.",
    features: [
      "Ideal para pequenas porcoes",
      "Facil de limpar",
      "Design moderno e compacto",
      "Otima opcao para venda premium",
    ],
    badge: "Entrega rapida",
    sku: "SCV-UTL-006",
    images: ["#f8fafc", "#cbd5e1", "#475569"],
    tags: ["featured", "bestSeller"],
  },
  {
    id: "p7",
    slug: "kit-decoracao-festa-junina-premium",
    name: "Kit Decoracao Festa Junina Premium",
    category: "Sazonais",
    price: 79.9,
    originalPrice: 109.9,
    pixDiscountPercent: 12,
    installment: { quantity: 3, amount: 26.63 },
    stock: 25,
    rating: 4.7,
    reviews: 52,
    shortDescription: "Produto sazonal com giro forte em campanhas tematicas.",
    description:
      "Decoracao completa para Festa Junina com bandeirolas, painel, mesa e detalhes tematicos para festas em casa, escola ou comercio.",
    features: [
      "Kit completo",
      "Visual colorido e tematico",
      "Montagem simples",
      "Boa performance em datas sazonais",
    ],
    sku: "SCV-SAZ-007",
    images: ["#fef2f2", "#fb7185", "#dc2626"],
    tags: ["promotion", "new"],
  },
  {
    id: "p8",
    slug: "smartwatch-fit-touch-pro",
    name: "Smartwatch Fit Touch Pro",
    category: "Eletronicos",
    price: 149.9,
    originalPrice: 199.9,
    pixDiscountPercent: 10,
    installment: { quantity: 6, amount: 24.98 },
    stock: 22,
    rating: 4.6,
    reviews: 137,
    shortDescription: "Tecnologia com excelente custo-beneficio e alta atracao no catalogo.",
    description:
      "Relogio inteligente com monitoramento basico, notificacoes, contador de passos e pulseira confortavel para uso diario.",
    features: [
      "Tela touch intuitiva",
      "Conexao com smartphone",
      "Monitoramento de atividades",
      "Design leve e atual",
    ],
    sku: "SCV-ELE-008",
    images: ["#111827", "#6366f1", "#c4b5fd"],
    tags: ["bestSeller", "promotion"],
  },
];

export const testimonials: Testimonial[] = [
  {
    id: "t1",
    name: "Patricia A.",
    city: "Campinas, SP",
    quote:
      "Comprei utilidades e um presente no mesmo pedido. Chegou em poucos dias, bem embalado, e o Pix com desconto fez diferenca no total.",
    rating: 5,
    reviewedAt: "abril/2026",
  },
  {
    id: "t2",
    name: "Rafael N.",
    city: "Belo Horizonte, MG",
    quote:
      "Site facil de usar. Tirei uma duvida no WhatsApp e fui atendido rapido. Ja indiquei para a familia.",
    rating: 5,
    reviewedAt: "marco/2026",
  },
  {
    id: "t3",
    name: "Juliana C.",
    city: "Curitiba, PR",
    quote:
      "Variedade boa mesmo: achei organizacao, presente e um eletronico sem ficar perdida em promocao falsa.",
    rating: 5,
    reviewedAt: "fevereiro/2026",
  },
];

export const institutionalStats = [
  { label: "Pedidos enviados", value: "+18 mil" },
  { label: "Categorias na loja", value: "8" },
  { label: "Nota media informada", value: "4,8/5" },
  { label: "Preparacao do pedido", value: "ate 48h" },
];

export const paymentMethods = ["Pix com desconto", "Cartao em ate 10x", "Compra segura"];
