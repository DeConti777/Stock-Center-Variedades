"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatCurrency } from "@/lib/catalog";
import { PageHighlight } from "@/components/ui/page-highlight";

type PixPaymentState = {
  status: string;
  orderId: string;
  paid: boolean;
  totalFormatted?: string;
  totalInCents?: number;
  customerName?: string;
  expiresAt?: string;
  qrImageUrl?: string;
  copyPasteCode?: string;
};

function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function PixPaymentView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order")?.trim() ?? "";
  const token = searchParams.get("t")?.trim() ?? "";

  const [payload, setPayload] = useState<PixPaymentState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const expiresAtMs = useMemo(() => {
    if (!payload?.expiresAt) return null;
    const ms = new Date(payload.expiresAt).getTime();
    return Number.isFinite(ms) ? ms : null;
  }, [payload?.expiresAt]);

  const remainingMs =
    expiresAtMs != null ? Math.max(0, expiresAtMs - now) : null;

  const fetchPixState = useCallback(async () => {
    if (!orderId || !token) {
      setError("Link de pagamento invalido.");
      setLoading(false);
      return;
    }

    const params = new URLSearchParams({ order: orderId, t: token });
    const response = await fetch(`/api/checkout/pix?${params.toString()}`);
    const data = (await response.json()) as PixPaymentState & { error?: string };

    if (response.status === 410) {
      setError(data.error || "Pagamento expirado.");
      setPayload(null);
      setLoading(false);
      return;
    }

    if (!response.ok) {
      setError(data.error || "Nao foi possivel carregar o pagamento Pix.");
      setPayload(null);
      setLoading(false);
      return;
    }

    if (data.paid) {
      router.replace(`/checkout/sucesso?order_id=${encodeURIComponent(data.orderId)}`);
      return;
    }

    setPayload(data);
    setError(null);
    setLoading(false);
  }, [orderId, token, router]);

  useEffect(() => {
    void fetchPixState();
    const poll = window.setInterval(() => {
      void fetchPixState();
    }, 3000);
    return () => window.clearInterval(poll);
  }, [fetchPixState]);

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    if (remainingMs == null || remainingMs > 0) return;

    async function expireAndRedirect() {
      await fetch("/api/checkout/pix/expire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: orderId, t: token }),
      }).catch(() => null);
      router.replace(
        `/checkout/cancelado?order_id=${encodeURIComponent(orderId)}&reason=expired`,
      );
    }

    void expireAndRedirect();
  }, [remainingMs, orderId, token, router]);

  async function handleCopy() {
    if (!payload?.copyPasteCode) return;
    try {
      await navigator.clipboard.writeText(payload.copyPasteCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  if (!orderId || !token) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="text-[var(--color-muted)]">Link de pagamento invalido.</p>
        <Link
          href="/checkout"
          className="mt-4 inline-block font-semibold text-[var(--color-primary)]"
        >
          Voltar ao checkout
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-10 sm:px-6">
      <PageHighlight
        eyebrow="Pagamento Pix"
        title="Escaneie o QR ou copie o codigo"
        description="Voce tem 10 minutos para concluir o pagamento. A confirmacao e automatica."
      />

      {loading ? (
        <p className="text-center text-sm text-[var(--color-muted)]">
          Gerando pagamento Pix...
        </p>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
          <div className="mt-3">
            <Link href="/checkout" className="font-semibold underline">
              Voltar ao checkout
            </Link>
          </div>
        </div>
      ) : null}

      {payload && !error ? (
        <div className="space-y-5 rounded-2xl border border-[var(--color-line)] bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-[var(--color-muted)]">Total</span>
            <span className="text-lg font-bold text-[var(--color-ink)]">
              {payload.totalFormatted ??
                (payload.totalInCents != null
                  ? formatCurrency(payload.totalInCents / 100)
                  : "—")}
            </span>
          </div>

          {remainingMs != null ? (
            <p className="text-center text-sm font-semibold text-[var(--color-ink)]">
              Tempo restante:{" "}
              <span className="tabular-nums text-[var(--color-primary)]">
                {formatCountdown(remainingMs)}
              </span>
            </p>
          ) : null}

          {payload.qrImageUrl ? (
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={payload.qrImageUrl}
                alt="QR Code Pix"
                width={220}
                height={220}
                className="rounded-xl border border-[var(--color-line)] bg-white p-2"
              />
            </div>
          ) : (
            <p className="text-center text-xs text-[var(--color-muted)]">
              Use o codigo copia e cola abaixo no app do seu banco.
            </p>
          )}

          {payload.copyPasteCode ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                Pix copia e cola
              </p>
              <textarea
                readOnly
                value={payload.copyPasteCode}
                rows={4}
                className="mt-2 w-full resize-none rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-ink)]"
              />
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="mt-2 w-full rounded-full bg-[var(--color-primary)] px-4 py-3 text-sm font-bold text-white"
              >
                {copied ? "Codigo copiado!" : "Copiar codigo Pix"}
              </button>
            </div>
          ) : null}

          <p className="text-center text-xs text-[var(--color-muted)]">
            Apos pagar no app do seu banco, esta pagina atualiza sozinha.
          </p>
        </div>
      ) : null}
    </div>
  );
}
