import { execSync } from "node:child_process";
import { ensurePrismaDatabaseEnv } from "./ensure-prisma-database-env.mjs";

ensurePrismaDatabaseEnv();

execSync("npx prisma migrate deploy", { stdio: "inherit", env: process.env });
execSync("npx next build", { stdio: "inherit", env: process.env });
