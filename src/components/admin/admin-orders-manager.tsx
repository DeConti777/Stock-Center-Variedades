"use client";

import { useEffect, useState } from "react";
import { getOrderStatusLabel } from "@/lib/order-status";
import {
  canAdminChooseShippingDispatch,
  isMelhorEnvioDispatchAllowed,
  type ShippingDispatchMode,
} from "@/lib/shipping-dispatch";
import {
  adminActionButtonClass,
  IconRefresh,
  IconSave,
} from "@/components/admin/admin-mobile-ui";

type AdminOrder = {
  id: string;
  status: string;
  totalInCents: number;
  shippingInCents: number;
  fulfillmentType: string;
  pickupCode?: string | null;
  customerName: string;
  customerEmail: string;
  shippingCode?: string;
  shippingCarrier?: string;
  shippingDispatchMode: string;
  melhorEnvioServiceId?: string | null;
  melhorEnvioShipmentId?: string | null;
  melhorEnvioStatus?: string | null;
  melhorEnvioError?: string | null;
  trackingUrl?: string;
  invoiceUrl?: string;
  createdAt: string;
  items: {
    productName: string;
    quantity: number;
    unitPriceInCents: number;
  }[];
};

type OrderDraft = {
  status: string;
  shippingDispatchMode: ShippingDispatchMode;
  shippingCode: string;
  shippingCarrier: string;
  trackingUrl: string;
  invoiceUrl: string;
};

const dispatchModeLabels: Record<ShippingDispatchMode, string> = {
  PENDING: "Aguardando decisao",
  MELHOR_ENVIO: "Melhor Envio",
  OWN_DELIVERY: "Entrega propria (van)",
};

const statusOptions = [
  "PENDING_PAYMENT",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "FAILED",
  "REQUIRES_REVIEW",
  "CANCELED",
];

function buildDraft(order: AdminOrder): OrderDraft {
  const mode = order.shippingDispatchMode;
  const shippingDispatchMode: ShippingDispatchMode =
    mode === "MELHOR_ENVIO" || mode === "OWN_DELIVERY" || mode === "PENDING"
      ? mode
      : "PENDING";
  return {
    status: order.status,
    shippingDispatchMode,
    shippingCode: order.shippingCode || "",
    shippingCarrier: order.shippingCarrier || "",
    trackingUrl: order.trackingUrl || "",
    invoiceUrl: order.invoiceUrl || "",
  };
}

function isDraftDirty(order: AdminOrder, draft: OrderDraft) {
  const original = buildDraft(order);
  return (
    draft.status !== original.status ||
    draft.shippingDispatchMode !== original.shippingDispatchMode ||
    draft.shippingCode !== original.shippingCode ||
    draft.shippingCarrier !== original.shippingCarrier ||
    draft.trackingUrl !== original.trackingUrl ||
    draft.invoiceUrl !== original.invoiceUrl
  );
}

async function fetchOrders() {
  const response = await fetch("/api/admin/orders");

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || "Erro ao carregar pedidos.");
  }

  const payload = (await response.json()) as { orders: AdminOrder[] };
  return payload.orders || [];
}

