"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function ForgotPasswordView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("next") || "/conta";
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [isCodeValidated, setIsCodeValidated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const maxResends = 3;
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  function formatCodeDisplay(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 6);
    if (digits.length <= 3) {
      return digits;
    }
    return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  }

  useEffect(() => {
    if (step !== 2 || resendCountdown <= 0) {
      return;
    }
    const timer = setTimeout(() => {
      setResendCountdown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => clearTimeout(timer);
  }, [step, resendCountdown]);

  async function sendCode(mode: "first" | "resend" = "first") {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error || "Nao foi possivel enviar o codigo.");
        return;
      }
      setStep(2);
      setIsCodeValidated(false);
      setResendCountdown(60);
      if (mode === "resend") {
        setResendCount((current) => current + 1);
      }
      setSuccess(
        mode === "resend"
          ? "Enviamos um novo codigo (se o e-mail existir na base)."
          : "Se o e-mail existir na base, enviamos um codigo de verificacao.",
      );
    } catch {
      setError("Erro de rede. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function resetPassword() {
    if (!isCodeValidated) {
      setError("Valide o codigo antes de criar uma nova senha.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas nao conferem.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, password }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; ok?: boolean }
        | null;
      if (!response.ok || !payload?.ok) {
        setError(payload?.error || "Codigo invalido ou expirado.");
        return;
      }
      setSuccess("Senha redefinida com sucesso. Entrando...");
      router.push(`/login?next=${encodeURIComponent(callbackUrl)}`);
    } catch {
      setError("Erro de rede. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function validateCode() {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/auth/password-reset/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; ok?: boolean }
        | null;
      if (!response.ok || !payload?.ok) {
        setIsCodeValidated(false);
        setError(payload?.error || "Codigo invalido ou expirado.");
        return;
      }
      setIsCodeValidated(true);
      setSuccess("Codigo validado. Agora crie sua nova senha.");
    } catch {
      setError("Erro de rede. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
      <section className="rounded-[2rem] bg-[var(--color-ink)] p-6 text-white sm:rounded-[2.5rem] sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-white/60">
          Recuperacao de acesso
        </p>
        <h1 className="mt-4 font-display text-4xl font-black tracking-tight">
          Esqueceu sua senha?
        </h1>
        <p className="mt-5 text-base leading-8 text-white/75">
          Faca a verificacao em duas etapas: enviamos um codigo para o e-mail
          informado e, depois, voce cria uma nova senha.
        </p>
      </section>

      <div className="rounded-[2.5rem] border border-[var(--color-line)] bg-white p-8">
        <h2 className="font-display text-2xl font-bold text-[var(--color-ink)]">
          {step === 1 ? "Etapa 1: confirmar e-mail" : "Etapa 2: validar codigo"}
        </h2>

        <div className="mt-6 grid gap-4">
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            placeholder="Seu e-mail"
            className="rounded-2xl border border-[var(--color-line)] px-4 py-3 text-sm outline-none"
          />
          {step === 2 ? (
            <>
              <input
                value={formatCodeDisplay(code)}
                onChange={(event) => {
                  setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                  setIsCodeValidated(false);
                }}
                inputMode="numeric"
                placeholder="Codigo de 6 digitos"
                maxLength={7}
                className="rounded-2xl border border-[var(--color-line)] px-4 py-3 text-sm outline-none"
              />
              {isCodeValidated ? (
                <>
                  <div className="relative">
                    <input
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      type={showPassword ? "text" : "password"}
                      placeholder="Nova senha"
                      className="w-full rounded-2xl border border-[var(--color-line)] px-4 py-3 pr-12 text-sm outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[var(--color-muted)] transition-colors hover:bg-[var(--color-soft)] hover:text-[var(--color-ink)]"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        className="text-[var(--color-muted)]"
                        aria-hidden
                      >
                        <path
                          d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                        {showPassword ? null : (
                          <path
                            d="M3 3l18 18"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        )}
                      </svg>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirme a nova senha"
                      className="w-full rounded-2xl border border-[var(--color-line)] px-4 py-3 pr-12 text-sm outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((current) => !current)}
                      aria-label={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
                      className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[var(--color-muted)] transition-colors hover:bg-[var(--color-soft)] hover:text-[var(--color-ink)]"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        className="text-[var(--color-muted)]"
                        aria-hidden
                      >
                        <path
                          d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                        {showConfirmPassword ? null : (
                          <path
                            d="M3 3l18 18"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        )}
                      </svg>
                    </button>
                  </div>
                </>
              ) : null}
            </>
          ) : null}
        </div>

        {error ? <p className="mt-4 text-sm font-medium text-[var(--color-primary)]">{error}</p> : null}
        {success ? <p className="mt-4 text-sm font-medium text-[var(--color-success)]">{success}</p> : null}

        {step === 1 ? (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => void sendCode("first")}
            className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-[var(--color-primary)] px-6 py-4 text-sm font-bold text-white disabled:opacity-70"
          >
            {isSubmitting ? "Enviando codigo..." : "Enviar codigo"}
          </button>
        ) : (
          <>
            {!isCodeValidated ? (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void validateCode()}
                className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-[var(--color-primary)] px-6 py-4 text-sm font-bold text-white disabled:opacity-70"
              >
                {isSubmitting ? "Validando..." : "Validar codigo"}
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void resetPassword()}
                className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-[var(--color-primary)] px-6 py-4 text-sm font-bold text-white disabled:opacity-70"
              >
                {isSubmitting ? "Redefinindo..." : "Redefinir senha"}
              </button>
            )}
          </>
        )}

        {step === 2 ? (
          <div className="mt-3 flex items-center justify-center">
            <button
              type="button"
              disabled={
                isSubmitting || resendCountdown > 0 || resendCount >= maxResends
              }
              onClick={() => void sendCode("resend")}
              className="text-sm font-semibold text-[var(--color-ink)] disabled:opacity-60"
            >
              {resendCount >= maxResends
                ? "Limite de reenvios atingido"
                : resendCountdown > 0
                ? `Reenviar codigo em ${resendCountdown}s`
                : "Reenviar codigo"}
            </button>
          </div>
        ) : null}

        <div className="mt-6 flex items-center justify-between text-sm text-[var(--color-muted)]">
          <Link href={`/login?next=${encodeURIComponent(callbackUrl)}`} className="font-semibold text-[var(--color-primary)]">
            Voltar para entrar
          </Link>
          {step === 2 ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="font-semibold text-[var(--color-ink)]"
            >
              Trocar e-mail
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
