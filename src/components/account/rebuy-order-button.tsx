"use client";

import { useRouter } from "next/navigation";
import { useStore } from "@/components/store/store-provider";
import { isLikelyMobileViewport, trackEcommerceEvent } from "@/lib/analytics";

type RebuyOrderButtonProps = {
  orderId: string;
  items: Array<{ productId: string; quantity: number }>;
  className?: string;
  label?: string;
};

export function RebuyOrderButton({
  orderId,
  items,
  className,
  label = "Comprar novamente",
}: RebuyOrderButtonProps) {
  const router = useRouter();
  const { addToCart } = useStore();

  return (
    <button
      type="button"
      onClick={() => {
        items.forEach((item) =>
          addToCart(item.productId, item.quantity, { suppressAddToCartModal: true }),
        );
        trackEcommerceEvent("add_to_cart", {
          source: "repurchase_order",
          order_id: orderId,
          items_count: items.reduce((sum, item) => sum + item.quantity, 0),
          is_mobile: isLikelyMobileViewport(),
        });
        router.push("/carrinho");
      }}
      className={
        className ||
        "inline-flex items-center justify-center rounded-full bg-[var(--color-primary)] px-5 py-3 text-sm font-bold text-white"
      }
    >
      {label}
    </button>
  );
}