export function AdminOrdersManager({ embedded = false }: { embedded?: boolean }) {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [drafts, setDrafts] = useState<Record<string, OrderDraft>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [melhorEnvioId, setMelhorEnvioId] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [sectionCollapsed, setSectionCollapsed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function loadOrders() {
    setLoading(true);
    setMessage(null);
    try {
      const nextOrders = await fetchOrders();
      setOrders(nextOrders);
      setDrafts(
        nextOrders.reduce((acc: Record<string, OrderDraft>, order) => {
          acc[order.id] = buildDraft(order);
          return acc;
        }, {}),
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao carregar pedidos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrders();
  }, []);

  async function syncMelhorEnvio(orderId: string) {
    setMelhorEnvioId(orderId);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/melhor-envio`, {
        method: "POST",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          payload?.error || payload?.reason || "Falha ao enviar para Melhor Envio.",
        );
      }
      setMessage(payload?.message || "Melhor Envio atualizado.");
      await loadOrders();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Erro ao sincronizar Melhor Envio.",
      );
    } finally {
      setMelhorEnvioId(null);
    }
  }

  async function saveOrder(orderId: string) {
    const draft = drafts[orderId];
    if (!draft) return;

    setSavingId(orderId);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: orderId, ...draft }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "Falha ao atualizar pedido.");
      }

      setMessage("Pedido atualizado e notificacao disparada quando aplicavel.");
      await loadOrders();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao atualizar pedido.");
    } finally {
      setSavingId(null);
    }
  }

  async function saveAllDirty() {
    const dirtyIds = orders.filter((o) => {
      const d = drafts[o.id];
      return d && isDraftDirty(o, d);
    });

    if (dirtyIds.length === 0) {
      setMessage("Nenhuma alteracao pendente para salvar.");
      return;
    }

    setSavingAll(true);
    setMessage(null);
    const failed: string[] = [];

    for (const order of dirtyIds) {
      const draft = drafts[order.id];
      if (!draft) continue;
      try {
        const response = await fetch("/api/admin/orders", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: order.id, ...draft }),
        });
        await response.json().catch(() => null);
        if (!response.ok) {
          failed.push(order.id.slice(0, 8));
        }
      } catch {
        failed.push(order.id.slice(0, 8));
      }
    }

    setSavingAll(false);

    if (failed.length > 0) {
      setMessage(
        `${dirtyIds.length - failed.length} pedido(s) salvos. Falha em: ${failed.join(", ")}.`,
      );
    } else {
      setMessage(
        `${dirtyIds.length} pedido(s) atualizado(s). Notificacoes enviadas quando aplicavel.`,
      );
    }

    await loadOrders();
  }

  if (loading) {
    return <p className="text-sm text-[var(--color-muted)]">Carregando pedidos...</p>;
  }

  const dirtyCount = orders.filter((o) => {
    const d = drafts[o.id];
    return d && isDraftDirty(o, d);
  }).length;

  const isCollapsed = embedded ? false : sectionCollapsed;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {!embedded ? (
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-2xl font-bold text-[var(--color-ink)]">
              Gestao de pedidos
            </h2>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              Atualize status, codigo de rastreio e links fiscais; emails sao enviados nas mudancas de status.
            </p>
            {isCollapsed ? (
              <p className="mt-2 text-xs font-semibold text-[var(--color-primary)]">
                {orders.length} pedido(s) na lista
                {dirtyCount > 0 ? ` · ${dirtyCount} com alteracoes nao salvas` : ""}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="min-w-0 flex-1" />
        )}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
          {!embedded ? (
            <button
              type="button"
              onClick={() => setSectionCollapsed((c) => !c)}
              className="touch-target-mobile rounded-full border border-[var(--color-line)] px-5 py-2 text-sm font-bold text-[var(--color-ink)] hover:bg-[var(--color-surface)]"
              aria-expanded={!sectionCollapsed}
            >
              {sectionCollapsed ? "Expandir" : "Minimizar"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void saveAllDirty()}
            disabled={savingAll || savingId !== null || loading}
            className={`${adminActionButtonClass({ tone: "primary", compact: true })} col-span-2 sm:col-span-1`}
          >
            <IconSave className="h-4 w-4" />
            {savingAll ? "Salvando todos..." : "Salvar todas alteracoes"}
          </button>
          <button
            type="button"
            onClick={() => void loadOrders()}
            disabled={savingAll || savingId !== null}
            className={adminActionButtonClass({ compact: true })}
          >
            <IconRefresh className="h-4 w-4" />
            Atualizar
          </button>
        </div>
      </div>

      {message ? (
        <div className="rounded-3xl bg-[var(--color-soft)] p-4 text-sm text-[var(--color-ink)]">
          {message}
        </div>
      ) : null}

      {!isCollapsed ? (
      <>
      <div className="space-y-4 md:hidden">
        {orders.map((order) => {
          const draft = drafts[order.id] || buildDraft(order);
          return (
            <article
              key={order.id}
              className="rounded-[1.5rem] border border-[var(--color-line)] bg-[var(--color-surface)] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[var(--color-ink)]">{order.id.slice(0, 8)}</p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">
                    {new Date(order.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                  {order.fulfillmentType === "PICKUP" ? (
                    <p className="mt-2 inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-[0.7rem] font-bold uppercase tracking-wide text-emerald-900">
                      Retirar na loja
                    </p>
                  ) : null}
                  {order.pickupCode ? (
                    <p className="mt-1 font-mono text-xs font-bold text-[var(--color-ink)]">
                      Codigo: {order.pickupCode}
                    </p>
                  ) : null}
                </div>
                <p className="text-sm font-bold text-[var(--color-ink)]">
                  R$ {(order.totalInCents / 100).toFixed(2)}
                </p>
              </div>
              <p className="mt-3 text-sm font-medium text-[var(--color-ink)]">{order.customerName}</p>
              <p className="text-xs text-[var(--color-muted)]">{order.customerEmail}</p>
              <select
                value={draft.status}
                disabled={savingAll}
                onChange={(event) =>
                  setDrafts((current) => ({
                    ...current,
                    [order.id]: { ...draft, status: event.target.value },
                  }))
                }
                className="mt-3 w-full rounded-2xl border border-[var(--color-line)] bg-white px-3 py-2 text-sm disabled:opacity-50"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {getOrderStatusLabel(status)}
                  </option>
                ))}
              </select>
              {order.fulfillmentType === "SHIP" ? (
                <div className="mt-3 rounded-2xl border border-[var(--color-line)] bg-white/80 px-3 py-2 text-xs text-[var(--color-muted)]">
                  {canAdminChooseShippingDispatch(order.status, order.fulfillmentType) ? (
                    <label className="block">
                      <span className="font-semibold text-[var(--color-ink)]">
                        Modo de despacho
                      </span>
                      <select
                        value={draft.shippingDispatchMode}
                        disabled={savingAll}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [order.id]: {
                              ...draft,
                              shippingDispatchMode: event.target
                                .value as ShippingDispatchMode,
                              ...(event.target.value === "OWN_DELIVERY" &&
                              !draft.shippingCarrier.trim()
                                ? { shippingCarrier: "Entrega propria" }
                                : {}),
                            },
                          }))
                        }
                        className="mt-1 w-full rounded-2xl border border-[var(--color-line)] bg-white px-2 py-2 text-xs text-[var(--color-ink)] disabled:opacity-50"
                      >
                        {(Object.keys(dispatchModeLabels) as ShippingDispatchMode[]).map(
                          (mode) => (
                            <option key={mode} value={mode}>
                              {dispatchModeLabels[mode]}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                  ) : (
                    <p>
                      Despacho:{" "}
                      <span className="font-semibold text-[var(--color-ink)]">
                        {dispatchModeLabels[
                          draft.shippingDispatchMode as ShippingDispatchMode
                        ] || draft.shippingDispatchMode}
                      </span>
                    </p>
                  )}
                  {isMelhorEnvioDispatchAllowed(draft.shippingDispatchMode) ? (
                    <>
                      <p className="mt-2">
                        ME:{" "}
                        <span className="font-semibold text-[var(--color-ink)]">
                          {order.melhorEnvioStatus || "—"}
                        </span>
                      </p>
                      {order.melhorEnvioShipmentId ? (
                        <p className="mt-1 font-mono text-[0.65rem]">
                          {order.melhorEnvioShipmentId.slice(0, 12)}…
                        </p>
                      ) : null}
                      {order.melhorEnvioError ? (
                        <p className="mt-1 text-red-600">{order.melhorEnvioError}</p>
                      ) : null}
                    </>
                  ) : draft.shippingDispatchMode === "OWN_DELIVERY" ? (
                    <p className="mt-2 text-[var(--color-ink)]">
                      Entrega pela van — preencha rastreio abaixo se necessario.
                    </p>
                  ) : null}
                  {canAdminChooseShippingDispatch(order.status, order.fulfillmentType) &&
                  isMelhorEnvioDispatchAllowed(draft.shippingDispatchMode) &&
                  order.melhorEnvioStatus !== "PURCHASED" ? (
                    <button
                      type="button"
                      onClick={() => void syncMelhorEnvio(order.id)}
                      disabled={melhorEnvioId === order.id || savingAll}
                      className={`${adminActionButtonClass({ compact: true })} mt-2 w-full`}
                    >
                      {melhorEnvioId === order.id ? "Enviando..." : "Enviar ao Melhor Envio"}
                    </button>
                  ) : null}
                </div>
              ) : null}
              <div className="mt-3 grid gap-2">
                <input
                  value={draft.shippingCarrier}
                  disabled={savingAll}
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [order.id]: { ...draft, shippingCarrier: event.target.value },
                    }))
                  }
                  placeholder="Transportadora"
                  className="rounded-2xl border border-[var(--color-line)] px-3 py-2 text-sm disabled:opacity-50"
                />
                <input
                  value={draft.shippingCode}
                  disabled={savingAll}
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [order.id]: { ...draft, shippingCode: event.target.value },
                    }))
                  }
                  placeholder="Codigo de rastreio"
                  className="rounded-2xl border border-[var(--color-line)] px-3 py-2 text-sm disabled:opacity-50"
                />
              </div>
              <button
                type="button"
                onClick={() => void saveOrder(order.id)}
                disabled={savingId === order.id || savingAll}
                className={`${adminActionButtonClass({ tone: "primary", compact: true })} mt-3 w-full`}
              >
                <IconSave className="h-4 w-4" />
                {savingId === order.id ? "Salvando..." : "Salvar"}
              </button>
            </article>
          );
        })}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-[980px] divide-y divide-[var(--color-line)] text-left text-sm">
          <thead>
            <tr>
              <th className="px-4 py-3 font-semibold text-[var(--color-ink)]">Pedido</th>
              <th className="px-4 py-3 font-semibold text-[var(--color-ink)]">Cliente</th>
              <th className="px-4 py-3 font-semibold text-[var(--color-ink)]">Total</th>
              <th className="px-4 py-3 font-semibold text-[var(--color-ink)]">Status</th>
              <th className="px-4 py-3 font-semibold text-[var(--color-ink)]">Rastreamento</th>
              <th className="px-4 py-3 font-semibold text-[var(--color-ink)]">Acoes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-line)]">
            {orders.map((order) => {
              const draft = drafts[order.id] || buildDraft(order);

              return (
                <tr key={order.id} className="align-top">
                  <td className="px-4 py-4">
                    <p className="font-semibold text-[var(--color-ink)]">
                      {order.id.slice(0, 8)}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                      {new Date(order.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                    {order.fulfillmentType === "PICKUP" ? (
                      <p className="mt-2 inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-emerald-900">
                        Retirar na loja
                      </p>
                    ) : null}
                    {order.pickupCode ? (
                      <p className="mt-1 font-mono text-xs font-bold text-[var(--color-ink)]">
                        Codigo: {order.pickupCode}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-medium text-[var(--color-ink)]">
                      {order.customerName}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                      {order.customerEmail}
                    </p>
                    <p className="mt-2 text-xs text-[var(--color-muted)]">
                      {order.items.map((item) => `${item.productName} x${item.quantity}`).join(", ")}
                    </p>
                  </td>
                  <td className="px-4 py-4 font-bold text-[var(--color-ink)]">
                    R$ {(order.totalInCents / 100).toFixed(2)}
                  </td>
                  <td className="px-4 py-4">
                    <select
                      value={draft.status}
                      disabled={savingAll}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [order.id]: { ...draft, status: event.target.value },
                        }))
                      }
                      className="w-44 rounded-2xl border border-[var(--color-line)] bg-white px-3 py-2 disabled:opacity-50"
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {getOrderStatusLabel(status)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-4">
                    <div className="grid min-w-[260px] gap-2">
                      {order.fulfillmentType === "SHIP" ? (
                        <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-muted)]">
                          {canAdminChooseShippingDispatch(
                            order.status,
                            order.fulfillmentType,
                          ) ? (
                            <label className="block">
                              <span className="font-semibold text-[var(--color-ink)]">
                                Modo de despacho
                              </span>
                              <select
                                value={draft.shippingDispatchMode}
                                disabled={savingAll}
                                onChange={(event) =>
                                  setDrafts((current) => ({
                                    ...current,
                                    [order.id]: {
                                      ...draft,
                                      shippingDispatchMode: event.target
                                        .value as ShippingDispatchMode,
                                      ...(event.target.value === "OWN_DELIVERY" &&
                                      !draft.shippingCarrier.trim()
                                        ? { shippingCarrier: "Entrega propria" }
                                        : {}),
                                    },
                                  }))
                                }
                                className="mt-1 w-full rounded-2xl border border-[var(--color-line)] bg-white px-2 py-1.5 text-xs"
                              >
                                {(
                                  Object.keys(dispatchModeLabels) as ShippingDispatchMode[]
                                ).map((mode) => (
                                  <option key={mode} value={mode}>
                                    {dispatchModeLabels[mode]}
                                  </option>
                                ))}
                              </select>
                            </label>
                          ) : (
                            <p>
                              Despacho:{" "}
                              <span className="font-semibold text-[var(--color-ink)]">
                                {dispatchModeLabels[
                                  draft.shippingDispatchMode as ShippingDispatchMode
                                ] || draft.shippingDispatchMode}
                              </span>
                            </p>
                          )}
                          {isMelhorEnvioDispatchAllowed(draft.shippingDispatchMode) ? (
                            <>
                              <p className="mt-2">
                                Melhor Envio:{" "}
                                <span className="font-semibold text-[var(--color-ink)]">
                                  {order.melhorEnvioStatus || "nao enviado"}
                                </span>
                                {order.melhorEnvioServiceId
                                  ? ` · servico ${order.melhorEnvioServiceId}`
                                  : ""}
                              </p>
                              {order.melhorEnvioShipmentId ? (
                                <p className="mt-1 font-mono text-[0.65rem] text-[var(--color-ink)]">
                                  ID: {order.melhorEnvioShipmentId}
                                </p>
                              ) : null}
                              {order.melhorEnvioError ? (
                                <p className="mt-1 text-red-600">{order.melhorEnvioError}</p>
                              ) : null}
                            </>
                          ) : null}
                        </div>
                      ) : null}
                      <input
                        value={draft.shippingCarrier}
                        disabled={savingAll}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [order.id]: { ...draft, shippingCarrier: event.target.value },
                          }))
                        }
                        placeholder="Transportadora"
                        className="rounded-2xl border border-[var(--color-line)] px-3 py-2 disabled:opacity-50"
                      />
                      <input
                        value={draft.shippingCode}
                        disabled={savingAll}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [order.id]: { ...draft, shippingCode: event.target.value },
                          }))
                        }
                        placeholder="Codigo de rastreio"
                        className="rounded-2xl border border-[var(--color-line)] px-3 py-2 disabled:opacity-50"
                      />
                      <input
                        value={draft.trackingUrl}
                        disabled={savingAll}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [order.id]: { ...draft, trackingUrl: event.target.value },
                          }))
                        }
                        placeholder="URL de rastreio"
                        className="rounded-2xl border border-[var(--color-line)] px-3 py-2 disabled:opacity-50"
                      />
                      <input
                        value={draft.invoiceUrl}
                        disabled={savingAll}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [order.id]: { ...draft, invoiceUrl: event.target.value },
                          }))
                        }
                        placeholder="URL da nota fiscal"
                        className="rounded-2xl border border-[var(--color-line)] px-3 py-2 disabled:opacity-50"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {order.fulfillmentType === "SHIP" &&
                    canAdminChooseShippingDispatch(order.status, order.fulfillmentType) &&
                    isMelhorEnvioDispatchAllowed(draft.shippingDispatchMode) &&
                    order.melhorEnvioStatus !== "PURCHASED" ? (
                      <button
                        type="button"
                        onClick={() => void syncMelhorEnvio(order.id)}
                        disabled={melhorEnvioId === order.id || savingAll}
                        className={`${adminActionButtonClass({ compact: true })} mb-2 w-full`}
                      >
                        {melhorEnvioId === order.id ? "ME..." : "Melhor Envio"}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void saveOrder(order.id)}
                      disabled={savingId === order.id || savingAll}
                      className={adminActionButtonClass({ tone: "primary", compact: true })}
                    >
                      <IconSave className="h-4 w-4" />
                      {savingId === order.id ? "Salvando..." : "Salvar"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </>
      ) : null}
    </div>
  );
}
