import type { Metadata } from "next";
import { FlashSalePageView } from "@/components/home/flash-sale-page-view";
import { getActiveFlashSaleProducts } from "@/lib/catalog-server";

export const metadata: Metadata = {
  title: "Ofertas Relampago | Stock Center",
  description:
    "Pagina oficial de Ofertas Relampago da Stock Center com produtos limitados por tempo.",
};

export default async function OfertasRelampagoPage() {
  const products = await getActiveFlashSaleProducts();
  return <FlashSalePageView products={products} />;
}
