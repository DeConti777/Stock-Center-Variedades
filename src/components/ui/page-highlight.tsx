import type { ReactNode } from "react";

type PageHighlightProps = {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
  as?: "div" | "section" | "header";
};

export function PageHighlight({
  eyebrow,
  title,
  description,
  children,
  className = "",
  as: Tag = "div",
}: PageHighlightProps) {
  return (
    <Tag
      className={`rounded-[2rem] border border-[var(--color-line)] bg-white px-5 py-6 shadow-[var(--shadow-soft)] sm:rounded-[2.5rem] sm:px-10 sm:py-10 ${className}`.trim()}
    >
      {eyebrow ? (
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">
          {eyebrow}
        </p>
      ) : null}
      <h1
        className={`max-w-3xl font-display text-3xl font-black tracking-tight text-[var(--color-ink)] sm:text-5xl ${
          eyebrow ? "mt-3 sm:mt-4" : "mt-0"
        }`}
      >
        {title}
      </h1>
      {description ? (
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-muted)] sm:text-base sm:leading-7">
          {description}
        </p>
      ) : null}
      {children ? <div className="mt-5">{children}</div> : null}
    </Tag>
  );
}
