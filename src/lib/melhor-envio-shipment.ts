import type { Order, OrderItem, PrismaClient } from "@prisma/client";
import {
  getMelhorEnvioUserAgent,
  isMelhorEnvioConfigured,
  melhorEnvioBaseUrl,
} from "@/lib/melhor-envio";
import {
  aggregatePackageVolume,
  resolvePackageDims,
} from "@/lib/package-dimensions";

type DbClient = PrismaClient;

export type MelhorEnvioSyncResult =
  | { ok: true; shipmentId: string; status: "CART" | "PURCHASED"; purchased: boolean }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; skipped: false; error: string };

type ShippingAddressJson = {
  recipientName?: string;
  cep?: string;
  city?: string;
  state?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  email?: string;
  phone?: string;
  cpf?: string;
};

type MelhorEnvioParty = {
  name: string;
  email: string;
  phone: string;
  document: string;
  company_document?: string;
  state_register: string;
  address: string;
  complement: string;
  number: string;
  district: string;
  city: string;
  postal_code: string;
  state_abbr: string;
  country_id?: string;
};

function onlyDigits(value: string, maxLen?: number) {
  const digits = value.replace(/\D/g, "");
  return maxLen ? digits.slice(0, maxLen) : digits;
}

function isValidCpf(cpf: string) {
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(cpf[i]) * (10 - i);
  const d1 = ((sum * 10) % 11) % 10;
  if (d1 !== Number(cpf[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(cpf[i]) * (11 - i);
  const d2 = ((sum * 10) % 11) % 10;
  return d2 === Number(cpf[10]);
}

function isValidCnpj(cnpj: string) {
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(cnpj[i]) * w1[i];
  const d1 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (d1 !== Number(cnpj[12])) return false;
  sum = 0;
  for (let i = 0; i < 13; i++) sum += Number(cnpj[i]) * w2[i];
  const d2 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return d2 === Number(cnpj[13]);
}

function parseShippingAddress(raw: string): ShippingAddressJson | null {
  try {
    return JSON.parse(raw) as ShippingAddressJson;
  } catch {
    return null;
  }
}

function normalizeStateAbbr(state: string | undefined) {
  const s = (state ?? "").trim().toUpperCase();
  if (s.length === 2) return s;
  return s.slice(0, 2) || "SP";
}

function isAutoCheckoutEnabled() {
  const raw = process.env.MELHOR_ENVIO_AUTO_CHECKOUT?.trim().toLowerCase();
  return raw !== "false" && raw !== "0" && raw !== "no";
}

function getSenderParty(): { party: MelhorEnvioParty } | { error: string } {
  const postal_code = onlyDigits(
    process.env.SHIPPING_ORIGIN_POSTAL_CODE ?? "",
    8,
  );
  const name = process.env.MELHOR_ENVIO_SENDER_NAME?.trim();
  const email =
    process.env.MELHOR_ENVIO_SENDER_EMAIL?.trim() ||
    process.env.MELHOR_ENVIO_CONTACT_EMAIL?.trim();
  const phone = onlyDigits(process.env.MELHOR_ENVIO_SENDER_PHONE ?? "", 11);
  const documentRaw = onlyDigits(process.env.MELHOR_ENVIO_SENDER_DOCUMENT ?? "", 11);
  const companyRaw = onlyDigits(
    process.env.MELHOR_ENVIO_SENDER_COMPANY_DOCUMENT ?? "",
    14,
  );
  const document = isValidCpf(documentRaw) ? documentRaw : "";
  const company_document = isValidCnpj(companyRaw) ? companyRaw : "";
  const address = process.env.MELHOR_ENVIO_SENDER_STREET?.trim();
  const number = process.env.MELHOR_ENVIO_SENDER_NUMBER?.trim() || "S/N";
  const district = process.env.MELHOR_ENVIO_SENDER_DISTRICT?.trim();
  const city = process.env.MELHOR_ENVIO_SENDER_CITY?.trim();
  const state_abbr = normalizeStateAbbr(
    process.env.MELHOR_ENVIO_SENDER_STATE_ABBR,
  );

  if (postal_code.length !== 8) {
    return { error: "SHIPPING_ORIGIN_POSTAL_CODE invalido (8 digitos)." };
  }
  if (!name || !email || phone.length < 10) {
    return {
      error:
        "Configure MELHOR_ENVIO_SENDER_NAME, MELHOR_ENVIO_SENDER_EMAIL e MELHOR_ENVIO_SENDER_PHONE no .env.",
    };
  }
  if (!address || !district || !city) {
    return {
      error:
        "Configure endereco do remetente (MELHOR_ENVIO_SENDER_STREET, DISTRICT, CITY) no .env.",
    };
  }
  if (!document && !company_document) {
    const hasCnpjAttempt = companyRaw.length > 0;
    const hasCpfAttempt = documentRaw.length > 0;
    return {
      error: hasCnpjAttempt && !hasCpfAttempt
        ? "MELHOR_ENVIO_SENDER_COMPANY_DOCUMENT invalido (CNPJ com digitos verificadores incorretos). Use o CNPJ cadastrado no Melhor Envio ou MELHOR_ENVIO_SENDER_DOCUMENT com CPF da conta."
        : "Informe MELHOR_ENVIO_SENDER_DOCUMENT (CPF) ou MELHOR_ENVIO_SENDER_COMPANY_DOCUMENT (CNPJ valido).",
    };
  }

  const party: MelhorEnvioParty = {
    name,
    email,
    phone,
    document: company_document ? "" : document,
    state_register: "ISENTO",
    address,
    complement: process.env.MELHOR_ENVIO_SENDER_COMPLEMENT?.trim() || "",
    number,
    district,
    city,
    postal_code,
    state_abbr,
  };

  if (company_document) {
    party.company_document = company_document;
  }

  return { party };
}

function buildRecipientParty(
  order: Order,
  address: ShippingAddressJson,
): { party: MelhorEnvioParty } | { error: string } {
  const postal_code = onlyDigits(address.cep ?? "", 8);
  const phone = onlyDigits(order.customerPhone || address.phone || "", 11);
  const document = onlyDigits(order.customerCpf || address.cpf || "", 11);

  if (postal_code.length !== 8) {
    return { error: "CEP do destinatario invalido no pedido." };
  }
  if (!address.street?.trim() || !address.city?.trim()) {
    return { error: "Endereco de entrega incompleto no pedido." };
  }
  if (phone.length < 10) {
    return { error: "Telefone do destinatario invalido." };
  }
  if (document.length !== 11) {
    return { error: "CPF do destinatario invalido no pedido." };
  }

  return {
    party: {
      name: address.recipientName?.trim() || order.customerName,
      email: order.customerEmail,
      phone,
      document,
      state_register: "ISENTO",
      address: address.street.trim(),
      complement: address.complement?.trim() || "",
      number: address.number?.trim() || "S/N",
      district: address.neighborhood?.trim() || "Centro",
      city: address.city.trim(),
      postal_code,
      state_abbr: normalizeStateAbbr(address.state),
      country_id: "BR",
    },
  };
}

function resolveServiceId(order: Order): number | null {
  const raw =
    order.melhorEnvioServiceId?.trim() || order.shippingCode?.trim() || "";
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function buildProductsFromItems(items: OrderItem[]) {
  return items.map((item) => ({
    name: item.productName.slice(0, 80),
    quantity: String(item.quantity),
    unitary_value: String(
      Math.max(0, Math.round(item.unitPriceInCents) / 100),
    ),
  }));
}

async function buildVolumes(prisma: DbClient, items: OrderItem[]) {
  const productIds = [...new Set(items.map((item) => item.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: {
      id: true,
      packageWidthCm: true,
      packageHeightCm: true,
      packageLengthCm: true,
      packageWeightKg: true,
    },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const units = items.map((item) => {
    const pkg = resolvePackageDims(byId.get(item.productId));
    return { ...pkg, quantity: item.quantity };
  });

  return [aggregatePackageVolume(units)];
}

function insuranceValueReais(items: OrderItem[]) {
  const totalCents = items.reduce(
    (sum, item) =>
      sum +
      (item.lineTotalInCents > 0
        ? item.lineTotalInCents
        : item.unitPriceInCents * item.quantity),
    0,
  );
  return Math.max(1, Math.round(totalCents) / 100);
}

async function melhorEnvioFetch<T>(
  path: string,
  init: Omit<RequestInit, "body"> & { body?: Record<string, unknown> },
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  const token = process.env.MELHOR_ENVIO_TOKEN?.trim();
  if (!token) {
    return { ok: false, status: 0, error: "MELHOR_ENVIO_TOKEN ausente." };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);

  try {
    const res = await fetch(`${melhorEnvioBaseUrl()}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "User-Agent": getMelhorEnvioUserAgent(),
        ...(init.headers ?? {}),
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });

    const text = await res.text();
    let parsed: unknown = null;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
    }

    if (!res.ok) {
      const message =
        typeof parsed === "object" &&
        parsed &&
        "message" in parsed &&
        typeof (parsed as { message: unknown }).message === "string"
          ? (parsed as { message: string }).message
          : typeof parsed === "object" &&
              parsed &&
              "error" in parsed &&
              typeof (parsed as { error: unknown }).error === "string"
            ? (parsed as { error: string }).error
            : text.slice(0, 500) || `HTTP ${res.status}`;
      return { ok: false, status: res.status, error: message };
    }

    return { ok: true, data: parsed as T };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha na requisicao Melhor Envio.";
    return { ok: false, status: 0, error: message };
  } finally {
    clearTimeout(timeout);
  }
}

function extractShipmentId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const id = (payload as { id?: unknown }).id;
  return typeof id === "string" && id.trim() ? id.trim() : null;
}

async function insertMelhorEnvioCart(body: Record<string, unknown>) {
  return melhorEnvioFetch<unknown>("/api/v2/me/cart", {
    method: "POST",
    body,
  });
}

async function checkoutMelhorEnvioShipments(shipmentIds: string[]) {
  return melhorEnvioFetch<unknown>("/api/v2/me/shipment/checkout", {
    method: "POST",
    body: { orders: shipmentIds },
  });
}

async function recordMelhorEnvioEvent(
  prisma: DbClient,
  order: Order,
  type: string,
  message: string,
  metadata: Record<string, unknown>,
) {
  await prisma.checkoutEvent
    .create({
      data: {
        orderId: order.id,
        userId: order.userId,
        type,
        message,
        metadata: JSON.stringify(metadata),
      },
    })
    .catch(() => null);
}

export async function syncMelhorEnvioForPaidOrder(
  prisma: DbClient,
  orderInput: Order & { items: OrderItem[] },
): Promise<MelhorEnvioSyncResult> {
  if (orderInput.fulfillmentType !== "SHIP") {
    return { ok: false, skipped: true, reason: "Pedido e retirada na loja." };
  }

  if (!isMelhorEnvioConfigured()) {
    return { ok: false, skipped: true, reason: "Melhor Envio nao configurado." };
  }

  const service = resolveServiceId(orderInput);
  if (!service) {
    return {
      ok: false,
      skipped: true,
      reason: "Pedido sem servico Melhor Envio (frete fallback ou antigo).",
    };
  }

  if (orderInput.melhorEnvioStatus === "PURCHASED" && orderInput.melhorEnvioShipmentId) {
    return {
      ok: true,
      shipmentId: orderInput.melhorEnvioShipmentId,
      status: "PURCHASED",
      purchased: true,
    };
  }

  const address = parseShippingAddress(orderInput.shippingAddress);
  if (!address) {
    return { ok: false, skipped: false, error: "Endereco de entrega invalido (JSON)." };
  }

  const sender = getSenderParty();
  if ("error" in sender) {
    return { ok: false, skipped: false, error: sender.error };
  }

  const recipient = buildRecipientParty(orderInput, address);
  if ("error" in recipient) {
    return { ok: false, skipped: false, error: recipient.error };
  }

  let shipmentId = orderInput.melhorEnvioShipmentId?.trim() || null;

  if (!shipmentId) {
    const cartBody = {
      service,
      from: sender.party,
      to: recipient.party,
      products: buildProductsFromItems(orderInput.items),
      volumes: await buildVolumes(prisma, orderInput.items),
      options: {
        platform: "Stock Center Variedades",
        reminder: `Pedido ${orderInput.id}`,
        insurance_value: insuranceValueReais(orderInput.items),
        receipt: false,
        own_hand: false,
        reverse: false,
      },
    };

    const inserted = await insertMelhorEnvioCart(cartBody);
    if (!inserted.ok) {
      const hint =
        inserted.status === 401 || inserted.status === 403
          ? `${inserted.error} Verifique se o token ME tem permissao de carrinho/compra de envios (nao so cotacao) e se MELHOR_ENVIO_USE_SANDBOX corresponde ao token (producao = false).`
          : inserted.error;
      await prisma.order.update({
        where: { id: orderInput.id },
        data: {
          melhorEnvioStatus: "FAILED",
          melhorEnvioError: hint,
        },
      });
      await recordMelhorEnvioEvent(prisma, orderInput, "MELHOR_ENVIO_CART_FAILED", inserted.error, {
        service,
        status: inserted.status,
      });
      return { ok: false, skipped: false, error: hint };
    }

    shipmentId = extractShipmentId(inserted.data);
    if (!shipmentId) {
      const err = "Melhor Envio nao retornou id da etiqueta.";
      await prisma.order.update({
        where: { id: orderInput.id },
        data: { melhorEnvioStatus: "FAILED", melhorEnvioError: err },
      });
      return { ok: false, skipped: false, error: err };
    }

    await prisma.order.update({
      where: { id: orderInput.id },
      data: {
        melhorEnvioShipmentId: shipmentId,
        melhorEnvioServiceId: String(service),
        melhorEnvioStatus: "CART",
        melhorEnvioError: null,
      },
    });

    await recordMelhorEnvioEvent(prisma, orderInput, "MELHOR_ENVIO_CART_OK", "Etiqueta inserida no carrinho Melhor Envio.", {
      melhorEnvioShipmentId: shipmentId,
      service,
    });
  }

  if (!isAutoCheckoutEnabled()) {
    return { ok: true, shipmentId, status: "CART", purchased: false };
  }

  const checkout = await checkoutMelhorEnvioShipments([shipmentId]);
  if (!checkout.ok) {
    await prisma.order.update({
      where: { id: orderInput.id },
      data: {
        melhorEnvioStatus: "CART",
        melhorEnvioError: checkout.error,
      },
    });
    await recordMelhorEnvioEvent(prisma, orderInput, "MELHOR_ENVIO_CHECKOUT_FAILED", checkout.error, {
      melhorEnvioShipmentId: shipmentId,
      status: checkout.status,
    });
    return {
      ok: false,
      skipped: false,
      error: `${checkout.error} (etiqueta no carrinho ME: ${shipmentId})`,
    };
  }

  await prisma.order.update({
    where: { id: orderInput.id },
    data: {
      melhorEnvioStatus: "PURCHASED",
      melhorEnvioError: null,
    },
  });

  await recordMelhorEnvioEvent(
    prisma,
    orderInput,
    "MELHOR_ENVIO_PURCHASED",
    "Frete comprado no Melhor Envio (carteira ME).",
    { melhorEnvioShipmentId: shipmentId },
  );

  return { ok: true, shipmentId, status: "PURCHASED", purchased: true };
}

/** Carrega pedido completo e sincroniza com Melhor Envio. */
export async function syncMelhorEnvioForOrderId(
  prisma: DbClient,
  orderId: string,
): Promise<MelhorEnvioSyncResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    return { ok: false, skipped: false, error: "Pedido nao encontrado." };
  }

  if (!["PAID", "PROCESSING", "SHIPPED", "DELIVERED"].includes(order.status)) {
    return {
      ok: false,
      skipped: true,
      reason: "Pedido ainda nao esta pago.",
    };
  }

  return syncMelhorEnvioForPaidOrder(prisma, order);
}
