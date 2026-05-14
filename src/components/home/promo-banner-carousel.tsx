"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const ENABLE_SEASONAL_PROMO_BANNERS = false;
const SLIDE_COUNT = ENABLE_SEASONAL_PROMO_BANNERS ? 5 : 1;

function ChevronLeft({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

const navBtnClass =
  "absolute top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[rgba(255,209,102,0.55)] bg-[#08172f]/85 text-[#ffd166] shadow-[0_4px_18px_rgba(0,0,0,0.45)] backdrop-blur-sm transition hover:border-[#7dd3fc] hover:bg-[#08172f] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffd166] sm:h-11 sm:w-11";

function InaugurationInteractiveSlide() {
  return (
    <div className="relative h-full min-h-0 min-w-full shrink-0">
      <Link
        href="/catalogo"
        aria-label="Ver catalogo da semana de inauguracao com 10% OFF"
        className="group absolute inset-0 block overflow-hidden bg-[#0f2447] outline-none transition-[filter] duration-300 hover:brightness-105 focus-visible:ring-2 focus-visible:ring-[#ffd166] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-soft)]"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(255,209,102,0.3),transparent_30%),radial-gradient(circle_at_15%_20%,rgba(93,95,239,0.28),transparent_27%),radial-gradient(circle_at_86%_78%,rgba(20,184,166,0.24),transparent_28%),linear-gradient(115deg,#08172f_0%,#153b73_42%,#22577a_68%,#7b4f1d_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.22),transparent_22%,transparent_78%,rgba(0,0,0,0.2))]" />
        <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,#7dd3fc,#ffd166,#7dd3fc,transparent)]" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,#ffd166,#7dd3fc,transparent)]" />
        <div className="promo-confetti-layer" aria-hidden>
          {Array.from({ length: 18 }, (_, index) => (
            <span key={index} />
          ))}
        </div>
        <div className="absolute inset-0 opacity-40">
          <div className="absolute -left-20 top-5 h-32 w-72 rotate-[-10deg] rounded-full border border-white/35" />
          <div className="absolute -right-16 bottom-2 h-32 w-80 rotate-[8deg] rounded-full border border-white/30" />
          <div className="absolute left-[8%] bottom-4 h-2 w-2 rounded-full bg-[#ffd166] shadow-[0_0_22px_8px_rgba(255,209,102,0.42)]" />
          <div className="absolute right-[13%] top-5 h-2 w-2 rounded-full bg-[#7dd3fc] shadow-[0_0_22px_8px_rgba(125,211,252,0.34)]" />
        </div>
        <div className="relative z-10 mx-auto grid h-full w-full max-w-7xl grid-cols-1 items-center gap-3 px-3 text-white sm:grid-cols-[1fr_auto_1fr] sm:px-6 lg:px-8">
          <div className="hidden justify-self-end rounded-2xl border border-white/25 bg-white/10 px-4 py-3 text-right text-[10px] font-black uppercase leading-4 tracking-[0.16em] text-[#ffd166] shadow-[0_10px_30px_rgba(0,0,0,0.16)] backdrop-blur-sm sm:block">
            Primeira semana
            <br />
            ofertas especiais
          </div>
          <div className="flex min-w-0 flex-col items-center justify-center text-center">
            <span className="mb-0.5 inline-flex rounded-full border border-white/35 bg-white/14 px-2.5 py-0.5 text-[7px] font-black uppercase tracking-[0.18em] text-[#fff3b0] shadow-[0_0_18px_rgba(255,209,102,0.2)] backdrop-blur-sm sm:mb-1 sm:px-3 sm:py-1 sm:text-[10px] sm:tracking-[0.22em]">
              Oferta por tempo limitado
            </span>
            <p className="font-display text-[9px] font-black uppercase tracking-[0.26em] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)] sm:text-[16px] sm:tracking-[0.34em] lg:text-[19px]">
              Semana de Inauguração
            </p>
            <div className="mt-0.5 flex items-end justify-center gap-2 leading-none sm:mt-1 sm:gap-4">
              <span className="font-display text-[43px] font-black tracking-[-0.09em] text-[#ffd166] drop-shadow-[0_10px_24px_rgba(0,0,0,0.58)] sm:text-[84px] lg:text-[100px]">
                10%
              </span>
              <span className="pb-1 font-display text-[26px] font-black text-white drop-shadow-[0_10px_24px_rgba(0,0,0,0.58)] sm:pb-2 sm:text-[50px] lg:text-[60px]">
                OFF
              </span>
            </div>
            <p className="-mt-0.5 font-display text-[10px] font-black uppercase tracking-[0.16em] text-white sm:-mt-1 sm:text-[20px] sm:tracking-[0.2em] lg:text-[23px]">
              em todo o site
            </p>
            <span className="mt-1.5 inline-flex rounded-full border border-white/75 bg-[linear-gradient(90deg,#fff3b0,#ffd166_42%,#ffbe0b)] px-4 py-1 text-[9px] font-black uppercase text-[#240046] shadow-[0_0_32px_rgba(255,209,102,0.5)] transition-transform duration-300 group-hover:scale-105 sm:mt-2 sm:px-9 sm:py-2 sm:text-sm">
              Comprar agora
            </span>
          </div>
          <div className="hidden justify-self-start rounded-2xl border border-white/25 bg-white/10 px-4 py-3 text-left text-[10px] font-black uppercase leading-4 tracking-[0.16em] text-[#ffd166] shadow-[0_10px_30px_rgba(0,0,0,0.16)] backdrop-blur-sm sm:block">
            Compra segura
            <br />
            envio rapido
          </div>
        </div>
      </Link>
    </div>
  );
}

function CopaImageSlide() {
  return (
    <div className="relative h-full min-h-0 min-w-full shrink-0">
      <Link
        href="/catalogo"
        aria-label="Ver catalogo — promocao Copa 2026 com desconto em itens relacionados"
        className="group absolute inset-0 block overflow-hidden bg-[#003c1f] outline-none transition-[filter] duration-300 hover:brightness-105 focus-visible:ring-2 focus-visible:ring-[#facc15] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-soft)]"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_49%_45%,rgba(250,204,21,0.34),transparent_28%),radial-gradient(circle_at_76%_38%,rgba(37,99,235,0.36),transparent_30%),radial-gradient(circle_at_18%_70%,rgba(22,163,74,0.42),transparent_34%),linear-gradient(115deg,#003c1f_0%,#047857_34%,#facc15_54%,#1d4ed8_78%,#003c1f_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,45,22,0.55),transparent_28%,transparent_70%,rgba(0,38,77,0.45))]" />
        <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,#22c55e,#facc15,#2563eb,transparent)]" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,#2563eb,#facc15,#22c55e,transparent)]" />

        <div className="promo-confetti-layer copa-confetti-layer" aria-hidden>
          {Array.from({ length: 18 }, (_, index) => (
            <span key={index} />
          ))}
        </div>

        <div className="absolute inset-0 opacity-40" aria-hidden>
          <div className="absolute left-[4%] top-5 h-28 w-72 rotate-[-8deg] rounded-full border border-[#facc15]/45" />
          <div className="absolute right-[7%] bottom-3 h-28 w-80 rotate-[7deg] rounded-full border border-[#60a5fa]/35" />
          <div className="absolute bottom-0 left-0 h-12 w-full bg-[linear-gradient(175deg,transparent_0%,rgba(34,197,94,0.2)_45%,rgba(250,204,21,0.22)_70%,rgba(37,99,235,0.18)_100%)]" />
        </div>

        <div className="copa-fireworks" aria-hidden>
          <span />
          <span />
          <span />
        </div>

        <div className="absolute inset-y-0 left-[11%] hidden w-[22%] sm:block" aria-hidden>
          <div className="copa-kicker">
            <span className="copa-kicker-head" />
            <span className="copa-kicker-body" />
            <span className="copa-kicker-arm copa-kicker-arm-left" />
            <span className="copa-kicker-arm copa-kicker-arm-right" />
            <span className="copa-kicker-leg copa-kicker-leg-left" />
            <span className="copa-kicker-leg copa-kicker-leg-right" />
          </div>
        </div>

        <div className="copa-ball" aria-hidden>
          <span />
        </div>

        <div className="copa-goal" aria-hidden>
          <div className="copa-goal-net" />
        </div>

        <div className="relative z-10 mx-auto grid h-full w-full max-w-7xl grid-cols-1 items-center gap-3 px-3 text-white sm:grid-cols-[1fr_auto_1fr] sm:px-6 lg:px-8">
          <div className="hidden justify-self-end rounded-2xl border border-[#facc15]/45 bg-[#052e16]/35 px-4 py-3 text-right text-[10px] font-black uppercase leading-4 tracking-[0.16em] text-[#facc15] shadow-[0_10px_30px_rgba(0,0,0,0.16)] backdrop-blur-sm sm:block">
            Torcida online
            <br />
            oferta limitada
          </div>
          <div className="flex min-w-0 flex-col items-center justify-center text-center">
            <span className="mb-0.5 inline-flex rounded-full border border-[#facc15]/55 bg-[#052e16]/45 px-2.5 py-0.5 text-[7px] font-black uppercase tracking-[0.18em] text-[#fef08a] shadow-[0_0_18px_rgba(250,204,21,0.24)] backdrop-blur-sm sm:mb-1 sm:px-3 sm:py-1 sm:text-[10px] sm:tracking-[0.22em]">
              Oferta por tempo limitado
            </span>
            <p className="font-display text-[9px] font-black uppercase tracking-[0.26em] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)] sm:text-[16px] sm:tracking-[0.34em] lg:text-[19px]">
              Celebre a Copa 2026
            </p>
            <div className="mt-0.5 flex items-end justify-center gap-2 leading-none sm:mt-1 sm:gap-4">
              <span className="font-display text-[43px] font-black tracking-[-0.09em] text-[#facc15] drop-shadow-[0_10px_24px_rgba(0,0,0,0.58)] sm:text-[84px] lg:text-[100px]">
                10%
              </span>
              <span className="pb-1 font-display text-[26px] font-black text-white drop-shadow-[0_10px_24px_rgba(0,0,0,0.58)] sm:pb-2 sm:text-[50px] lg:text-[60px]">
                OFF
              </span>
            </div>
            <p className="-mt-0.5 font-display text-[10px] font-black uppercase tracking-[0.16em] text-white sm:-mt-1 sm:text-[20px] sm:tracking-[0.2em] lg:text-[23px]">
              em itens relacionados
            </p>
            <span className="mt-1.5 inline-flex rounded-full border border-white/75 bg-[linear-gradient(90deg,#fef08a,#facc15_42%,#22c55e)] px-4 py-1 text-[9px] font-black uppercase text-[#052e16] shadow-[0_0_32px_rgba(250,204,21,0.5)] transition-transform duration-300 group-hover:scale-105 sm:mt-2 sm:px-9 sm:py-2 sm:text-sm">
              Comprar agora
            </span>
          </div>
          <div className="hidden justify-self-start rounded-2xl border border-[#60a5fa]/45 bg-[#1e3a8a]/35 px-4 py-3 text-left text-[10px] font-black uppercase leading-4 tracking-[0.16em] text-[#facc15] shadow-[0_10px_30px_rgba(0,0,0,0.16)] backdrop-blur-sm sm:block">
            Envio rapido
            <br />
            compra segura
          </div>
        </div>
      </Link>
    </div>
  );
}

function MothersDayInteractiveSlide() {
  return (
    <div className="relative h-full min-h-0 min-w-full shrink-0">
      <Link
        href="/catalogo"
        aria-label="Ver catalogo — presentes para o Dia das Maes em 10.5"
        className="group absolute inset-0 block overflow-hidden bg-[#ffe4ef] outline-none transition-[filter] duration-300 hover:brightness-105 focus-visible:ring-2 focus-visible:ring-[#f472b6] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-soft)]"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_35%,rgba(255,255,255,0.82),transparent_26%),radial-gradient(circle_at_78%_42%,rgba(244,114,182,0.28),transparent_26%),linear-gradient(115deg,#fff1f7_0%,#ffd6e7_42%,#fbcfe8_70%,#fff7ed_100%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,#f472b6,#f9a8d4,#fbbf24,transparent)]" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,#fbbf24,#f472b6,transparent)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.38),transparent_28%,transparent_72%,rgba(255,255,255,0.34))]" />

        <div className="mothers-petal-layer" aria-hidden>
          {Array.from({ length: 18 }, (_, index) => (
            <span key={index} />
          ))}
        </div>

        <div className="mothers-visuals" aria-hidden>
          <div className="mothers-gift">
            <span className="mothers-gift-ribbon-v" />
            <span className="mothers-gift-ribbon-h" />
            <span className="mothers-gift-bow mothers-gift-bow-left" />
            <span className="mothers-gift-bow mothers-gift-bow-right" />
          </div>
          <div className="mothers-flowers">
            <span />
            <span />
            <span />
          </div>
          <div className="mothers-chocolates">
            <span />
            <span />
            <span />
          </div>
        </div>

        <div className="relative z-10 mx-auto grid h-full w-full max-w-7xl grid-cols-1 items-center gap-3 px-3 text-[#7f1d1d] sm:grid-cols-[1fr_auto_1fr] sm:px-6 lg:px-8">
          <div className="hidden justify-self-end rounded-2xl border border-white/70 bg-white/45 px-4 py-3 text-right text-[10px] font-black uppercase leading-4 tracking-[0.16em] text-[#be185d] shadow-[0_10px_30px_rgba(190,24,93,0.16)] backdrop-blur-sm sm:block">
            Flores
            <br />
            chocolates
          </div>
          <div className="flex min-w-0 flex-col items-center justify-center text-center">
            <span className="mb-0.5 inline-flex rounded-full border border-[#f472b6]/45 bg-white/55 px-2.5 py-0.5 text-[7px] font-black uppercase tracking-[0.18em] text-[#be185d] shadow-[0_0_18px_rgba(244,114,182,0.24)] backdrop-blur-sm sm:mb-1 sm:px-3 sm:py-1 sm:text-[10px] sm:tracking-[0.22em]">
              Presenteie com carinho
            </span>
            <p className="font-display text-[9px] font-black uppercase tracking-[0.26em] text-[#be185d] drop-shadow-[0_2px_8px_rgba(255,255,255,0.7)] sm:text-[16px] sm:tracking-[0.34em] lg:text-[19px]">
              Dia das Mães 10.5
            </p>
            <div className="mt-0.5 flex items-end justify-center gap-2 leading-none sm:mt-1 sm:gap-4">
              <span className="font-display text-[43px] font-black tracking-[-0.08em] text-[#db2777] drop-shadow-[0_10px_24px_rgba(190,24,93,0.28)] sm:text-[84px] lg:text-[100px]">
                10%
              </span>
              <span className="pb-1 font-display text-[26px] font-black text-[#831843] drop-shadow-[0_10px_24px_rgba(190,24,93,0.18)] sm:pb-2 sm:text-[50px] lg:text-[60px]">
                OFF
              </span>
            </div>
            <p className="-mt-0.5 font-display text-[10px] font-black uppercase tracking-[0.16em] text-[#9d174d] sm:-mt-1 sm:text-[20px] sm:tracking-[0.2em] lg:text-[23px]">
              em presentes selecionados
            </p>
            <span className="mt-1.5 inline-flex rounded-full border border-white/85 bg-[linear-gradient(90deg,#fff7ed,#f9a8d4_44%,#f472b6)] px-4 py-1 text-[9px] font-black uppercase text-[#831843] shadow-[0_0_32px_rgba(244,114,182,0.42)] transition-transform duration-300 group-hover:scale-105 sm:mt-2 sm:px-9 sm:py-2 sm:text-sm">
              Comprar agora
            </span>
          </div>
          <div className="hidden justify-self-start rounded-2xl border border-white/70 bg-white/45 px-4 py-3 text-left text-[10px] font-black uppercase leading-4 tracking-[0.16em] text-[#be185d] shadow-[0_10px_30px_rgba(190,24,93,0.16)] backdrop-blur-sm sm:block">
            Compra segura
            <br />
            envio rapido
          </div>
        </div>
      </Link>
    </div>
  );
}

function HalloweenInteractiveSlide() {
  return (
    <div className="relative h-full min-h-0 min-w-full shrink-0">
      <Link
        href="/catalogo"
        aria-label="Ver catalogo — ofertas tematicas de Halloween"
        className="group absolute inset-0 block overflow-hidden bg-[#14001f] outline-none transition-[filter] duration-300 hover:brightness-105 focus-visible:ring-2 focus-visible:ring-[#fb923c] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-soft)]"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(251,146,60,0.24),transparent_24%),radial-gradient(circle_at_76%_42%,rgba(168,85,247,0.35),transparent_28%),linear-gradient(115deg,#12001f_0%,#31104a_42%,#7c2d12_74%,#05010a_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.48),transparent_30%,transparent_68%,rgba(0,0,0,0.38))]" />
        <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,#a855f7,#fb923c,#facc15,transparent)]" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,#fb923c,#a855f7,transparent)]" />

        <div className="halloween-spark-layer" aria-hidden>
          {Array.from({ length: 18 }, (_, index) => (
            <span key={index} />
          ))}
        </div>

        <div className="halloween-visuals" aria-hidden>
          <div className="halloween-moon" />
          <div className="halloween-web" />
          <div className="halloween-pumpkin">
            <span className="halloween-pumpkin-eye halloween-pumpkin-eye-left" />
            <span className="halloween-pumpkin-eye halloween-pumpkin-eye-right" />
            <span className="halloween-pumpkin-mouth" />
          </div>
          <div className="halloween-bats">
            <span />
            <span />
            <span />
          </div>
        </div>

        <div className="relative z-10 mx-auto grid h-full w-full max-w-7xl grid-cols-1 items-center gap-3 px-3 text-white sm:grid-cols-[1fr_auto_1fr] sm:px-6 lg:px-8">
          <div className="hidden justify-self-end rounded-2xl border border-[#fb923c]/45 bg-black/25 px-4 py-3 text-right text-[10px] font-black uppercase leading-4 tracking-[0.16em] text-[#fb923c] shadow-[0_10px_30px_rgba(0,0,0,0.22)] backdrop-blur-sm sm:block">
            Doces
            <br />
            sustos e ofertas
          </div>
          <div className="flex min-w-0 flex-col items-center justify-center text-center">
            <span className="mb-0.5 inline-flex rounded-full border border-[#fb923c]/55 bg-black/30 px-2.5 py-0.5 text-[7px] font-black uppercase tracking-[0.18em] text-[#fed7aa] shadow-[0_0_18px_rgba(251,146,60,0.26)] backdrop-blur-sm sm:mb-1 sm:px-3 sm:py-1 sm:text-[10px] sm:tracking-[0.22em]">
              Especial de Halloween
            </span>
            <p className="font-display text-[9px] font-black uppercase tracking-[0.26em] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.65)] sm:text-[16px] sm:tracking-[0.34em] lg:text-[19px]">
              Ofertas Assustadoras
            </p>
            <div className="mt-0.5 flex items-end justify-center gap-2 leading-none sm:mt-1 sm:gap-4">
              <span className="font-display text-[43px] font-black tracking-[-0.08em] text-[#fb923c] drop-shadow-[0_10px_24px_rgba(0,0,0,0.6)] sm:text-[84px] lg:text-[100px]">
                10%
              </span>
              <span className="pb-1 font-display text-[26px] font-black text-white drop-shadow-[0_10px_24px_rgba(0,0,0,0.58)] sm:pb-2 sm:text-[50px] lg:text-[60px]">
                OFF
              </span>
            </div>
            <p className="-mt-0.5 font-display text-[10px] font-black uppercase tracking-[0.16em] text-[#fef3c7] sm:-mt-1 sm:text-[20px] sm:tracking-[0.2em] lg:text-[23px]">
              em itens tematicos
            </p>
            <span className="mt-1.5 inline-flex rounded-full border border-white/70 bg-[linear-gradient(90deg,#fed7aa,#fb923c_44%,#a855f7)] px-4 py-1 text-[9px] font-black uppercase text-[#1b0726] shadow-[0_0_32px_rgba(251,146,60,0.46)] transition-transform duration-300 group-hover:scale-105 sm:mt-2 sm:px-9 sm:py-2 sm:text-sm">
              Comprar agora
            </span>
          </div>
          <div className="hidden justify-self-start rounded-2xl border border-[#a855f7]/45 bg-black/25 px-4 py-3 text-left text-[10px] font-black uppercase leading-4 tracking-[0.16em] text-[#fb923c] shadow-[0_10px_30px_rgba(0,0,0,0.22)] backdrop-blur-sm sm:block">
            Compra segura
            <br />
            envio rapido
          </div>
        </div>
      </Link>
    </div>
  );
}

function BlackFridayInteractiveSlide() {
  return (
    <div className="relative h-full min-h-0 min-w-full shrink-0">
      <Link
        href="/catalogo"
        aria-label="Ver catalogo — ofertas de Black Friday"
        className="group absolute inset-0 block overflow-hidden bg-[#000000] outline-none transition-[filter] duration-300 hover:brightness-110 focus-visible:ring-2 focus-visible:ring-[#ffe600] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-soft)]"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_35%,rgba(255,0,0,0.32),transparent_24%),radial-gradient(circle_at_76%_42%,rgba(255,230,0,0.34),transparent_26%),linear-gradient(115deg,#000000_0%,#050505_38%,#b91c1c_72%,#000000_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.72),transparent_28%,transparent_68%,rgba(0,0,0,0.68))]" />
        <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,#ff1f1f,#ffe600,#fff700,transparent)]" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,#fff700,#ffe600,#ff1f1f,transparent)]" />

        <div className="black-friday-spark-layer" aria-hidden>
          {Array.from({ length: 18 }, (_, index) => (
            <span key={index} />
          ))}
        </div>

        <div className="black-friday-visuals" aria-hidden>
          <div className="black-friday-bolt black-friday-bolt-left" />
          <div className="black-friday-bolt black-friday-bolt-right" />
          <div className="black-friday-tag">
            <span />
          </div>
          <div className="black-friday-card-stack">
            <span />
            <span />
            <span />
          </div>
          <div className="black-friday-scanline" />
        </div>

        <div className="relative z-10 mx-auto grid h-full w-full max-w-7xl grid-cols-1 items-center gap-3 px-3 text-white sm:grid-cols-[1fr_auto_1fr] sm:px-6 lg:px-8">
          <div className="hidden justify-self-end rounded-2xl border border-[#ffe600]/60 bg-black/55 px-4 py-3 text-right text-[10px] font-black uppercase leading-4 tracking-[0.16em] text-[#fff700] shadow-[0_10px_30px_rgba(0,0,0,0.42)] backdrop-blur-sm sm:block">
            Descontos
            <br />
            relampago
          </div>
          <div className="flex min-w-0 flex-col items-center justify-center text-center">
            <span className="mb-0.5 inline-flex rounded-full border border-[#ffe600]/70 bg-black/55 px-2.5 py-0.5 text-[7px] font-black uppercase tracking-[0.18em] text-[#fff7ad] shadow-[0_0_22px_rgba(255,230,0,0.36)] backdrop-blur-sm sm:mb-1 sm:px-3 sm:py-1 sm:text-[10px] sm:tracking-[0.22em]">
              Oferta por tempo limitado
            </span>
            <p className="font-display text-[9px] font-black uppercase tracking-[0.26em] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.72)] sm:text-[16px] sm:tracking-[0.34em] lg:text-[19px]">
              Black Friday
            </p>
            <div className="mt-0.5 flex items-end justify-center gap-2 leading-none sm:mt-1 sm:gap-4">
              <span className="font-display text-[43px] font-black tracking-[-0.08em] text-[#ffe600] drop-shadow-[0_10px_24px_rgba(0,0,0,0.72)] sm:text-[84px] lg:text-[100px]">
                50%
              </span>
              <span className="pb-1 font-display text-[26px] font-black text-white drop-shadow-[0_10px_24px_rgba(0,0,0,0.62)] sm:pb-2 sm:text-[50px] lg:text-[60px]">
                OFF
              </span>
            </div>
            <p className="-mt-0.5 font-display text-[10px] font-black uppercase tracking-[0.16em] text-[#fee2e2] sm:-mt-1 sm:text-[20px] sm:tracking-[0.2em] lg:text-[23px]">
              em ofertas selecionadas
            </p>
            <span className="mt-1.5 inline-flex rounded-full border border-white/75 bg-[linear-gradient(90deg,#fff7ad,#ffe600_44%,#ff1f1f)] px-4 py-1 text-[9px] font-black uppercase text-black shadow-[0_0_36px_rgba(255,230,0,0.58)] transition-transform duration-300 group-hover:scale-105 sm:mt-2 sm:px-9 sm:py-2 sm:text-sm">
              Comprar agora
            </span>
          </div>
          <div className="hidden justify-self-start rounded-2xl border border-[#ff1f1f]/55 bg-black/55 px-4 py-3 text-left text-[10px] font-black uppercase leading-4 tracking-[0.16em] text-[#fff700] shadow-[0_10px_30px_rgba(0,0,0,0.42)] backdrop-blur-sm sm:block">
            Compra segura
            <br />
            estoque limitado
          </div>
        </div>
      </Link>
    </div>
  );
}

export function PromoBannerCarousel() {
  const count = SLIDE_COUNT;
  const [index, setIndex] = useState(0);
  const safeIndex = Math.min(index, count - 1);

  const goPrev = useCallback(() => {
    if (count < 2) return;
    setIndex((i) => (i - 1 + count) % count);
  }, [count]);

  const goNext = useCallback(() => {
    if (count < 2) return;
    setIndex((i) => (i + 1) % count);
  }, [count]);

  useEffect(() => {
    if (count < 2) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [count, goPrev, goNext]);

  return (
    <section
      className="pt-0"
      aria-roledescription="carousel"
      aria-label="Banners promocionais"
    >
      <div className="relative w-full min-w-0">
        {count > 1 ? (
          <>
            <button
              type="button"
              className={`${navBtnClass} left-1.5 sm:left-3`}
              aria-label="Banner anterior"
              onClick={goPrev}
            >
              <ChevronLeft />
            </button>
            <button
              type="button"
              className={`${navBtnClass} right-1.5 sm:right-3`}
              aria-label="Proximo banner"
              onClick={goNext}
            >
              <ChevronRight />
            </button>
          </>
        ) : null}

        <div
          className="promo-banner-viewport border-y border-[rgba(255,209,102,0.75)] shadow-[0_18px_48px_rgba(15,36,71,0.34)]"
          aria-live="polite"
          aria-atomic="true"
        >
          <div
            className="flex h-full min-h-0 w-full min-w-0 transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${safeIndex * 100}%)` }}
          >
            <InaugurationInteractiveSlide />
            {ENABLE_SEASONAL_PROMO_BANNERS ? (
              <>
                <CopaImageSlide />
                <MothersDayInteractiveSlide />
                <HalloweenInteractiveSlide />
                <BlackFridayInteractiveSlide />
              </>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
