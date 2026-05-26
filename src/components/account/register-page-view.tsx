"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useEffect, useState, useTransition } from "react";
import {
  formatCepDisplay,
  onlyDigits,
  sanitizeAddressNumber,
  sanitizeUf,
} from "@/lib/br-fields";
import { PageHighlight } from "@/components/ui/page-highlight";

const inputClass =
  "w-full rounded-2xl border border-[var(--color-line)] px-4 py-3 text-base outline-none focus:border-[var(--color-primary)]";
const labelClass = "text-sm font-semibold text-[var(--color-muted)]";

type CepApiResponse = {
  cepDigits?: string;
  state?: string;
  city?: string;
  street?: string;
  neighborhood?: string;
  error?: string;
};

export function RegisterPageView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("next") || "/conta";
  const prefillEmail = searchParams.get("email") || "";
  const [isPending, startTransition] = useTransition();
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState<string | null>(null);

  const [address, setAddress] = useState({
    cep: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
  });
  const [cepStatus, setCepStatus] = useState<"idle" | "loading" | "ok" | "error">(
    "idle",
  );
  const [cepMessage, setCepMessage] = useState<string | null>(null);

  const cepDigits = onlyDigits(address.cep, 8);

  useEffect(() => {
    if (cepDigits.length !== 8) {
      setCepStatus("idle");
      setCepMessage(null);
      return;
    }

    const ac = new AbortController();
    const t = window.setTimeout(async () => {
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
      window.clearTimeout(t);
      ac.abort();
    };
  }, [cepDigits]);

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
      <PageHighlight
        as="section"
        eyebrow="Novo cliente"
        title="Crie sua conta para finalizar o checkout."
        description="Em menos de um minuto voce cria sua conta e segue para concluir o pedido com seguranca."
        className="h-full"
      />

      <form
        className="rounded-[2.5rem] border border-[var(--color-line)] bg-white p-6 sm:p-8"
        onSubmit={(event) => {
          event.preventDefault();
          setRegisterError(null);
          setRegisterSuccess(null);
          const formData = new FormData(event.currentTarget);

          startTransition(async () => {
            const response = await fetch("/api/auth/register", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: String(formData.get("name") || ""),
                email: String(formData.get("registerEmail") || "").trim(),
                phone: String(formData.get("phone") || ""),
                password: String(formData.get("registerPassword") || ""),
                delivery: {
                  cep: cepDigits,
                  street: address.street.trim(),
                  number: address.number,
                  complement: address.complement.trim() || null,
                  neighborhood: address.neighborhood.trim(),
                  city: address.city.trim(),
                  state: sanitizeUf(address.state),
                },
              }),
            });

            const payload = (await response.json()) as { error?: string };

            if (!response.ok) {
              setRegisterError(payload.error || "Nao foi possivel criar a conta.");
              return;
            }

            setRegisterSuccess("Conta criada. Entrando automaticamente...");
            const result = await signIn("credentials", {
              email: String(formData.get("registerEmail") || ""),
              password: String(formData.get("registerPassword") || ""),
              redirect: false,
            });

            if (result?.error) {
              setRegisterSuccess("Conta criada com sucesso. Agora faca login.");
              return;
            }

            router.push(callbackUrl);
            router.refresh();
          });
        }}
      >
        <h2 className="font-display text-2xl font-bold text-[var(--color-ink)]">
          Criar conta
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 sm:col-span-2">
            <span className={labelClass}>Nome completo</span>
            <input
              id="register-name"
              name="name"
              autoComplete="name"
              placeholder="Nome completo"
              className={inputClass}
            />
          </label>
          <label className="grid gap-1.5 sm:col-span-2">
            <span className={labelClass}>E-mail</span>
            <input
              id="register-email"
              name="registerEmail"
              type="email"
              autoComplete="email"
              placeholder="Seu e-mail"
              defaultValue={prefillEmail}
              className={inputClass}
            />
          </label>
          <label className="grid gap-1.5">
            <span className={labelClass}>Telefone</span>
            <input
              id="register-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="Telefone"
              className={inputClass}
            />
          </label>
          <label className="grid gap-1.5">
            <span className={labelClass}>Senha</span>
            <input
              id="register-password"
              name="registerPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Crie uma senha"
              className={inputClass}
            />
          </label>

          <div className="sm:col-span-2 mt-2 border-t border-[var(--color-line)] pt-6">
            <h3 className="font-display text-lg font-bold text-[var(--color-ink)]">
              Endereco favorito (entrega)
            </h3>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              Usado para agilizar o checkout. Consultamos o CEP na Brasil API (como no
              pedido).
            </p>
          </div>

          <label className="grid gap-1.5 sm:col-span-2">
            <span className={labelClass}>CEP</span>
            <input
              id="register-cep"
              inputMode="numeric"
              autoComplete="postal-code"
              value={formatCepDisplay(address.cep)}
              onChange={(e) =>
                setAddress((a) => ({
                  ...a,
                  cep: onlyDigits(e.target.value, 8),
                }))
              }
              className={inputClass}
              placeholder="00000-000"
            />
            {cepMessage ? (
              <span
                className={
                  cepStatus === "error"
                    ? "text-sm font-medium text-[var(--color-primary)]"
                    : cepStatus === "ok"
                      ? "text-sm text-[var(--color-success)]"
                      : "text-sm text-[var(--color-muted)]"
                }
              >
                {cepMessage}
              </span>
            ) : null}
          </label>

          <label className="grid gap-1.5 sm:col-span-2">
            <span className={labelClass}>Logradouro</span>
            <input
              id="register-street"
              value={address.street}
              onChange={(e) =>
                setAddress((a) => ({ ...a, street: e.target.value }))
              }
              autoComplete="street-address"
              className={inputClass}
              placeholder="Rua, avenida..."
            />
          </label>

          <label className="grid gap-1.5">
            <span className={labelClass}>Numero</span>
            <input
              id="register-number"
              value={address.number}
              onChange={(e) =>
                setAddress((a) => ({
                  ...a,
                  number: sanitizeAddressNumber(e.target.value),
                }))
              }
              autoComplete="address-line2"
              className={inputClass}
              placeholder="Nº ou S/N"
            />
          </label>

          <label className="grid gap-1.5">
            <span className={labelClass}>Complemento (opcional)</span>
            <input
              id="register-complement"
              value={address.complement}
              onChange={(e) =>
                setAddress((a) => ({ ...a, complement: e.target.value }))
              }
              autoComplete="off"
              className={inputClass}
              placeholder="Apto, bloco..."
            />
          </label>

          <label className="grid gap-1.5 sm:col-span-2">
            <span className={labelClass}>Bairro</span>
            <input
              id="register-neighborhood"
              value={address.neighborhood}
              onChange={(e) =>
                setAddress((a) => ({ ...a, neighborhood: e.target.value }))
              }
              className={inputClass}
              placeholder="Bairro"
            />
          </label>

          <label className="grid gap-1.5">
            <span className={labelClass}>Cidade</span>
            <input
              id="register-city"
              value={address.city}
              onChange={(e) =>
                setAddress((a) => ({ ...a, city: e.target.value }))
              }
              autoComplete="address-level2"
              className={inputClass}
              placeholder="Cidade"
            />
          </label>

          <label className="grid gap-1.5">
            <span className={labelClass}>UF</span>
            <input
              id="register-uf"
              value={address.state}
              onChange={(e) =>
                setAddress((a) => ({
                  ...a,
                  state: sanitizeUf(e.target.value),
                }))
              }
              autoComplete="address-level1"
              maxLength={2}
              className={inputClass}
              placeholder="SP"
            />
          </label>
        </div>
        {registerError ? (
          <p className="mt-4 text-sm font-medium text-[var(--color-primary)]">
            {registerError}
          </p>
        ) : null}
        {registerSuccess ? (
          <p className="mt-4 text-sm font-medium text-[var(--color-success)]">
            {registerSuccess}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={isPending}
          className="mt-6 inline-flex w-full items-center justify-center rounded-full border border-[var(--color-line)] px-6 py-4 text-sm font-bold text-[var(--color-ink)] disabled:opacity-70"
        >
          {isPending ? "Criando conta..." : "Criar conta"}
        </button>
        <div className="mt-6 text-sm text-[var(--color-muted)]">
          Ja tem conta?{" "}
          <Link
            href={`/login?next=${encodeURIComponent(callbackUrl)}`}
            className="font-semibold text-[var(--color-primary)]"
          >
            Entrar
          </Link>
        </div>
      </form>
    </div>
  );
}
