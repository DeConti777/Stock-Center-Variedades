function initialLetter(name: string | null | undefined, email: string | null | undefined) {
  const s = (name?.trim() || email?.trim() || "?").charAt(0);
  return s.toUpperCase();
}

const sizeClasses = {
  sm: "h-8 w-8 min-h-[2rem] min-w-[2rem] shrink-0 text-sm font-black",
  md: "h-14 w-14 min-h-[3.5rem] min-w-[3.5rem] shrink-0 text-xl font-black",
  lg: "h-24 w-24 min-h-[6rem] min-w-[6rem] shrink-0 text-4xl font-black sm:h-28 sm:w-28 sm:min-h-[7rem] sm:min-w-[7rem] sm:text-4xl",
} as const;

export function UserAvatar({
  profileImage,
  name,
  email,
  size,
  className = "",
}: {
  profileImage?: string | null;
  name?: string | null;
  email?: string | null;
  size: keyof typeof sizeClasses;
  /** Extra classes on outer circle (border, shadow). */
  className?: string;
}) {
  const letter = initialLetter(name, email);
  const box = sizeClasses[size];

  if (profileImage) {
    return (
      <span
        className={`relative inline-block overflow-hidden rounded-full bg-[var(--color-soft)] ${box} ${className}`}
      >
        {/* img evita falhas do next/image com uploads dinamicos em /uploads */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={profileImage}
          alt=""
          className="h-full w-full object-cover object-center"
          decoding="async"
        />
      </span>
    );
  }

  return (
    <span
      className={`relative inline-flex items-center justify-center rounded-full bg-[var(--color-soft)] font-display text-[var(--color-ink)] ${box} ${className}`}
    >
      {letter}
    </span>
  );
}
