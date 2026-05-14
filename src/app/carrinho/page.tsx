import type { Metadata } from "next";
import { CartView } from "@/components/store/cart-view";
import { getFeaturedProducts, getProducts } from "@/lib/catalog-server";

export const metadata: Metadata = {
  title: "Carrinho",
  description:
    "Revise seus produtos, aplique cupom e calcule frete antes de finalizar o pedido.",
};

export default async function CartPage() {
  const featured = await getFeaturedProducts();
  const all = await getProducts();
  const recommendedProducts =
    featured.length > 0 ? featured.slice(0, 4) : all.slice(0, 4);

  return <CartView recommendedProducts={recommendedProducts} />;
}
