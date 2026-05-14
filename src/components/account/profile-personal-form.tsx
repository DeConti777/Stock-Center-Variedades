"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import {
  formatCpfDisplay,
  formatPhoneBrDisplay,
  onlyDigits,
} from "@/lib/br-fields";
import { readApiJson } from "@/lib/read-api-json";

type Props = {
  customerName: string;
  customerEmail: string;
  phone: string | null;
  cpf: string | null;
};

export function ProfilePersonalForm({
  customerName,
  customerEmail,
  phone,
  cpf,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState(customerName);
  const [phoneDigits, setPhoneDigits] = useState(() => onlyDigits(phone ?? ""));
  const [cpfDigits, setCpfDigits] = useState(() => onlyDigits(cpf ?? "", 11));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(customerName);
    setPhoneDigits(onlyDigits(phone ?? ""));
    setCpfDigits(onlyDigits(cpf ?? "", 11));
  }, [customerName, phone, cpf]);

  useEffect(() => {
    if (!saved) return;
    const t = window.setTimeout(() => setSaved(false), 3500);
    return () => window.clearTimeout(t);
  }, [saved]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/store/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phoneDigits,
          cpf: cpfDigits,
        }),
      });
      const data = await readApiJson<{ error?: string }>(res);
      if (!res.ok) {
        throw new Error(data.error || "Nao foi possivel salvar.");
      }
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(ev) => void onSubmit(ev)} className="mt-4 space-y-5">
      <div>
        <label className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]" htmlFor="profile-name">
          Nome completo
        </label>
        <input
          id="profile-name"
          name="name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
          maxLength={120}
          className="mt-2 w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm font-semibold text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]"
        />
      </div>

      <div>
        <label className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]" htmlFor="profile-email">
          E-mail
        </label>
        <input
          id="profile-email"
          type="email"
          value={customerEmail}
          readOnly
          disabled
          className="mt-2 w-full cursor-not-allowed rounded-2xl border border-[var(--color-line)] bg-[var(--color-soft)] px-4 py-3 text-sm font-semibold text-[var(--color-muted)] opacity-90"
          title="O e-mail nao pode ser alterado aqui."
        />
        <p className="mt-1.5 text-xs text-[var(--color-muted)]">
          O e-mail do login nao pode ser alterado por aqui.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]" htmlFor="profile-phone">
            Telefone (opcional)
          </label>
          <input
            id="profile-phone"
            name="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            value={formatPhoneBrDisplay(phoneDigits)}
            onChange={(e) => setPhoneDigits(onlyDigits(e.target.value, 11))}
            placeholder="(11) 99999-9999"
            className="mt-2 w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm font-semibold text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]"
          />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]" htmlFor="profile-cpf">
            CPF (opcional)
          </label>
          <input
            id="profile-cpf"
            name="cpf"
            inputMode="numeric"
            autoComplete="off"
            value={formatCpfDisplay(cpfDigits)}
            onChange={(e) => setCpfDigits(onlyDigits(e.target.value, 11))}
            placeholder="000.000.000-00"
            className="mt-2 w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm font-semibold text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]"
          />
        </div>
      </div>

      {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
      {saved ? (
        <p className="text-sm font-semibold text-[var(--color-success)]">Dados salvos com sucesso.</p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center justify-center rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-bold text-white disabled:opacity-60"
      >
        {busy ? "Salvando..." : "Salvar alteracoes"}
      </button>
    </form>
  );
}
