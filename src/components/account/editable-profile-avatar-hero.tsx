"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { readApiJson } from "@/lib/read-api-json";
import { UserAvatar } from "@/components/ui/user-avatar";

function IconPencil({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

type Props = {
  profileImage: string | null;
  customerName: string;
  customerEmail: string;
};

export function EditableProfileAvatarHero({
  profileImage,
  customerName,
  customerEmail,
}: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/store/profile/avatar", {
        method: "POST",
        body,
      });
      const data = await readApiJson<{ profileImage?: string; error?: string }>(res);
      if (!res.ok) {
        throw new Error(data.error || "Falha no envio.");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao enviar.");
    } finally {
      setBusy(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  function openPicker() {
    inputRef.current?.click();
  }

  return (
    <div className="flex shrink-0 flex-col items-start gap-2">
      <div className="group relative inline-flex shrink-0">
        <UserAvatar
          profileImage={profileImage}
          name={customerName}
          email={customerEmail}
          size="lg"
          className="border-2 border-[var(--color-line)] shadow-[0_12px_36px_rgba(15,23,42,0.08)]"
        />

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          tabIndex={-1}
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void uploadFile(file);
          }}
        />

        {/* Mobile / touch: lapís sempre visível no canto */}
        <button
          type="button"
          aria-label="Alterar foto do perfil"
          title="Alterar foto"
          disabled={busy}
          onClick={openPicker}
          className="absolute bottom-0 right-0 z-[2] flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white text-[var(--color-primary)] shadow-[0_6px_18px_rgba(0,0,0,0.18)] ring-2 ring-white/90 md:hidden"
        >
          <IconPencil className="h-4 w-4" />
        </button>

        {/* Desktop: overlay + lapís ao passar o mouse */}
        <button
          type="button"
          aria-label="Alterar foto do perfil"
          title="Alterar foto"
          disabled={busy}
          onClick={openPicker}
          className="absolute inset-0 z-[1] hidden cursor-pointer items-center justify-center rounded-full opacity-0 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto group-hover:opacity-100 group-hover:bg-black/40 focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:bg-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 md:flex disabled:pointer-events-none disabled:opacity-0"
        >
          <span
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[var(--color-primary)] shadow-[0_8px_24px_rgba(0,0,0,0.2)] ring-1 ring-black/10"
            aria-hidden
          >
            <IconPencil className="h-5 w-5" />
          </span>
        </button>

        {busy ? (
          <div
            className="absolute inset-0 z-[3] flex items-center justify-center rounded-full bg-black/35 backdrop-blur-[1px]"
            aria-busy="true"
            aria-live="polite"
          >
            <span className="text-[11px] font-black uppercase tracking-[0.12em] text-white">
              Enviando...
            </span>
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="max-w-[12rem] text-xs font-semibold leading-snug text-red-600">{error}</p>
      ) : null}
    </div>
  );
}
