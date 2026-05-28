import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  getProductionAppUrlMisconfigurationError,
  resolvePublicAppUrl,
} from "./env.ts";

const envBackup = { ...process.env };

function restoreEnv() {
  for (const key of Object.keys(process.env)) {
    if (!(key in envBackup)) delete process.env[key];
  }
  Object.assign(process.env, envBackup);
}

describe("resolvePublicAppUrl", () => {
  beforeEach(() => {
    restoreEnv();
  });

  afterEach(() => {
    restoreEnv();
  });

  it("usa localhost em desenvolvimento", () => {
    process.env.NODE_ENV = "development";
    delete process.env.NEXT_PUBLIC_APP_URL;
    assert.equal(resolvePublicAppUrl(), "http://localhost:3000");
  });

  it("ignora http localhost em producao e usa VERCEL_URL", () => {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    process.env.VERCEL_URL = "stock-center-2-0.vercel.app";
    assert.equal(resolvePublicAppUrl(), "https://stock-center-2-0.vercel.app");
    assert.equal(getProductionAppUrlMisconfigurationError(), null);
  });

  it("aceita NEXT_PUBLIC_APP_URL https em producao", () => {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_APP_URL = "https://www.stockcentervariedades.com.br/";
    delete process.env.VERCEL_URL;
    assert.equal(
      resolvePublicAppUrl(),
      "https://www.stockcentervariedades.com.br",
    );
    assert.equal(getProductionAppUrlMisconfigurationError(), null);
  });
});
