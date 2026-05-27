/** Faixa horizontal com scroll nativo fluido no mobile (touch-action pan-x). */
export const mobileHorizontalScrollRowClass =
  "flex snap-x snap-proximity gap-3 overflow-x-auto overscroll-x-contain touch-pan-x pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden [&_.product-card-root]:touch-pan-x [&_.product-card-title]:touch-pan-x [&_.product-card-media_a]:touch-pan-x";

/** Padding lateral padrão das faixas da home (pl-4 pr-4). */
export const mobileHorizontalScrollRowPaddedClass = `${mobileHorizontalScrollRowClass} pl-4 pr-4`;
