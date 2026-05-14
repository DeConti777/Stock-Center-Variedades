"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  formatCepDisplay,
  formatPhoneBrDisplay,
  onlyDigits,
} from "@/lib/br-fields";
import {
  ProfileDeliveryAddressForm,
  type ProfileDeliveryInitial,
} from "@/components/account/profile-delivery-address-form";
import { readApiJson } from "@/lib/read-api-json";

export type SerializedExtraAddress = {
  id: string;
  cep: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  label: string;
};

const emptyInitial: ProfileDeliveryInitial = {
  cep: null,
  street: null,
  number: null,
  complement: null,
  neighborhood: null,
  city: null,
  state: null,
};

function AddressCard({
  streetLine,
  detailLine,
  typeLabel,
  contactLine,
  onAdditionalInfo,
  onEdit,
  onDelete,
}: {
  streetLine: string;
  detailLine: string;
  typeLabel: string;
  contactLine: string;
  onAdditionalInfo: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="relative rounded-2xl border border-[var(--color-line)] bg-white p-5 shadow-[var(--shadow-soft)]"
    >
      <div className="absolute right-4 top-4">
        <button
          type="button"
          className="rounded-lg p-2 text-[var(--color-muted)] hover:bg-[var(--color-soft)]"
          aria-expanded={open}
          aria-label="Opcoes do endereco"
          onClick={() => setOpen((o) => !o)}
        >
          <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <circle cx="12" cy="6" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="18" r="1.5" />
          </svg>
        </button>
        {open ? (
          <div
            className="absolute right-0 z-20 mt-1 min-w-[10rem] rounded-xl border border-[var(--color-line)] bg-white py-1 shadow-lg"
            role="menu"
          >
            <button
              type="button"
              role="menuitem"
              className="block w-full px-4 py-2.5 text-left text-sm font-semibold text-[var(--color-ink)] hover:bg-[var(--color-soft)]"
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
            >
              Editar
            </button>
            <button
              type="button"
              role="menuitem"
              className="block w-full px-4 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
            >
              Excluir
            </button>
          </div>
        ) : null}
      </div>

      <p className="pr-14 font-bold text-[var(--color-ink)]">{streetLine}</p>
      <p className="mt-1 text-sm text-[var(--color-ink)]">{detailLine}</p>
      <p className="mt-2 text-sm text-[var(--color-muted)]">{typeLabel}</p>
      <p className="mt-1 text-sm text-[var(--color-muted)]">{contactLine}</p>

      <button
        type="button"
        onClick={onAdditionalInfo}
        className="mt-4 text-left text-sm font-semibold text-sky-600 hover:underline"
      >
        Incluir informações adicionais →
      </button>
    </div>
  );
}

