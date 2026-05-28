import { Suspense } from "react";
import { PixPaymentView } from "@/components/checkout/pix-payment-view";

export default function CheckoutPixPage() {
  return (
    <Suspense
      fallback={
        <p className="px-4 py-12 text-center text-sm text-[var(--color-muted)]">
          Carregando pagamento Pix...
        </p>
      }
    >
      <PixPaymentView />
    </Suspense>
  );
}
