import type { Metadata } from "next";
import { LegalDocumentView } from "@/components/institutional/legal-document-view";

export const metadata: Metadata = {
  title: "Termos de uso",
  description: "Condicoes gerais para uso do site e compras na Stock Center Variedades.",
};

export default function TermsPage() {
  return <LegalDocumentView kind="terms" />;
}
