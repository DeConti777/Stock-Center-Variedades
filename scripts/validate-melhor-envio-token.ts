/**
 * Valida se o token ME consegue cotar E inserir no carrinho.
 * Uso: npm run validate:melhor-envio
 */

import { existsSync, readFileSync } from "fs";

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  try {
    const raw = readFileSync(path, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const m = trimmed.match(/^([^#=]+)=(.*)$/);
      if (!m) continue;
      const key = m[1].trim();
      const value = m[2].trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    /* arquivo opcional */
  }
}

for (const path of [".env", ".env.local"]) {
  loadEnvFile(path);
}

import {
  getMelhorEnvioUserAgent,
  isMelhorEnvioConfigured,
  melhorEnvioBaseUrl,
} from "../src/lib/melhor-envio";

function digitsOnly(value: string, maxLen: number) {
  return value.replace(/\D/g, "").slice(0, maxLen);
}

async function main() {
  const token = process.env.MELHOR_ENVIO_TOKEN?.trim();
  const email = process.env.MELHOR_ENVIO_CONTACT_EMAIL?.trim() || "suporte@local";
  const origin = digitsOnly(process.env.SHIPPING_ORIGIN_POSTAL_CODE ?? "", 8);
  const sandbox = process.env.MELHOR_ENVIO_USE_SANDBOX === "true";
  const senderCnpj = digitsOnly(
    process.env.MELHOR_ENVIO_SENDER_COMPANY_DOCUMENT ?? "",
    14,
  );
  const senderCpf = digitsOnly(process.env.MELHOR_ENVIO_SENDER_DOCUMENT ?? "", 11);

  console.log("Configurado:", isMelhorEnvioConfigured());
  console.log("Base URL:", melhorEnvioBaseUrl());
  console.log("Sandbox flag:", sandbox);
  console.log("CEP origem (SHIPPING_ORIGIN_POSTAL_CODE):", origin || "(ausente)");
  console.log("");

  if (!token) {
    console.error("MELHOR_ENVIO_TOKEN ausente.");
    process.exit(1);
  }

  if (origin.length !== 8) {
    console.error(
      "SHIPPING_ORIGIN_POSTAL_CODE ausente ou invalido (precisa de 8 digitos, CEP de postagem da loja).",
    );
    console.error("Exemplo no .env: SHIPPING_ORIGIN_POSTAL_CODE=01310100");
    process.exit(1);
  }

  if (senderCnpj.length === 14 && senderCpf.length === 11) {
    console.warn(
      "Aviso: MELHOR_ENVIO_SENDER_COMPANY_DOCUMENT e MELHOR_ENVIO_SENDER_DOCUMENT definidos; o carrinho usa CNPJ (CPF ignorado).",
    );
  } else if (!senderCnpj && senderCpf.length !== 11) {
    console.warn(
      "Aviso: informe CNPJ (MELHOR_ENVIO_SENDER_COMPANY_DOCUMENT) ou CPF (MELHOR_ENVIO_SENDER_DOCUMENT) valido para o teste de carrinho.",
    );
  }
  console.log("");

  async function request(path: string, body: Record<string, unknown>) {
    const res = await fetch(`${melhorEnvioBaseUrl()}${path}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "User-Agent": getMelhorEnvioUserAgent(),
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, text };
  }

  const calc = await request("/api/v2/me/shipment/calculate", {
    from: { postal_code: origin },
    to: { postal_code: "01310100" },
    products: [
      {
        id: "test",
        width: 20,
        height: 15,
        length: 25,
        weight: 0.5,
        insurance_value: 10,
        quantity: 1,
      },
    ],
    options: { receipt: false, own_hand: false },
  });
  console.log(
    "1) Cotacao (calculate):",
    calc.status,
    calc.status === 200 ? "OK" : calc.text.slice(0, 200),
  );

  const from: Record<string, string> = {
    name: process.env.MELHOR_ENVIO_SENDER_NAME || "Remetente Teste",
    email: process.env.MELHOR_ENVIO_SENDER_EMAIL || email,
    phone: digitsOnly(process.env.MELHOR_ENVIO_SENDER_PHONE || "11999999999", 11),
    document: senderCpf,
    company_document: senderCnpj,
    state_register: "ISENTO",
    address: process.env.MELHOR_ENVIO_SENDER_STREET || "Rua Teste",
    complement: "",
    number: process.env.MELHOR_ENVIO_SENDER_NUMBER || "1",
    district: process.env.MELHOR_ENVIO_SENDER_DISTRICT || "Centro",
    city: process.env.MELHOR_ENVIO_SENDER_CITY || "Sao Paulo",
    postal_code: origin,
    state_abbr: (process.env.MELHOR_ENVIO_SENDER_STATE_ABBR || "SP").slice(0, 2),
  };
  if (from.company_document) {
    from.document = "";
  }

  const cart = await request("/api/v2/me/cart", {
    service: 2,
    from,
    to: {
      name: "Destinatario Teste",
      email: "destino@teste.local",
      phone: "11988887777",
      document: "52998224725",
      state_register: "ISENTO",
      address: "Av Paulista",
      complement: "",
      number: "1000",
      district: "Bela Vista",
      city: "Sao Paulo",
      postal_code: "01310100",
      state_abbr: "SP",
      country_id: "BR",
    },
    products: [{ name: "Item teste", quantity: "1", unitary_value: "10" }],
    volumes: [{ height: 15, width: 20, length: 25, weight: 0.5 }],
    options: {
      platform: "Stock Center",
      insurance_value: 10,
      receipt: false,
      own_hand: false,
    },
  });
  console.log(
    "2) Carrinho (cart):",
    cart.status,
    cart.status === 200 || cart.status === 201 ? "OK" : cart.text.slice(0, 300),
  );

  console.log("");
  if (calc.status !== 200) {
    console.log(
      "Falha na cotacao: confira token, SHIPPING_ORIGIN_POSTAL_CODE e MELHOR_ENVIO_USE_SANDBOX (token de producao = false).",
    );
    process.exit(1);
  }

  if (cart.status !== 200 && cart.status !== 201) {
    if (cart.status === 401 || cart.status === 403) {
      console.log("O token NAO tem permissao de carrinho.");
      console.log("");
      console.log("Corrija assim:");
      console.log("  1. https://melhorenvio.com.br/painel/gerenciar/tokens");
      console.log("  2. NOVO TOKEN -> Selecionar TODAS as permissoes");
      console.log("     (minimo: cart-write, shipping-checkout, shipping-calculate)");
      console.log("  3. Cole em MELHOR_ENVIO_TOKEN no .env");
      console.log("  4. MELHOR_ENVIO_USE_SANDBOX=false");
      console.log("  5. npm run test:melhor-envio");
    }
    if (cart.text.includes("company_document")) {
      console.log(
        "Falha no carrinho: CNPJ invalido em MELHOR_ENVIO_SENDER_COMPANY_DOCUMENT (use o CNPJ real da loja no Melhor Envio).",
      );
      console.log(
        "Alternativa: remova o CNPJ e use MELHOR_ENVIO_SENDER_DOCUMENT com CPF do titular da conta ME.",
      );
    }
    process.exit(1);
  }

  console.log("Token OK para cotacao e carrinho.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
