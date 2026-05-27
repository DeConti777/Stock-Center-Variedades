import { PrismaClient } from "@prisma/client";
import { stringifyStringArray } from "../src/lib/product-json";

const DEFAULT_COUNT = 220;
const SKU_PREFIX = "SCV-DEMO-";

type CategoryName =
  | "Utilidades"
  | "Eletronicos"
  | "Presentes"
  | "Acessorios"
  | "Organizacao"
  | "Skincare"
  | "Sazonais"
  | "Promocoes";

const categories: CategoryName[] = [
  "Utilidades",
  "Eletronicos",
  "Presentes",
  "Acessorios",
  "Organizacao",
  "Skincare",
  "Sazonais",
  "Promocoes",
];

const productNameByCategory: Record<CategoryName, string[]> = {
  Utilidades: [
    "Kit Organizador Multiuso",
    "Conjunto Potes Hermeticos",
    "Escorredor Compacto Premium",
    "Suporte Dobravel de Cozinha",
  ],
  Eletronicos: [
    "Fone Bluetooth Pro",
    "Mini Caixa de Som LED",
    "Carregador Turbo USB-C",
    "Smartwatch Active Fit",
  ],
  Presentes: [
    "Kit Presente Criativo",
    "Caneca Termica Luxo",
    "Luminaria Decorativa Soft",
    "Combo Surpresa Premium",
  ],
  Acessorios: [
    "Bolsa Organizadora Trend",
    "Carteira Slim Elegance",
    "Kit Acessorios Urban",
    "Mochila Casual Compact",
  ],
  Organizacao: [
    "Caixa Organizadora Modular",
    "Kit Colmeias Organizadoras",
    "Divisor de Gavetas Flex",
    "Suporte Vertical Inteligente",
  ],
  Skincare: [
    "Kit Skincare Glow",
    "Escova Facial Clean",
    "Massageador Facial Ice",
    "Organizador Beauty Care",
  ],
  Sazonais: [
    "Kit Festa Especial",
    "Combo Verao Pratico",
    "Kit Inverno Confort",
    "Decoracao Tema Sazonal",
  ],
  Promocoes: [
    "Oferta Relampago Mix",
    "Combo Economia Inteligente",
    "Kit Promocao Imperdivel",
    "Selecao Desconto Especial",
  ],
};

const badgePool = ["Mais vendido", "Oferta da semana", "Novo", undefined];
const baseFeatures = [
  "Acabamento resistente e duravel",
  "Design moderno para uso diario",
  "Excelente custo-beneficio",
  "Facil de limpar e armazenar",
  "Ideal para casa, trabalho ou presente",
];

function isPostgresUrl(value: string | undefined) {
  const v = value?.trim() ?? "";
  return v.startsWith("postgresql://") || v.startsWith("postgres://");
}

function assertPostgresEnv() {
  if (!isPostgresUrl(process.env.DATABASE_URL)) {
    throw new Error(
      "DATABASE_URL invalida. Este projeto usa PostgreSQL (valor deve comecar com postgresql:// ou postgres://).",
    );
  }
  if (!isPostgresUrl(process.env.DIRECT_URL)) {
    throw new Error(
      "DIRECT_URL invalida. Configure DIRECT_URL com a conexao direta do PostgreSQL.",
    );
  }
}

function pad4(n: number) {
  return String(n).padStart(4, "0");
}

function createRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function randomInt(rng: () => number, min: number, max: number) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function randomPick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)] as T;
}

function parseArgs(argv: string[]) {
  const args = new Set(argv);
  const countArg = argv.find((item) => item.startsWith("--count="));
  const countParsed = countArg ? Number(countArg.replace("--count=", "")) : NaN;
  const count = Number.isFinite(countParsed)
    ? Math.max(1, Math.min(10000, Math.floor(countParsed)))
    : DEFAULT_COUNT;
  return {
    dryRun: args.has("--dry-run"),
    apply: args.has("--apply"),
    count,
  };
}

function buildProductData(index: number, rng: () => number) {
  const n = index + 1;
  const code = pad4(n);
  const category = randomPick(rng, categories);
  const baseName = randomPick(rng, productNameByCategory[category]);
  const variant = randomInt(rng, 10, 99);
  const price = randomInt(rng, 1990, 29990) / 100;
  const hasOriginal = rng() < 0.4;
  const originalPrice = hasOriginal
    ? Math.round(price * (1.15 + rng() * 0.5) * 100) / 100
    : null;
  const pixDiscountPercent = randomInt(rng, 5, 15);
  const installmentQuantity = randomPick(rng, [2, 3, 6]);
  const installmentAmount = Math.round((price / installmentQuantity) * 100) / 100;
  const stock = randomInt(rng, 5, 80);
  const rating = Math.round((3.8 + rng() * 1.2) * 10) / 10;
  const reviews = randomInt(rng, 0, 350);
  const badge = randomPick(rng, badgePool) ?? null;
  const productName = `${baseName} ${variant}`;
  const slug = `demo-produto-${code}`;
  const sku = `${SKU_PREFIX}${code}`;
  const coverImage = `https://picsum.photos/seed/demo-${code}-cover/800/800`;
  const gallery = [
    coverImage,
    `https://picsum.photos/seed/demo-${code}-1/800/800`,
    `https://picsum.photos/seed/demo-${code}-2/800/800`,
  ];
  const features = [baseFeatures[0], baseFeatures[1], baseFeatures[2], baseFeatures[3]];
  const shortDescription =
    `${productName} com otima saida e excelente valor percebido para testes realistas de catalogo.`.slice(
      0,
      155,
    );
  const description =
    `${productName} e um item demo gerado automaticamente para simulacao de escala da loja. ` +
    "Inclui preco, estoque, midia e metadados para validar filtros, busca, vitrine e pagina de produto em volume elevado.";

  const tags = ["new", "demo-seed"];

  return {
    slug,
    name: productName,
    category,
    priceInCents: Math.round(price * 100),
    costInCents: Math.round(price * 0.58 * 100),
    originalPriceInCents: originalPrice ? Math.round(originalPrice * 100) : null,
    pixDiscountPercent,
    installmentQuantity,
    installmentAmountInCents: Math.round(installmentAmount * 100),
    stock,
    rating,
    reviews,
    shortDescription,
    description,
    badge,
    sku,
    coverImage,
    images: stringifyStringArray(gallery),
    features: stringifyStringArray(features),
    tags: stringifyStringArray(tags),
    published: true,
  };
}

async function main() {
  const { dryRun, apply, count } = parseArgs(process.argv.slice(2));
  if (!dryRun && !apply) {
    throw new Error("Informe --dry-run (simulacao) ou --apply (grava no banco).");
  }

  assertPostgresEnv();

  const rng = createRng(20260526);
  const data = Array.from({ length: count }, (_, index) => buildProductData(index, rng));

  if (dryRun) {
    console.log(`[seed-demo] DRY RUN: ${data.length} produtos seriam criados.`);
    console.log(`[seed-demo] Exemplo SKU/slug: ${data[0]?.sku} / ${data[0]?.slug}`);
    return;
  }

  const prisma = new PrismaClient();
  try {
    const created = await prisma.product.createMany({
      data,
      skipDuplicates: true,
    });
    console.log(
      `[seed-demo] Finalizado. Solicitados: ${data.length} | Inseridos: ${created.count} | Prefixo SKU: ${SKU_PREFIX}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("[seed-demo] Erro:", error);
  process.exit(1);
});
