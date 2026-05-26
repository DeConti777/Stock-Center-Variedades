import type { Metadata } from "next";
import { CartView } from "@/components/store/cart-view";
import { getCartRecommendedProducts } from "@/lib/catalog-server";

export const metadata: Metadata = {
  title: "Carrinho",
  description:
    "Revise seus produtos, aplique cupom e calcule frete antes de finalizar o pedido.",
};

export default async function CartPage() {
  const recommendedProducts = await getCartRecommendedProducts(18);

  return <CartView recommendedProducts={recommendedProducts} />;
}
