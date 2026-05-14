import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default [
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // React 19 ruleset can flag many existing patterns as hard errors.
      // Keep lint actionable while we migrate components incrementally.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/error-boundaries": "off",
    },
  },
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "postcss.config.mjs",
      "next.config.ts",
      "check-db.js",
      "check-admin.sql",
      "create-admin.sql",
      "prisma/**",
      "eslint.config.mjs",
    ],
  },
];
