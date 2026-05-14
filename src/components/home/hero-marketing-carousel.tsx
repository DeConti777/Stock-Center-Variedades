"use client";

import { useCallback, useEffect, useState } from "react";
import { HeroMarketingMedia } from "@/components/home/hero-marketing-media";

function ChevronLeft({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

const navBtnClass =
  "absolute top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[rgba(243,210,107,0.45)] bg-black/75 text-[var(--color-accent)] shadow-[0_4px_20px_rgba(0,0,0,0.5)] backdrop-blur-sm transition hover:border-[var(--color-accent)] hover:bg-black/90 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]";

export function HeroMarketingCarousel({ urls }: { urls: string[] }) {
  const list = urls.filter(Boolean);
  const [index, setIndex] = useState(0);

  const count = list.length;
  const safeIndex = count > 0 ? Math.min(index, count - 1) : 0;

  useEffect(() => {
    if (count === 0) return;
    setIndex((i) => i % count);
  }, [count]);

  const goPrev = useCallback(() => {
    if (count < 2) return;
    setIndex((i) => (i - 1 + count) % count);
  }, [count]);

  const goNext = useCallback(() => {
    if (count < 2) return;
    setIndex((i) => (i + 1) % count);
  }, [count]);

  useEffect(() => {
    if (count < 2) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [count, goPrev, goNext]);

  if (count === 0) {
    return <HeroMarketingMedia videoUrl={undefined} />;
  }

  const current = list[safeIndex] ?? list[0];

  return (
    <div className="relative h-full w-full">
      {count > 1 ? (
        <>
          <button
            type="button"
            className={`${navBtnClass} left-1 sm:left-2`}
            aria-label="Video anterior"
            onClick={goPrev}
          >
            <ChevronLeft />
          </button>
          <button
            type="button"
            className={`${navBtnClass} right-1 sm:right-2`}
            aria-label="Proximo video"
            onClick={goNext}
          >
            <ChevronRight />
          </button>
        </>
      ) : null}
      <HeroMarketingMedia key={`${safeIndex}-${current}`} videoUrl={current} />
    </div>
  );
}
