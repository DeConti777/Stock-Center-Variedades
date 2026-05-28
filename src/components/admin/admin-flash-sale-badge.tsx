import { getFlashSaleAdminStatus } from "@/lib/flash-sale";
import type { Product } from "@/lib/types";

export function AdminFlashSaleBadge({ product }: { product: Product }) {
  const status = getFlashSaleAdminStatus(product);
  const endLabel =
    product.flashSaleEndsAt != null
      ? new Date(product.flashSaleEndsAt).toLocaleString("pt-BR", {
          dateStyle: "short",
          timeStyle: "short",
        })
      : null;

  if (status === "inactive") {
    return <span className="text-xs text-[var(--color-muted)]">—</span>;
  }

  if (status === "active") {
    return (
      <span className="inline-flex max-w-[11rem] flex-col gap-0.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-900">
        <span>Ativa</span>
        {endLabel ? (
          <span className="font-normal normal-case tracking-normal text-emerald-800">
            ate {endLabel}
          </span>
        ) : null}
      </span>
    );
  }

  if (status === "no_stock") {
    return (
      <span className="inline-flex max-w-[11rem] flex-col gap-0.5 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-950">
        <span>Sem estoque</span>
        <span className="font-normal normal-case tracking-normal text-amber-900">
          Nao aparece na loja
          {endLabel ? ` · ate ${endLabel}` : ""}
        </span>
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-[var(--color-line)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--color-muted)]">
      Expirada
    </span>
  );
}
