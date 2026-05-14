type PageLoadingProps = {
  label?: string;
};

export function PageLoading({ label = "Carregando..." }: PageLoadingProps) {
  return (
    <div className="flex min-h-[45vh] w-full items-center justify-center px-4 py-16">
      <div className="flex flex-col items-center gap-5">
        <div
          className="h-11 w-11 animate-spin rounded-full border-2 border-[var(--color-line)] border-t-[var(--color-primary)]"
          role="status"
          aria-label={label}
        />
        <p className="text-sm font-semibold text-[var(--color-muted)]">{label}</p>
      </div>
    </div>
  );
}
