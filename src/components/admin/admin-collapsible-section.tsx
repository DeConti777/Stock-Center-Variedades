"use client";

import { useState } from "react";
import type { ReactNode } from "react";

type AdminCollapsibleSectionProps = {
  id?: string;
  title: string;
  description?: string;
  defaultCollapsed?: boolean;
  children: ReactNode;
};

export function AdminCollapsibleSection({
  id,
  title,
  description,
  defaultCollapsed = false,
  children,
}: AdminCollapsibleSectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <section
      id={id}
      className="scroll-mt-28 rounded-[2rem] border border-[var(--color-line)] bg-white p-6"
    >
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-2xl font-bold text-[var(--color-ink)]">{title}</h2>
          {description ? (
            <p className="mt-2 text-sm text-[var(--color-muted)]">{description}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((current) => !current)}
          className="touch-target-mobile shrink-0 rounded-full border border-[var(--color-line)] px-5 py-2 text-sm font-bold text-[var(--color-ink)] hover:bg-[var(--color-surface)]"
          aria-expanded={!collapsed}
        >
          {collapsed ? "Expandir" : "Minimizar"}
        </button>
      </div>
      {!collapsed ? children : null}
    </section>
  );
}
