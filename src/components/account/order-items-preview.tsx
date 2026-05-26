import { isProductMediaUrl } from "@/lib/product-media";

export type OrderPreviewLineItem = {
  id: string;
  productName: string;
  image: string | null;
  quantity: number;
};

export function OrderItemThumbnail({
  image,
  productName,
  className = "h-20 w-20 shrink-0 rounded-[1.2rem]",
}: {
  image: string | null;
  productName: string;
  className?: string;
}) {
  if (image && isProductMediaUrl(image)) {
    return (
      <div className={`overflow-hidden border border-[var(--color-line)] bg-white ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.trim()}
          alt={productName}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center border border-[var(--color-line)] bg-[var(--color-soft)] px-1 text-center ${className}`}
      title={productName}
    >
      <span className="text-sm font-black text-[var(--color-muted)]">
        {productInitials(productName)}
      </span>
    </div>
  );
}

function productInitials(name: string) {
  const w = name.trim().split(/\s+/).filter(Boolean);
  if (w.length >= 2) {
    const a = w[0]?.[0];
    const b = w[1]?.[0];
    if (a && b) return `${a}${b}`.toUpperCase();
  }
  const one = w[0] ?? "?";
  return one.slice(0, 2).toUpperCase();
}

/** Miniaturas + nome do primeiro produto para listagens de pedidos. */
export function OrderItemsPreview({
  items,
  compact = false,
}: {
  items: OrderPreviewLineItem[];
  /** Versão mais compacta (ex.: conta inicial). */
  compact?: boolean;
}) {
  if (!items.length) {
    return (
      <div
        className={`shrink-0 rounded-xl border border-[var(--color-line)] bg-[var(--color-soft)] ${compact ? "h-12 w-12" : "h-14 w-14"}`}
      />
    );
  }

  const preview = items.slice(0, 3);
  const thumbClass = compact ? "h-12 w-12" : "h-14 w-14";

  return (
    <div className={`flex gap-3 ${compact ? "items-start" : "items-center"}`}>
      <div className="flex shrink-0">
        {preview.map((item, index) => (
          <div
            key={item.id}
            className={`relative ${thumbClass} shrink-0 overflow-hidden rounded-xl border-2 border-[var(--color-soft)] bg-[var(--color-line)] shadow-sm ${index > 0 ? "-ml-2.5" : ""}`}
            style={{ zIndex: preview.length - index }}
          >
            {item.image && isProductMediaUrl(item.image) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.image.trim()}
                alt={item.productName}
                className="h-full w-full object-cover"
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center bg-[var(--color-soft)] px-1 text-center"
                title={item.productName}
              >
                <span className="text-[11px] font-black text-[var(--color-muted)]">
                  {productInitials(item.productName)}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--color-ink)]">
          {items[0].productName}
        </p>
        {items.length > 1 ? (
          <p className="mt-0.5 text-xs text-[var(--color-muted)]">
            +{items.length - 1}{" "}
            {items.length === 2 ? "outro produto" : "outros produtos"}
          </p>
        ) : (
          <p className="mt-0.5 text-xs text-[var(--color-muted)]">Qtd. {items[0].quantity}</p>
        )}
      </div>
    </div>
  );
}
