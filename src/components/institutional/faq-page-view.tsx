import { faqItems } from "@/lib/faq-data";

function AnswerBlocks({ faqId, text }: { faqId: string; text: string }) {
  const blocks = text.split(/\n\n+/).filter(Boolean);
  return (
    <div className="space-y-2 text-sm leading-6 text-[var(--color-muted)] sm:space-y-3 sm:text-base sm:leading-7">
      {blocks.map((block, index) => (
        <p key={`${faqId}-p-${index}`}>{block.trim()}</p>
      ))}
    </div>
  );
}

export function FaqPageView() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8">
      <header className="rounded-[1.75rem] bg-[var(--color-ink)] px-5 py-6 text-white sm:rounded-[2rem] sm:px-10 sm:py-10">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-white/60">
          Ajuda
        </p>
        <h1 className="mt-3 font-display text-3xl font-black tracking-tight sm:mt-4 sm:text-5xl">
          Perguntas frequentes
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75 sm:mt-4 sm:text-base sm:leading-7">
          Respostas objetivas sobre pagamento, envio, trocas e atendimento. Para casos
          especificos, use o WhatsApp ou o formulario de contato.
        </p>
      </header>

      <div className="space-y-3">
        {faqItems.map((item) => (
          <details
            key={item.id}
            className="group rounded-[1.1rem] border border-[var(--color-line)] bg-white px-4 py-3 shadow-[var(--shadow-soft)] open:shadow-[0_20px_50px_rgba(15,23,42,0.06)] sm:rounded-[1.25rem] sm:px-5 sm:py-4"
          >
            <summary className="cursor-pointer list-none font-display text-base font-bold text-[var(--color-ink)] marker:content-none [&::-webkit-details-marker]:hidden sm:text-lg">
              <span className="flex items-start justify-between gap-3">
                {item.question}
                <span className="mt-1 shrink-0 text-sm font-black text-[var(--color-primary)] transition group-open:rotate-45">
                  +
                </span>
              </span>
            </summary>
            <div className="mt-4 border-t border-[var(--color-line)] pt-4">
              <AnswerBlocks faqId={item.id} text={item.answer} />
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
