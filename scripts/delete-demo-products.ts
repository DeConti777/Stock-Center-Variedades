import { PrismaClient } from "@prisma/client";

const SKU_PREFIX = "SCV-DEMO-";
const DEMO_TAG = "demo-seed";

function parseArgs(argv: string[]) {
  const args = new Set(argv);
  return {
    dryRun: args.has("--dry-run"),
    apply: args.has("--apply"),
  };
}

function hasDemoTag(tagsRaw: string | null | undefined): boolean {
  if (!tagsRaw) return false;
  try {
    const parsed = JSON.parse(tagsRaw);
    return Array.isArray(parsed) && parsed.includes(DEMO_TAG);
  } catch {
    return false;
  }
}

async function main() {
  const { dryRun, apply } = parseArgs(process.argv.slice(2));
  if (!dryRun && !apply) {
    throw new Error("Informe --dry-run (simulacao) ou --apply (remove do banco).");
  }

  const prisma = new PrismaClient();
  try {
    const candidates = await prisma.product.findMany({
      select: { id: true, sku: true, tags: true },
      where: {
        OR: [{ sku: { startsWith: SKU_PREFIX } }, { tags: { contains: DEMO_TAG } }],
      },
    });

    const ids = candidates
      .filter((row) => row.sku.startsWith(SKU_PREFIX) || hasDemoTag(row.tags))
      .map((row) => row.id);

    if (dryRun) {
      console.log(`[delete-demo] DRY RUN: ${ids.length} produtos seriam removidos.`);
      return;
    }

    const result = await prisma.product.deleteMany({
      where: {
        id: { in: ids },
      },
    });
    console.log(`[delete-demo] Removidos: ${result.count}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("[delete-demo] Erro:", error);
  process.exit(1);
});
