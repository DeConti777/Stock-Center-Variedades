"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "sc-dismiss-profile-security-tip";

export function ProfileSecurityBanner() {
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (dismissed === null || dismissed) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-line)] border-l-4 border-l-[var(--color-accent)] bg-white p-4 shadow-[var(--shadow-soft)] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-gold-soft)] text-lg"
          aria-hidden
        >
          🔒
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-[var(--color-ink)]">Proteja sua conta</p>
          <p className="mt-0.5 text-sm text-[var(--color-muted)]">
            Use uma senha forte e mantenha o acesso ao e-mail cadastrado.
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:pl-2">
        <Link
          href="/esqueci-senha"
          className="inline-flex items-center justify-center rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-bold text-white"
        >
          Alterar senha
        </Link>
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-muted)] hover:bg-[var(--color-soft)]"
          aria-label="Dispensar aviso"
          onClick={() => {
            try {
              localStorage.setItem(STORAGE_KEY, "1");
            } catch {
              /* ignore */
            }
            setDismissed(true);
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
