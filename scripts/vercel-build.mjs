import { execSync } from "node:child_process";
import { setTimeout } from "node:timers/promises";
import {
  deriveDirectUrl,
  ensurePrismaDatabaseEnv,
} from "./ensure-prisma-database-env.mjs";

function resolveDirectUrl() {
  ensurePrismaDatabaseEnv();
  const configured = process.env.DIRECT_URL?.trim();
  const databaseUrl = process.env.DATABASE_URL?.trim();
  let direct = configured || (databaseUrl ? deriveDirectUrl(databaseUrl) : "");
  if (direct && /-pooler/i.test(direct)) {
    direct = deriveDirectUrl(direct);
    console.warn(
      "[build] DIRECT_URL apontava para pooler — usando host direto derivado para migrate.",
    );
  }
  return direct;
}

/** Migrate sempre via conexao direct (Neon); pooler nao suporta advisory lock. */
function getMigrateEnv() {
  const direct = resolveDirectUrl();
  if (!direct) {
    console.error(
      "[build] Nao foi possivel resolver DIRECT_URL para prisma migrate deploy.",
    );
    process.exit(1);
  }
  return { ...process.env, DATABASE_URL: direct, DIRECT_URL: direct };
}

function readMigrateStatus(env) {
  try {
    return execSync("npx prisma migrate status", {
      encoding: "utf8",
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch (error) {
    const stdout = error.stdout?.toString?.() ?? "";
    const stderr = error.stderr?.toString?.() ?? "";
    return `${stdout}\n${stderr}`;
  }
}

function hasPendingMigrations(statusOutput) {
  const lower = statusOutput.toLowerCase();
  if (lower.includes("database schema is up to date")) return false;
  if (lower.includes("no pending migrations")) return false;
  return (
    lower.includes("have not yet been applied") ||
    lower.includes("following migration")
  );
}

async function runMigrateDeploy() {
  const env = getMigrateEnv();
  const statusOutput = readMigrateStatus(env);

  if (!hasPendingMigrations(statusOutput)) {
    console.log(
      "[build] Schema do banco atualizado — pulando prisma migrate deploy.",
    );
    return;
  }

  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      execSync("npx prisma migrate deploy", { stdio: "inherit", env });
      return;
    } catch {
      if (attempt >= maxAttempts) {
        console.error(
          "[build] prisma migrate deploy falhou apos",
          maxAttempts,
          "tentativas.",
        );
        console.error(
          "[build] Confira DIRECT_URL (Neon Direct) na Vercel e se outro deploy nao esta rodando migrate ao mesmo tempo.",
        );
        process.exit(1);
      }
      console.warn(
        `[build] migrate deploy falhou (tentativa ${attempt}/${maxAttempts}). Nova tentativa em 15s…`,
      );
      await setTimeout(15_000);
    }
  }
}

await runMigrateDeploy();
execSync("npx next build", { stdio: "inherit", env: process.env });
