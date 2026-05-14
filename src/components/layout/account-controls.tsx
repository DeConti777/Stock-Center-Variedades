"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { UserAccountMenu } from "@/components/layout/user-account-menu";
import type { UserRole } from "@/lib/types";

export function AccountControls({
  viewer,
}: {
  viewer:
    | {
        id: string;
        name?: string | null;
        email?: string | null;
        role: UserRole;
        profileImage?: string | null;
      }
    | null;
}) {
  if (!viewer) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/favoritos"
          className="hidden rounded-full border border-[rgba(243,210,107,0.28)] px-4 py-2 text-sm font-semibold text-[rgba(255,255,255,0.82)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] lg:inline-flex"
        >
          Favoritos
        </Link>
        <Link
          href="/login"
          className="inline-flex items-center rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-black text-[var(--color-ink)] shadow-[var(--shadow-gold)]"
        >
          Entrar
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <UserAccountMenu viewer={viewer} />
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/" })}
        className="inline-flex items-center rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-black text-[var(--color-ink)] shadow-[var(--shadow-gold)]"
      >
        Sair
      </button>
    </div>
  );
}
