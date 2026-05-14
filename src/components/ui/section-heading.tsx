type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description: string;
  align?: "left" | "center";
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
}: SectionHeadingProps) {
  const alignment =
    align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl";

  return (
    <div className={alignment}>
      <p className="inline-flex border-b border-[var(--color-primary)] pb-1 text-sm font-black uppercase tracking-[0.22em] text-[var(--color-primary)]">
        {eyebrow}
      </p>
      <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-current sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-7 text-current/70">
        {description}
      </p>
    </div>
  );
}
