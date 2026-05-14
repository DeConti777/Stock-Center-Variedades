"use client";

import { useState } from "react";

type NewsletterFormProps = {
  source?: "home" | "footer" | "other";
};

export function NewsletterForm({ source = "home" }: NewsletterFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [error, setError] = useState<string | null>(null);
  const [already, setAlready] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError(null);
    setAlready(false);
    try {
      const res = await fetch("/api/leads/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      const data = (await res.json().catch(() => null)) as
        | { error?: string; alreadySubscribed?: boolean }
        | null;
      if (!res.ok) {
        setError(data?.error || "Nao foi possivel cadastrar.");
        setStatus("err");
        return;
      }
      if (data?.alreadySubscribed) {
        setAlready(true);
      }
      setStatus("ok");
      setEmail("");
    } catch {
      setError("Erro de conexao. Tente novamente.");
      setStatus("err");
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 grid gap-4 sm:grid-cols-[1fr_auto]">
      <label className="sr-only" htmlFor="newsletter-email">
        E-mail para newsletter
      </label>
      <input
        id="newsletter-email"
        type="email"
        required
        value={email}
        onChange={(ev) => setEmail(ev.target.value)}
        placeholder="Digite seu melhor e-mail"
        autoComplete="email"
        className="h-14 rounded-full border border-[rgba(243,210,107,0.28)] bg-white/5 px-5 text-white outline-none placeholder:text-white/45 focus:border-[var(--color-accent)]"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="h-14 rounded-full bg-[var(--color-accent)] px-7 text-sm font-black text-[var(--color-ink)] shadow-[var(--shadow-gold)] hover:bg-white disabled:opacity-60"
      >
        {status === "loading" ? "..." : "Quero receber ofertas"}
      </button>
      {status === "ok" ? (
        <p
          className="sm:col-span-2 text-sm font-semibold text-[var(--color-accent)]"
          role="status"
        >
          {already
            ? "Este e-mail ja estava cadastrado. Obrigado pelo interesse."
            : "Cadastro realizado. Fique de olho nas promocoes."}
        </p>
      ) : null}
      {error ? (
        <p className="sm:col-span-2 text-sm font-semibold text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
