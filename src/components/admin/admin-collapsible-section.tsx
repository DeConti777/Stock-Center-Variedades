"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { IconChevronDown } from "@/components/admin/admin-mobile-ui";

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
          className="touch-target-mobile inline-flex shrink-0 items-center gap-2 rounded-full border border-[var(--color-line)] px-4 py-2 text-sm font-bold text-[var(--color-ink)] hover:bg-[var(--color-surface)]"
          aria-expanded={!collapsed}
        >
          <IconChevronDown
            className={`h-4 w-4 transition-transform ${collapsed ? "" : "rotate-180"}`}
          />
          {collapsed ? "Expandir" : "Minimizar"}
        </button>
      </div>
      {!collapsed ? children : null}
    </section>
  );
}
