/**
 * Promove um usuario existente a ADMIN no banco configurado em .env.
 *
 * Uso:
 *   npm run db:promote -- email@exemplo.com
 *   npx tsx scripts/promote-admin.ts email@exemplo.com
 *   npx tsx scripts/promote-admin.ts --list           (lista emails cadastrados)
 *   npx tsx scripts/promote-admin.ts --demote alguem@x.com   (rebaixa para CUSTOMER)
 */

import { PrismaClient } from "@prisma/client";

const args = process.argv.slice(2);
const wantsList = args.includes("--list");
const demoteIndex = args.findIndex((a) => a === "--demote");
const shouldDemote = demoteIndex >= 0;
const rawTarget = shouldDemote ? args[demoteIndex + 1] : args.find((a) => !a.startsWith("--"));

async function main() {
  const prisma = new PrismaClient();
  try {
    if (wantsList) {
      const users = await prisma.user.findMany({
        select: { id: true, email: true, name: true, role: true },
        orderBy: { createdAt: "asc" },
      });
      console.table(users);
      return;
    }

    if (!rawTarget) {
      console.error(
        "Uso: npx tsx scripts/promote-admin.ts <email> | --list | --demote <email>",
      );
      process.exitCode = 1;
      return;
    }

    const email = rawTarget.trim().toLowerCase();
    const targetRole = shouldDemote ? "CUSTOMER" : "ADMIN";

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.error(`Nenhum usuario encontrado com email = ${email}`);
      console.error("Use --list para ver os emails cadastrados.");
      process.exitCode = 1;
      return;
    }

    if (user.role === targetRole) {
      console.log(`Usuario ${email} ja esta com role ${targetRole}. Nada a fazer.`);
      return;
    }

    const updated = await prisma.user.update({
      where: { email },
      data: { role: targetRole },
      select: { id: true, email: true, name: true, role: true },
    });
    console.log(
      `Role atualizada com sucesso (${user.role} -> ${updated.role}):`,
    );
    console.table([updated]);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Falha:", err);
  process.exit(1);
});
