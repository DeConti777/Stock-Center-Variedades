"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { calculatePixPrice, formatCurrency, getProductImageUrl } from "@/lib/catalog";
import { getFlashSaleDisplayPercent, isFlashSaleActive } from "@/lib/flash-sale";
import type { Product } from "@/lib/types";

function pad2(n: number) {
  return String(Math.max(0, n)).padStart(2, "0");
}

export function FlashSalePageView({ products }: { products: Product[] }) {
  const deals = useMemo(
    () =>
      [...products]
        .filter((p) => isFlashSaleActive(p) && p.flashSaleEndsAt != null)
        .sort(
          (a, b) =>
            new Date(a.flashSaleEndsAt!).getTime() -
            new Date(b.flashSaleEndsAt!).getTime(),
        ),
    [products],
  );

  const targetEndMs = useMemo(() => {
    if (!deals.length) return null;
    return Math.min(...deals.map((p) => new Date(p.flashSaleEndsAt!).getTime()));
  }, [deals]);

  const [remainMs, setRemainMs] = useState(0);
  useEffect(() => {
    if (targetEndMs == null) return;
    const tick = () => setRemainMs(Math.max(0, targetEndMs - Date.now()));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [targetEndMs]);

  const h = Math.floor(remainMs / 3_600_000);
  const m = Math.floor((remainMs % 3_600_000) / 60_000);
  const s = Math.floor((remainMs % 60_000) / 1000);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-[1.5rem] bg-gradient-to-r from-[#ff1f1f] via-[#e10e2f] to-[#b8002d] p-5 text-white shadow-[0_22px_70px_rgba(185,28,28,0.35)] sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/90">
              Oferta Relampago
            </p>
            <h1 className="mt-2 font-display text-3xl font-black sm:text-4xl">
              Ofertas Relampago
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/90 sm:text-base">
              Produtos com tempo limitado. Quando o contador zerar, saem
              automaticamente da lista.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/20 px-4 py-2 text-sm font-bold">
            <span className="text-white/90">Encerra em</span>
            <span className="rounded-md bg-black/25 px-2 py-1 font-mono">
              {pad2(h)}
            </span>
            <span>:</span>
            <span className="rounded-md bg-black/25 px-2 py-1 font-mono">
              {pad2(m)}
            </span>
            <span>:</span>
            <span className="rounded-md bg-black/25 px-2 py-1 font-mono">
              {pad2(s)}
            </span>
          </div>
        </div>
      </section>

      {deals.length === 0 ? (
        <section className="mt-8 rounded-3xl border border-[var(--color-line)] bg-white p-6 text-center shadow-[var(--shadow-soft)]">
          <p className="text-lg font-black text-[var(--color-ink)]">
            Sem ofertas relampago ativas no momento
          </p>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Volte em alguns minutos ou acompanhe a home para novas entradas.
          </p>
          <Link
            href="/catalogo"
            className="mt-4 inline-flex rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-bold text-white"
          >
            Ver catalogo completo
          </Link>
        </section>
      ) : (
        <section className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {deals.map((product) => {
            const href = `/produto/${product.slug}`;
            const imageSrc = getProductImageUrl(product, 0);
            const hasOldPrice =
              product.originalPrice != null && product.originalPrice > product.price;
            const off = getFlashSaleDisplayPercent(product);
            const pixPrice = calculatePixPrice(product);

            return (
              <Link
                key={product.id}
                href={href}
                className="group overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white shadow-[var(--shadow-soft)]"
              >
                <div className="relative aspect-square w-full bg-[var(--color-soft)]">
                  {imageSrc.startsWith("/") ? (
                    <Image
                      src={imageSrc}
                      alt={product.name}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      sizes="(max-width: 768px) 48vw, 25vw"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element -- URLs externas
                    <img
                      src={imageSrc}
                      alt={product.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  )}
                  {off > 0 ? (
                    <span className="absolute right-2 top-2 rounded-md bg-[#ffd61f] px-2 py-1 text-[10px] font-black text-[var(--color-ink)]">
                      {off}% OFF
                    </span>
                  ) : null}
                </div>

                <div className="border-t-2 border-[#e10e2f] bg-[#fffaf0] p-2.5">
                  <p className="line-clamp-2 text-xs font-semibold text-[var(--color-ink)]">
                    {product.name}
                  </p>
                  {hasOldPrice ? (
                    <p className="mt-1 text-xs text-[var(--color-ink)] line-through">
                      {formatCurrency(product.originalPrice!)}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-[var(--color-ink)] opacity-0">
                      {formatCurrency(product.price)}
                    </p>
                  )}
                  <div className="mt-0.5 flex items-end gap-2">
                    <p className="text-2xl font-black leading-none text-[#d5002f]">
                      {formatCurrency(product.price)}
                    </p>
                    {off > 0 ? (
                      <span className="mb-0.5 rounded-sm bg-[#ffd61f] px-1.5 py-0.5 text-[10px] font-black text-[var(--color-ink)]">
                        {off}% OFF
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs font-semibold text-[var(--color-success)]">
                    no pix por {formatCurrency(pixPrice)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--color-muted)]">
                    ou {product.installment.quantity}x de{" "}
                    {formatCurrency(product.installment.amount)} sem juros
                  </p>
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
}
