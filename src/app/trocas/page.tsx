import type { Metadata } from "next";
import { LegalDocumentView } from "@/components/institutional/legal-document-view";

export const metadata: Metadata = {
  title: "Trocas e devolucoes",
  description:
    "Politica de arrependimento, trocas e garantia da Stock Center Variedades.",
};

export default function ReturnsPage() {
  return <LegalDocumentView kind="returns" />;
}
