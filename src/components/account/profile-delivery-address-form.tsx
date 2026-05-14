"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  formatCepDisplay,
  onlyDigits,
  sanitizeAddressNumber,
  sanitizeUf,
} from "@/lib/br-fields";
import { readApiJson } from "@/lib/read-api-json";

type Initial = {
  cep: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
};

export type ProfileDeliveryInitial = Initial;

export type ProfileDeliveryAddressFormProps = {
  initial: Initial;
  variant?: "primary" | "extra";
  /** Required when editing an existing extra address */
  extraId?: string | null;
  /** Prefix for input ids (avoid duplicates when multiple forms mount) */
  fieldIdPrefix?: string;
  onCancel?: () => void;
  onSaved?: () => void;
};

const inputClass =
  "mt-2 w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm font-semibold text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]";

type CepApiResponse = {
  cepDigits?: string;
  state?: string;
  city?: string;
  street?: string;
  neighborhood?: string;
  error?: string;
};

export function ProfileDeliveryAddressForm({
  initial,
  variant = "primary",
  extraId = null,
  fieldIdPrefix = "profile",
  onCancel,
  onSaved,
}: ProfileDeliveryAddressFormProps) {
  const router = useRouter();
  const [address, setAddress] = useState({
    cep: onlyDigits(initial.cep ?? "", 8),
    street: initial.street ?? "",
    number: initial.number ?? "",
    complement: initial.complement ?? "",
    neighborhood: initial.neighborhood ?? "",
    city: initial.city ?? "",
    state: sanitizeUf(initial.state ?? ""),
  });
  const [cepStatus, setCepStatus] = useState<"idle" | "loading" | "ok" | "error">(
    "idle",
  );
  const [cepMessage, setCepMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const initialSnapshot = useMemo(() => JSON.stringify(initial), [
    initial.cep,
    initial.city,
    initial.complement,
    initial.neighborhood,
    initial.number,
    initial.state,
    initial.street,
  ]);

  useEffect(() => {
    const snap = JSON.parse(initialSnapshot) as Initial;
    setAddress({
      cep: onlyDigits(snap.cep ?? "", 8),
      street: snap.street ?? "",
      number: snap.number ?? "",
      complement: snap.complement ?? "",
      neighborhood: snap.neighborhood ?? "",
      city: snap.city ?? "",
      state: sanitizeUf(snap.state ?? ""),
    });
  }, [initialSnapshot]);

  useEffect(() => {
    if (!saved) return;
    const t = window.setTimeout(() => setSaved(false), 3500);
    return () => window.clearTimeout(t);
  }, [saved]);

  const cepDigits = onlyDigits(address.cep, 8);

  useEffect(() => {
    if (cepDigits.length !== 8) {
      setCepStatus("idle");
      setCepMessage(null);
      return;
    }

    const ac = new AbortController();
    const timer = window.setTimeout(async () => {
      setCepStatus("loading");
      setCepMessage("Consultando CEP...");
      try {
        const res = await fetch(`/api/cep?cep=${encodeURIComponent(cepDigits)}`, {
          signal: ac.signal,
        });
        const data = (await res.json()) as CepApiResponse;
        if (!res.ok) {
          setCepStatus("error");
          setCepMessage(data.error || "CEP nao encontrado.");
          return;
        }
        setAddress((prev) => ({
          ...prev,
          cep: cepDigits,
          state: data.state || prev.state,
          city: data.city || prev.city,
          street: data.street || prev.street,
          neighborhood: data.neighborhood || prev.neighborhood,
        }));
        setCepStatus("ok");
        setCepMessage("CEP encontrado. Confira numero e complemento.");
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        setCepStatus("error");
        setCepMessage("Falha ao consultar CEP. Tente novamente.");
      }
    }, 500);

    return () => {
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [cepDigits]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      if (variant === "extra") {
        const payload = {
          cep: cepDigits,
          street: address.street.trim(),
          number: address.number,
          complement: address.complement.trim() || null,
          neighborhood: address.neighborhood.trim(),
          city: address.city.trim(),
          state: address.state,
        };
        const url = extraId
          ? `/api/store/profile/extra-addresses/${extraId}`
          : "/api/store/profile/extra-addresses";
        const method = extraId ? "PATCH" : "POST";
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await readApiJson<{ error?: string }>(res);
        if (!res.ok) {
          throw new Error(data.error || "Nao foi possivel salvar.");
        }
        setSaved(true);
        onSaved?.();
        router.refresh();
        return;
      }

      const res = await fetch("/api/store/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          savedDelivery: {
            cep: cepDigits,
            street: address.street.trim(),
            number: address.number,
            complement: address.complement.trim() || null,
            neighborhood: address.neighborhood.trim(),
            city: address.city.trim(),
            state: address.state,
          },
        }),
      });
      const data = await readApiJson<{ error?: string }>(res);
      if (!res.ok) {
        throw new Error(data.error || "Nao foi possivel salvar.");
      }
      setSaved(true);
      onSaved?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setBusy(false);
    }
  }

  async function onClear() {
    if (variant !== "primary") return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/store/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ savedDelivery: null }),
      });
      const data = await readApiJson<{ error?: string }>(res);
      if (!res.ok) {
        throw new Error(data.error || "Nao foi possivel remover.");
      }
      setAddress({
        cep: "",
        street: "",
        number: "",
        complement: "",
        neighborhood: "",
        city: "",
        state: "",
      });
      setCepStatus("idle");
      setCepMessage(null);
      setSaved(true);
      onSaved?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover.");
    } finally {
      setBusy(false);
    }
  }

  const fid = fieldIdPrefix;

  const hasSaved =
    variant === "primary"
      ? Boolean(initial.cep?.trim()) &&
        Boolean(initial.street?.trim()) &&
        Boolean(initial.number?.trim())
      : Boolean(extraId);

  return (
    <div className="mt-6 space-y-5">
      <form onSubmit={(ev) => void onSubmit(ev)} className="space-y-5">
        <div>
          <label
            className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]"
            htmlFor={`${fid}-cep`}
          >
            CEP
          </label>
          <input
            id={`${fid}-cep`}
            inputMode="numeric"
            autoComplete="postal-code"
            value={formatCepDisplay(address.cep)}
            onChange={(e) =>
              setAddress((a) => ({ ...a, cep: onlyDigits(e.target.value, 8) }))
            }
            className={inputClass}
            placeholder="00000-000"
          />
          {cepMessage ? (
            <p
              className={`mt-1.5 text-xs ${
                cepStatus === "error"
                  ? "font-semibold text-red-600"
                  : cepStatus === "ok"
                    ? "text-[var(--color-success)]"
                    : "text-[var(--color-muted)]"
              }`}
            >
              {cepMessage}
            </p>
          ) : null}
        </div>

        <div>
          <label
            className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]"
            htmlFor={`${fid}-street`}
          >
            Logradouro
          </label>
          <input
            id={`${fid}-street`}
            value={address.street}
            onChange={(e) => setAddress((a) => ({ ...a, street: e.target.value }))}
            autoComplete="street-address"
            className={inputClass}
            placeholder="Rua, avenida..."
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]"
              htmlFor={`${fid}-number`}
            >
              Numero
            </label>
            <input
              id={`${fid}-number`}
              value={address.number}
              onChange={(e) =>
                setAddress((a) => ({
                  ...a,
                  number: sanitizeAddressNumber(e.target.value),
                }))
              }
              className={inputClass}
              placeholder="Nº ou S/N"
            />
          </div>
          <div>
            <label
              className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]"
              htmlFor={`${fid}-complement`}
            >
              Complemento (opcional)
            </label>
            <input
              id={`${fid}-complement`}
              value={address.complement}
              onChange={(e) =>
                setAddress((a) => ({ ...a, complement: e.target.value }))
              }
              className={inputClass}
              placeholder="Apto, bloco..."
            />
          </div>
        </div>

        <div>
          <label
            className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]"
            htmlFor={`${fid}-neighborhood`}
          >
            Bairro
          </label>
          <input
            id={`${fid}-neighborhood`}
            value={address.neighborhood}
            onChange={(e) =>
              setAddress((a) => ({ ...a, neighborhood: e.target.value }))
            }
            className={inputClass}
            placeholder="Bairro"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]"
              htmlFor={`${fid}-city`}
            >
              Cidade
            </label>
            <input
              id={`${fid}-city`}
              value={address.city}
              onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
              autoComplete="address-level2"
              className={inputClass}
              placeholder="Cidade"
            />
          </div>
          <div>
            <label
              className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]"
              htmlFor={`${fid}-uf`}
            >
              UF
            </label>
            <input
              id={`${fid}-uf`}
              value={address.state}
              onChange={(e) =>
                setAddress((a) => ({
                  ...a,
                  state: sanitizeUf(e.target.value),
                }))
              }
              maxLength={2}
              autoComplete="address-level1"
              className={inputClass}
              placeholder="SP"
            />
          </div>
        </div>

        {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
        {saved ? (
          <p className="text-sm font-semibold text-[var(--color-success)]">
            Endereco atualizado.
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center justify-center rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {busy
              ? "Salvando..."
              : variant === "extra"
                ? extraId
                  ? "Salvar alteracoes"
                  : "Salvar endereco"
                : "Salvar endereco favorito"}
          </button>
          {variant === "primary" && hasSaved ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void onClear()}
              className="inline-flex items-center justify-center rounded-full border border-[var(--color-line)] px-6 py-3 text-sm font-bold text-[var(--color-ink)] disabled:opacity-60"
            >
              Remover endereco salvo
            </button>
          ) : null}
          {variant === "extra" && onCancel ? (
            <button
              type="button"
              disabled={busy}
              onClick={onCancel}
              className="inline-flex items-center justify-center rounded-full border border-[var(--color-line)] px-6 py-3 text-sm font-bold text-[var(--color-ink)] disabled:opacity-60"
            >
              Cancelar
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
