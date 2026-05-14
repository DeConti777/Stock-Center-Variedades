import type { Metadata } from "next";
import { auth } from "@/auth";
import { CheckoutView } from "@/components/store/checkout-view";
import { getPrismaOrNull } from "@/lib/prisma";
import { pickSavedDeliveryForCheckout } from "@/lib/saved-delivery-address";

export const metadata: Metadata = {
  title: "Checkout",
  description:
    "Finalize sua compra com visual limpo, pagamento via Pix ou cartao e resumo completo do pedido.",
};

export default async function CheckoutPage() {
  const session = await auth();
  const prisma = getPrismaOrNull();
  const user = session?.user?.id && prisma
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          name: true,
          email: true,
          phone: true,
          cpf: true,
          savedDeliveryCep: true,
          savedDeliveryStreet: true,
          savedDeliveryNumber: true,
          savedDeliveryComplement: true,
          savedDeliveryNeighborhood: true,
          savedDeliveryCity: true,
          savedDeliveryState: true,
        },
      })
    : null;

  const savedDelivery = user ? pickSavedDeliveryForCheckout(user) : null;

  return (
    <CheckoutView
      customer={{
        name: user?.name || session?.user?.name || "",
        email: user?.email || session?.user?.email || "",
        phone: user?.phone || "",
        cpf: user?.cpf || "",
      }}
      savedDelivery={savedDelivery}
      isGuest={!session?.user?.id}
    />
  );
}
