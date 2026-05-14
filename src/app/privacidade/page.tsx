import type { Metadata } from "next";
import { LegalDocumentView } from "@/components/institutional/legal-document-view";

export const metadata: Metadata = {
  title: "Politica de privacidade",
  description:
    "Como a Stock Center Variedades trata dados pessoais em conformidade com a LGPD.",
};

export default function PrivacyPage() {
  return <LegalDocumentView kind="privacy" />;
}