export function AccountAddressesView({
  primaryInitial,
  hasPrimarySaved,
  extras,
  customerName,
  phoneDigits,
}: {
  primaryInitial: ProfileDeliveryInitial;
  hasPrimarySaved: boolean;
  extras: SerializedExtraAddress[];
  customerName: string;
  phoneDigits: string;
}) {
  const router = useRouter();
  const [editPrimaryOpen, setEditPrimaryOpen] = useState(!hasPrimarySaved);
  const [extraPanel, setExtraPanel] = useState<"closed" | "new" | string>("closed");

  const phoneDisplay =
    phoneDigits.length >= 10 ? formatPhoneBrDisplay(phoneDigits) : phoneDigits || "—";

  function scrollTo(id: string) {
    window.requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function primaryStreetLine(u: ProfileDeliveryInitial) {
    const s = (u.street ?? "").trim();
    const n = (u.number ?? "").trim();
    return [s, n].filter(Boolean).join(" ").trim() || "Endereco";
  }

  function primaryDetailLine(u: ProfileDeliveryInitial) {
    const cep = formatCepDisplay(onlyDigits(u.cep ?? "", 8));
    const city = (u.city ?? "").trim();
    const st = (u.state ?? "").trim();
    return `CEP ${cep} — ${city} — ${st}`;
  }

  async function deletePrimary() {
    if (!window.confirm("Remover o endereco favorito salvo?")) return;
    try {
      const res = await fetch("/api/store/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ savedDelivery: null }),
      });
      const data = await readApiJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Erro ao remover.");
      setEditPrimaryOpen(true);
      router.refresh();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Erro ao remover.");
    }
  }

  async function deleteExtra(id: string) {
    if (!window.confirm("Remover este endereco?")) return;
    try {
      const res = await fetch(`/api/store/profile/extra-addresses/${id}`, { method: "DELETE" });
      const data = await readApiJson<{ error?: string }>(res);
      if (!res.ok) throw new Error(data.error || "Erro ao remover.");
      if (extraPanel === id) setExtraPanel("closed");
      router.refresh();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Erro ao remover.");
    }
  }

  const editingExtraInitial =
    extraPanel !== "closed" && extraPanel !== "new"
      ? extras.find((x) => x.id === extraPanel)
      : null;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {hasPrimarySaved ? (
          <AddressCard
            streetLine={primaryStreetLine(primaryInitial)}
            detailLine={primaryDetailLine(primaryInitial)}
            typeLabel="Endereco residencial"
            contactLine={`${customerName.trim() || "Cliente"} — ${phoneDisplay}`}
            onAdditionalInfo={() => {
              setEditPrimaryOpen(true);
              scrollTo("formulario-endereco");
              window.requestAnimationFrame(() =>
                document.getElementById("profile-complement")?.focus(),
              );
            }}
            onEdit={() => {
              setEditPrimaryOpen(true);
              scrollTo("formulario-endereco");
            }}
            onDelete={() => void deletePrimary()}
          />
        ) : (
          <p className="text-sm text-[var(--color-muted)]">
            Voce ainda nao cadastrou um endereco favorito para o checkout.
          </p>
        )}

        {extras.map((ex) => (
          <AddressCard
            key={ex.id}
            streetLine={`${ex.street.trim()} ${ex.number.trim()}`.trim()}
            detailLine={`CEP ${formatCepDisplay(onlyDigits(ex.cep, 8))} — ${ex.city.trim()} — ${ex.state.trim()}`}
            typeLabel={ex.label || "Endereco residencial"}
            contactLine={`${customerName.trim() || "Cliente"} — ${phoneDisplay}`}
            onAdditionalInfo={() => {
              setExtraPanel(ex.id);
              scrollTo("novo-endereco");
              window.requestAnimationFrame(() =>
                document.getElementById(`extra-${ex.id}-complement`)?.focus(),
              );
            }}
            onEdit={() => {
              setExtraPanel(ex.id);
              scrollTo("novo-endereco");
            }}
            onDelete={() => void deleteExtra(ex.id)}
          />
        ))}
      </div>

      <button
        type="button"
        className="w-full rounded-xl border border-sky-200/80 bg-sky-100 py-3.5 text-center text-sm font-bold text-sky-900 transition hover:bg-sky-200/70"
        onClick={() => {
          setExtraPanel("new");
          scrollTo("novo-endereco");
        }}
      >
        + Adicionar novo endereço
      </button>

      {editPrimaryOpen ? (
        <div
          id="formulario-endereco"
          className="scroll-mt-28 rounded-[2rem] border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-soft)] sm:p-8"
        >
          <p className="font-display text-lg font-bold text-[var(--color-ink)]">
            {hasPrimarySaved ? "Editar endereco favorito" : "Cadastrar endereco favorito"}
          </p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Usado no checkout como endereco padrao de entrega.
          </p>
          <ProfileDeliveryAddressForm
            initial={primaryInitial}
            variant="primary"
            fieldIdPrefix="profile"
            onSaved={() => setEditPrimaryOpen(true)}
          />
        </div>
      ) : null}

      {extraPanel !== "closed" ? (
        <div
          id="novo-endereco"
          className="scroll-mt-28 rounded-[2rem] border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-soft)] sm:p-8"
        >
          <p className="font-display text-lg font-bold text-[var(--color-ink)]">
            {extraPanel === "new" ? "Novo endereco" : "Editar endereco"}
          </p>
          <ProfileDeliveryAddressForm
            key={extraPanel === "new" ? "new" : extraPanel}
            initial={
              editingExtraInitial
                ? {
                    cep: editingExtraInitial.cep,
                    street: editingExtraInitial.street,
                    number: editingExtraInitial.number,
                    complement: editingExtraInitial.complement,
                    neighborhood: editingExtraInitial.neighborhood,
                    city: editingExtraInitial.city,
                    state: editingExtraInitial.state,
                  }
                : emptyInitial
            }
            variant="extra"
            extraId={extraPanel === "new" ? null : extraPanel}
            fieldIdPrefix={extraPanel === "new" ? "extra-new" : `extra-${extraPanel}`}
            onCancel={() => setExtraPanel("closed")}
            onSaved={() => setExtraPanel("closed")}
          />
        </div>
      ) : null}
    </div>
  );
}
