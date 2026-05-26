"use client";

import { useEffect, useState } from "react";
import {
  adminActionButtonClass,
  IconSave,
  IconTrash,
} from "@/components/admin/admin-mobile-ui";

type Coupon = {
  id: string;
  code: string;
  type: string;
  valuePercent: number | null;
  valueInCents: number | null;
  maxUses: number | null;
  usedCount: number;
  minSubtotalInCents: number;
  expiresAt: string | null;
  active: boolean;
};

async function fetchCoupons() {
  const response = await fetch("/api/admin/coupons");

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || "Erro ao carregar cupons.");
  }

  const payload = (await response.json()) as { coupons: Coupon[] };
  return payload.coupons || [];
}

function couponValue(coupon: Coupon) {
  if (coupon.type === "FIXED") {
    return `R$ ${((coupon.valueInCents || 0) / 100).toFixed(2)}`;
  }

  return `${coupon.valuePercent || 0}%`;
}

export function AdminCouponsManager({ embedded = false }: { embedded?: boolean }) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: "",
    type: "PERCENT",
    value: "10",
    maxUses: "",
    minSubtotal: "0",
    expiresAt: "",
    active: true,
  });

  async function loadCoupons() {
    setLoading(true);
    setMessage(null);
    try {
      setCoupons(await fetchCoupons());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao carregar cupons.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCoupons();
  }, []);

  async function createCoupon() {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code,
          type: form.type,
          value: Number(form.value),
          maxUses: form.maxUses ? Number(form.maxUses) : null,
          minSubtotalInCents: Math.round(Number(form.minSubtotal || 0) * 100),
          expiresAt: form.expiresAt || null,
          active: form.active,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "Falha ao criar cupom.");
      }

      setForm({
        code: "",
        type: "PERCENT",
        value: "10",
        maxUses: "",
        minSubtotal: "0",
        expiresAt: "",
        active: true,
      });
      setMessage("Cupom criado com sucesso.");
      await loadCoupons();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao criar cupom.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleCoupon(coupon: Coupon) {
    setSaving(true);
    setMessage(null);

    try {
      const value =
        coupon.type === "FIXED"
          ? (coupon.valueInCents || 0) / 100
          : coupon.valuePercent || 0;
      const response = await fetch("/api/admin/coupons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: coupon.id,
          active: !coupon.active,
          type: coupon.type,
          value,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Falha ao atualizar cupom.");
      }

      await loadCoupons();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao atualizar cupom.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCoupon(couponId: string) {
    if (!window.confirm("Excluir este cupom?")) {
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/coupons", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: couponId }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Falha ao excluir cupom.");
      }

      await loadCoupons();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao excluir cupom.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {!embedded ? (
        <div>
          <h2 className="font-display text-2xl font-bold text-[var(--color-ink)]">
            Cupons
          </h2>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Crie cupons percentuais ou de valor fixo com validade, limite de uso e pedido minimo.
          </p>
        </div>
      ) : null}

      {message ? (
        <div className="rounded-3xl bg-[var(--color-soft)] p-4 text-sm text-[var(--color-ink)]">
          {message}
        </div>
      ) : null}

      <div className="grid gap-3 rounded-[1.6rem] bg-[var(--color-soft)] p-4 sm:grid-cols-2 lg:grid-cols-7">
        <input
          value={form.code}
          onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
          placeholder="Codigo"
          className="rounded-2xl border border-[var(--color-line)] px-3 py-2 text-sm"
        />
        <select
          value={form.type}
          onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
          className="rounded-2xl border border-[var(--color-line)] px-3 py-2 text-sm"
        >
          <option value="PERCENT">Percentual</option>
          <option value="FIXED">Valor fixo</option>
        </select>
        <input
          type="number"
          min="0"
          step="0.01"
          value={form.value}
          onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))}
          placeholder={form.type === "FIXED" ? "Valor R$" : "Percentual"}
          className="rounded-2xl border border-[var(--color-line)] px-3 py-2 text-sm"
        />
        <input
          type="number"
          min="1"
          value={form.maxUses}
          onChange={(event) => setForm((current) => ({ ...current, maxUses: event.target.value }))}
          placeholder="Uso max."
          className="rounded-2xl border border-[var(--color-line)] px-3 py-2 text-sm"
        />
        <input
          type="number"
          min="0"
          step="0.01"
          value={form.minSubtotal}
          onChange={(event) => setForm((current) => ({ ...current, minSubtotal: event.target.value }))}
          placeholder="Minimo R$"
          className="rounded-2xl border border-[var(--color-line)] px-3 py-2 text-sm"
        />
        <input
          type="datetime-local"
          value={form.expiresAt}
          onChange={(event) => setForm((current) => ({ ...current, expiresAt: event.target.value }))}
          className="rounded-2xl border border-[var(--color-line)] px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => void createCoupon()}
          disabled={saving}
          className={adminActionButtonClass({ tone: "primary", compact: true })}
        >
          <IconSave className="h-4 w-4" />
          Criar
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--color-muted)]">Carregando cupons...</p>
      ) : (
        <>
        <div className="space-y-3 md:hidden">
          {coupons.map((coupon) => (
            <article key={coupon.id} className="rounded-[1.4rem] border border-[var(--color-line)] bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold text-[var(--color-ink)]">{coupon.code}</p>
                <span className="text-xs font-semibold text-[var(--color-muted)]">
                  {coupon.active ? "Ativo" : "Inativo"}
                </span>
              </div>
              <p className="mt-1 text-sm text-[var(--color-muted)]">Desconto: {couponValue(coupon)}</p>
              <p className="text-sm text-[var(--color-muted)]">
                Uso: {coupon.usedCount}
                {coupon.maxUses ? ` / ${coupon.maxUses}` : ""}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => void toggleCoupon(coupon)}
                  disabled={saving}
                  className={adminActionButtonClass({ compact: true })}
                >
                  {coupon.active ? "Desativar" : "Ativar"}
                </button>
                <button
                  type="button"
                  onClick={() => void deleteCoupon(coupon.id)}
                  disabled={saving}
                  className={adminActionButtonClass({ tone: "danger", compact: true })}
                >
                  <IconTrash className="h-4 w-4" />
                  Excluir
                </button>
              </div>
            </article>
          ))}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full divide-y divide-[var(--color-line)] text-left text-sm">
            <thead>
              <tr>
                <th className="px-4 py-3 font-semibold text-[var(--color-ink)]">Codigo</th>
                <th className="px-4 py-3 font-semibold text-[var(--color-ink)]">Desconto</th>
                <th className="px-4 py-3 font-semibold text-[var(--color-ink)]">Uso</th>
                <th className="px-4 py-3 font-semibold text-[var(--color-ink)]">Status</th>
                <th className="px-4 py-3 font-semibold text-[var(--color-ink)]">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-line)]">
              {coupons.map((coupon) => (
                <tr key={coupon.id}>
                  <td className="px-4 py-3 font-bold text-[var(--color-ink)]">{coupon.code}</td>
                  <td className="px-4 py-3">{couponValue(coupon)}</td>
                  <td className="px-4 py-3">
                    {coupon.usedCount}
                    {coupon.maxUses ? ` / ${coupon.maxUses}` : ""}
                  </td>
                  <td className="px-4 py-3">{coupon.active ? "Ativo" : "Inativo"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void toggleCoupon(coupon)}
                        disabled={saving}
                        className={adminActionButtonClass({ compact: true })}
                      >
                        {coupon.active ? "Desativar" : "Ativar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteCoupon(coupon.id)}
                        disabled={saving}
                        className={adminActionButtonClass({ tone: "danger", compact: true })}
                      >
                        <IconTrash className="h-4 w-4" />
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}
