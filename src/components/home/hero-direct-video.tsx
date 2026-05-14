"use client";

import type { MouseEvent } from "react";
import { useCallback, useState } from "react";

function IconVolumeOn({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M11 5 6 9H2v6h4l5 4V5z" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function IconVolumeOff({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M11 5 6 9H2v6h4l5 4V5z" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}

export function HeroDirectVideo({ url }: { url: string }) {
  const [muted, setMuted] = useState(true);

  const toggle = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setMuted((m) => !m);
  }, []);

  return (
    <div className="group absolute inset-0">
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src={url}
        autoPlay
        muted={muted}
        loop
        playsInline
        preload="auto"
        aria-label="Video promocional"
      />
      <button
        type="button"
        onClick={toggle}
        className="absolute right-2 top-2 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(243,210,107,0.5)] bg-black/75 text-[var(--color-accent)] opacity-0 shadow-[0_4px_16px_rgba(0,0,0,0.45)] backdrop-blur-sm transition-opacity duration-200 hover:border-[var(--color-accent)] hover:bg-black/90 hover:text-white focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] group-hover:opacity-100 [@media(hover:none)]:opacity-100"
        aria-label={muted ? "Ativar som do video" : "Silenciar video"}
      >
        {muted ? <IconVolumeOff /> : <IconVolumeOn />}
      </button>
    </div>
  );
}
