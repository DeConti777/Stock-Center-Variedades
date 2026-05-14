module.exports = {
  extends: ["next/core-web-vitals", "next/typescript"],
  ignorePatterns: [
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "postcss.config.mjs",
    "next.config.ts",
    "check-db.js",
    "check-admin.sql",
    "create-admin.sql",
    "prisma/**"
  ]
};