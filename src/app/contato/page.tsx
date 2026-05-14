import type { Metadata } from "next";
import { ContactPageView } from "@/components/institutional/contact-page-view";

export const metadata: Metadata = {
  title: "Contato",
  description:
    "Fale com a Stock Center Variedades via WhatsApp, Instagram ou formulario.",
};

export default function ContactPage() {
  return <ContactPageView />;
}
