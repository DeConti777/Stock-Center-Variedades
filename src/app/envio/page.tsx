import type { Metadata } from "next";
import { ShippingPageView } from "@/components/institutional/shipping-page-view";

export const metadata: Metadata = {
  title: "Envio e prazos",
  description:
    "Como funciona a preparacao do pedido, cotacao de frete, prazos de entrega e rastreamento na Stock Center Variedades.",
};

export default function EnvioPage() {
  return <ShippingPageView />;
}
