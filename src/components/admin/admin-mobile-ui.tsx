"use client";

import type { ReactNode } from "react";

type IconProps = { className?: string };

function BaseIcon({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {children}
    </svg>
  );
}

export function IconEdit({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
    </BaseIcon>
  );
}

export function IconTrash({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </BaseIcon>
  );
}

export function IconRefresh({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <path d="M20 11a8 8 0 1 0 2.3 5.7" />
      <path d="M20 4v7h-7" />
    </BaseIcon>
  );
}

export function IconSave({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <path d="M5 3h11l3 3v15H5z" />
      <path d="M8 3v6h8V3" />
      <path d="M9 21v-6h6v6" />
    </BaseIcon>
  );
}

export function IconChevronDown({ className }: IconProps) {
  return (
    <BaseIcon className={className}>
      <path d="m6 9 6 6 6-6" />
    </BaseIcon>
  );
}

export function adminActionButtonClass({
  tone = "neutral",
  compact = false,
}: {
  tone?: "neutral" | "primary" | "danger";
  compact?: boolean;
}) {
  const base =
    "touch-target-mobile inline-flex items-center justify-center gap-2 rounded-full border text-sm font-semibold transition disabled:opacity-50";
  const size = compact ? "px-3 py-2 text-xs" : "px-4 py-2";
  const toneClass =
    tone === "primary"
      ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
      : tone === "danger"
        ? "border-red-500 bg-red-500 text-white"
        : "border-[var(--color-line)] bg-white text-[var(--color-ink)] hover:bg-[var(--color-surface)]";
  return `${base} ${size} ${toneClass}`;
}
