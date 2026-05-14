import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { FaqPageView } from "@/components/institutional/faq-page-view";
import { buildFaqPageJsonLd } from "@/lib/faq-data";

export const metadata: Metadata = {
  title: "Perguntas frequentes sobre compra, envio e pagamento",
  description:
    "Tire duvidas sobre Pix, cartao, frete, prazos, rastreio, trocas e atendimento antes de finalizar sua compra.",
  alternates: {
    canonical: "/perguntas-frequentes",
  },
  openGraph: {
    title: "FAQ Stock Center | Compra, envio e pagamento",
    description:
      "Respostas objetivas sobre entrega, pagamento e trocas para comprar com mais seguranca.",
    url: "https://www.stockcentervariedades.com.br/perguntas-frequentes",
    type: "article",
  },
};

export default function FaqPage() {
  return (
    <>
      <JsonLd data={buildFaqPageJsonLd()} />
      <FaqPageView />
    </>
  );
}
