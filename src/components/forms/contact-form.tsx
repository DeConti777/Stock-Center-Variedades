"use client";

import { useState } from "react";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/leads/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone: phone || undefined,
          message,
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error || "Nao foi possivel enviar. Tente de novo.");
        setStatus("err");
        return;
      }
      setStatus("ok");
      setName("");
      setEmail("");
      setPhone("");
      setMessage("");
    } catch {
      setError("Erro de conexao. Verifique sua internet.");
      setStatus("err");
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-[2rem] border border-[var(--color-line)] bg-white p-6"
    >
      <h2 className="font-display text-2xl font-bold text-[var(--color-ink)]">
        Envie sua mensagem
      </h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm font-semibold text-[var(--color-ink)]">
          Nome
          <input
            name="name"
            required
            minLength={2}
            value={name}
            onChange={(ev) => setName(ev.target.value)}
            placeholder="Nome"
            autoComplete="name"
            className="rounded-2xl border border-[var(--color-line)] px-4 py-3 font-normal outline-none focus:border-[var(--color-primary)]"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold text-[var(--color-ink)]">
          E-mail
          <input
            name="email"
            type="email"
            required
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            placeholder="E-mail"
            autoComplete="email"
            className="rounded-2xl border border-[var(--color-line)] px-4 py-3 font-normal outline-none focus:border-[var(--color-primary)]"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold text-[var(--color-ink)] sm:col-span-2">
          Telefone (opcional)
          <input
            name="phone"
            value={phone}
            onChange={(ev) => setPhone(ev.target.value)}
            placeholder="Telefone"
            autoComplete="tel"
            className="rounded-2xl border border-[var(--color-line)] px-4 py-3 font-normal outline-none focus:border-[var(--color-primary)]"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold text-[var(--color-ink)] sm:col-span-2">
          Mensagem
          <textarea
            name="message"
            required
            minLength={10}
            value={message}
            onChange={(ev) => setMessage(ev.target.value)}
            placeholder="Como podemos ajudar?"
            className="min-h-40 rounded-2xl border border-[var(--color-line)] px-4 py-3 font-normal outline-none focus:border-[var(--color-primary)]"
          />
        </label>
      </div>
      {status === "ok" ? (
        <p className="mt-6 text-sm font-semibold text-[var(--color-success)]" role="status">
          Mensagem enviada com sucesso. Retornaremos em breve.
        </p>
      ) : null}
      {error ? (
        <p className="mt-6 text-sm font-semibold text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={status === "loading"}
        className="mt-6 inline-flex rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-bold text-white disabled:opacity-60"
      >
        {status === "loading" ? "Enviando..." : "Enviar mensagem"}
      </button>
    </form>
  );
}
