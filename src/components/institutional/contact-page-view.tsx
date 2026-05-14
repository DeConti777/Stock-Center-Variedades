import { ContactForm } from "@/components/forms/contact-form";
import { instagramLink, whatsappLink } from "@/lib/site-data";

export function ContactPageView() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] bg-[var(--color-ink)] px-5 py-6 text-white sm:rounded-[2.5rem] sm:px-10 sm:py-10">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-white/60">
          Contato
        </p>
        <h1 className="mt-4 font-display text-4xl font-black tracking-tight sm:text-5xl">
          Atendimento rapido: duvidas, pedidos e pos-venda.
        </h1>
      </div>
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-5">
          <div className="rounded-[2rem] border border-[var(--color-line)] bg-white p-6">
            <h2 className="font-display text-2xl font-bold text-[var(--color-ink)]">
              Canais oficiais
            </h2>
            <div className="mt-5 space-y-4 text-sm leading-7 text-[var(--color-muted)]">
              <p>
                WhatsApp:{" "}
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-[var(--color-primary)]"
                >
                  atendimento comercial
                </a>
              </p>
              <p>
                Instagram:{" "}
                <a
                  href={instagramLink}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-[var(--color-primary)]"
                >
                  @stock.center.variedades
                </a>
              </p>
              <p>
                Endereco fisico: Av. da Aldeia, 729 - Aldeia de Barueri, Barueri - SP
              </p>
            </div>
          </div>
          <div className="rounded-[2rem] bg-[var(--color-accent)] p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--color-ink)]/60">
              Horario
            </p>
            <p className="mt-3 text-lg font-bold text-[var(--color-ink)]">
              Segunda a sabado, das 8h as 20h
            </p>
          </div>
        </div>
        <ContactForm />
      </div>
    </div>
  );
}
