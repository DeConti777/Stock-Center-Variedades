import Link from "next/link";
import type { ReactNode } from "react";
import { onlyDigits } from "@/lib/br-fields";

/** True quando telefone ou CPF ainda não estão preenchidos de forma válida para o checkout. */
export function profileNeedsAttention(phone: string | null, cpf: string | null): boolean {
  const phoneDigits = onlyDigits(phone ?? "");
  const cpfDigits = onlyDigits(cpf ?? "", 11);
  const phoneOk = phoneDigits.length >= 10;
  const cpfOk = cpfDigits.length === 11;
  return !phoneOk || !cpfOk;
}

export function IconProfileCard(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={22}
      height={22}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
      {...props}
    >
      <rect x="3.5" y="5" width="17" height="14" rx="2" strokeLinejoin="round" />
      <circle cx="12" cy="11" r="2.25" />
      <path d="M8 16.5c.8-1.6 2.2-2.5 4-2.5s3.2.9 4 2.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconMapPin(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={22}
      height={22}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
      {...props}
    >
      <path
        d="M12 21s7-4.35 7-10a7 7 0 10-14 0c0 5.65 7 10 7 10z"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="11" r="2.25" />
    </svg>
  );
}

function IconChevronRight(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden {...props}>
      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AccountMenuRow({
  href,
  label,
  icon,
  badge,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  badge?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label={badge ? `${label} — há informações pendentes` : undefined}
      className="group flex min-h-[3.25rem] items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-[var(--color-soft)] focus-visible:bg-[var(--color-soft)] sm:gap-4 sm:px-3"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center text-[var(--color-ink)]">{icon}</span>
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <span className="text-base font-medium text-[var(--color-ink)]">{label}</span>
        {badge ? (
          <span
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500 text-xs font-black text-white shadow-sm"
            aria-hidden
          >
            !
          </span>
        ) : null}
      </span>
      <span className="shrink-0 text-[var(--color-muted)]">
        <IconChevronRight />
      </span>
    </Link>
  );
}
