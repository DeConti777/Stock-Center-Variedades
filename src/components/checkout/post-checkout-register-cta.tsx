import Link from "next/link";

type PostCheckoutRegisterCtaProps = {
  isAuthenticated: boolean;
  nextPath: string;
  email?: string | null;
  label?: string;
  variant?: "primary" | "secondary";
};

export function PostCheckoutRegisterCta({
  isAuthenticated,
  nextPath,
  email,
  label = "Criar conta para acompanhar pedidos",
  variant = "secondary",
}: PostCheckoutRegisterCtaProps) {
  if (isAuthenticated) return null;

  const href = `/criar-conta?next=${encodeURIComponent(nextPath)}${
    email ? `&email=${encodeURIComponent(email)}` : ""
  }`;

  const className =
    variant === "primary"
      ? "inline-flex items-center justify-center rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-bold text-white"
      : "inline-flex items-center justify-center rounded-full border border-[var(--color-line)] px-6 py-3 text-sm font-bold text-[var(--color-ink)]";

  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}
