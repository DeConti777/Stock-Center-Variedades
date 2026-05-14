"use client";

const skipClassName =
  "sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[400] focus:m-0 focus:block focus:h-auto focus:w-auto focus:overflow-visible focus:whitespace-normal focus:rounded-lg focus:bg-[var(--color-primary)] focus:px-4 focus:py-3 focus:text-sm focus:font-bold focus:text-white focus:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]";

export function SkipToMainLink() {
  return (
    <a
      href="#main-content"
      className={skipClassName}
      onClick={(e) => {
        const main = document.getElementById("main-content");
        if (!main) return;
        e.preventDefault();
        try {
          window.history.replaceState(null, "", "#main-content");
        } catch {
          /* ignore */
        }
        main.scrollIntoView({ behavior: "smooth", block: "start" });
        window.setTimeout(() => {
          main.focus({ preventScroll: true });
        }, 0);
      }}
    >
      Pular para o conteudo
    </a>
  );
}
