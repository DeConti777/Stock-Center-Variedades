"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { formatCurrency } from "@/lib/catalog";
import {
  formatCepDisplay,
  formatCpfDisplay,
  formatPhoneBrDisplay,
  isValidCpfDigits,
  isValidEmail,
  isValidPhoneBrDigits,
  onlyDigits,
  sanitizeAddressNumber,
  sanitizeUf,
} from "@/lib/br-fields";
import type { SavedDeliveryPayload } from "@/lib/saved-delivery-address";
import { useStore } from "@/components/store/store-provider";
import { isLikelyMobileViewport, trackEcommerceEvent } from "@/lib/analytics";
import type { FulfillmentType } from "@/lib/types";

type CheckoutViewProps = {
  customer: {
    name: string;
    email: string;
    phone: string;
    cpf: string;
  };
  isGuest?: boolean;
  /** Endereco completo salvo no perfil; se ausente, o fluxo e so "informar novo". */
  savedDelivery?: SavedDeliveryPayload | null;
};

type ShippingOptionRow = {
  id: number;
  name: string;
  company: string;
  priceReais: number;
  deliveryDays: number;
};

type ShippingQuoteApiOk = {
  cepDigits: string;
  cepFormatted: string;
  state: string;
  city: string;
  street: string;
  neighborhood: string;
  shippingInCents: number;
  shippingReais: number;
  shippingCarrier?: string | null;
  shippingSource?: string;
  shippingOptions?: ShippingOptionRow[];
  error?: string;
};

function isShippingOptionRow(value: unknown): value is ShippingOptionRow {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  return (
    typeof o.id === "number" &&
    typeof o.name === "string" &&
    typeof o.company === "string" &&
    typeof o.priceReais === "number" &&
    typeof o.deliveryDays === "number"
  );
}

/** Aplica retorno de /api/shipping/quote ao estado de frete (opcao mais barata quando ha lista ME). */
function freightStateFromQuoteApi(data: ShippingQuoteApiOk): {
  options: ShippingOptionRow[];
  melhorEnvioServiceId: number | null;
  shippingInCents: number;
  carrierLabel: string | null;
} {
  const rawOpts = data.shippingOptions;
  const options = Array.isArray(rawOpts)
    ? rawOpts.filter(isShippingOptionRow).sort((a, b) => a.priceReais - b.priceReais)
    : [];

  if (data.shippingSource === "melhor_envio" && options.length > 0) {
    const first = options[0];
    return {
      options,
      melhorEnvioServiceId: first.id,
      shippingInCents: Math.round(first.priceReais * 100),
      carrierLabel: `${first.company} — ${first.name}`,
    };
  }

  return {
    options: [],
    melhorEnvioServiceId: null,
    shippingInCents: data.shippingInCents,
    carrierLabel:
      typeof data.shippingCarrier === "string" && data.shippingCarrier.trim()
        ? data.shippingCarrier.trim()
        : null,
  };
}

const inputClass =
  "w-full rounded-2xl border border-[var(--color-line)] px-4 py-2.5 text-sm outline-none focus:border-[var(--color-primary)] sm:py-3 sm:text-base";
const labelClass =
  "text-xs font-semibold text-[var(--color-muted)] lg:text-sm";

/** Simbolo Pix (vetor 24x24, mesma caixa que CheckoutCardIcon). Geometria CC0 Simple Icons. */
function CheckoutPixIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={22}
      height={22}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        fill="#32BCAD"
        d="M5.283 18.36a3.505 3.505 0 0 0 2.493-1.032l3.6-3.6a.684.684 0 0 1 .946 0l3.613 3.613a3.504 3.504 0 0 0 2.493 1.032h.71l-4.56 4.56a3.647 3.647 0 0 1-5.156 0L4.85 18.36ZM18.428 5.627a3.505 3.505 0 0 0-2.493 1.032l-3.613 3.614a.67.67 0 0 1-.946 0l-3.6-3.6A3.505 3.505 0 0 0 5.283 5.64h-.434l4.573-4.572a3.646 3.646 0 0 1 5.156 0l4.559 4.559ZM1.068 9.422 3.79 6.699h1.492a2.483 2.483 0 0 1 1.744.722l3.6 3.6a1.73 1.73 0 0 0 2.443 0l3.614-3.613a2.482 2.482 0 0 1 1.744-.723h1.767l2.737 2.737a3.646 3.646 0 0 1 0 5.156l-2.736 2.736h-1.768a2.482 2.482 0 0 1-1.744-.722l-3.613-3.613a1.77 1.77 0 0 0-2.444 0l-3.6 3.6a2.483 2.483 0 0 1-1.744.722H3.791l-2.723-2.723a3.646 3.646 0 0 1 0-5.156"
      />
    </svg>
  );
}

function CheckoutCardIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  );
}

function calculateCouponDiscountReais(
  coupon: {
    type: string;
    valuePercent: number | null;
    valueInCents: number | null;
  } | null,
  subtotal: number,
) {
  if (!coupon) {
    return 0;
  }

  const subtotalInCents = Math.max(0, Math.round(subtotal * 100));

  if (coupon.type === "FIXED") {
    return Math.min(Math.max(coupon.valueInCents || 0, 0), subtotalInCents) / 100;
  }

  const percent = Math.min(Math.max(coupon.valuePercent || 0, 0), 100);
  return Math.min(Math.round(subtotalInCents * (percent / 100)), subtotalInCents) / 100;
}

export function CheckoutView({
  customer,
  isGuest = false,
  savedDelivery: savedDeliveryProp = null,
}: CheckoutViewProps) {
  const { cart, cartProducts, coupon } = useStore();
  const savedDelivery = !isGuest ? savedDeliveryProp : null;
  const [paymentMethod, setPaymentMethod] = useState<"PIX" | "CARD">("PIX");
  const [fulfillmentMode, setFulfillmentMode] = useState<FulfillmentType>("SHIP");
  const [deliveryAddressSource, setDeliveryAddressSource] = useState<"saved" | "new">(
    () => (!isGuest && savedDeliveryProp ? "saved" : "new"),
  );
  const [error, setError] = useState<string | null>(null);
  const [stripeHandoffUrl, setStripeHandoffUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [formState, setFormState] = useState({
    recipientName: customer.name,
    email: customer.email.trim(),
    cpf: onlyDigits(customer.cpf).slice(0, 11),
    phone: onlyDigits(customer.phone).slice(0, 11),
    cep: "",
    city: "",
    state: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
  });

  const [shippingQuoteCents, setShippingQuoteCents] = useState<number | null>(null);
  const [shippingCarrierLabel, setShippingCarrierLabel] = useState<string | null>(null);
  const [freightOptions, setFreightOptions] = useState<ShippingOptionRow[]>([]);
  const [melhorEnvioServiceId, setMelhorEnvioServiceId] = useState<number | null>(null);
  const [cepStatus, setCepStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [cepMessage, setCepMessage] = useState<string | null>(null);

  const cepDigits = onlyDigits(formState.cep, 8);

  useEffect(() => {
    if (cartProducts.length === 0) return;
    trackEcommerceEvent("begin_checkout", {
      source: "checkout_page",
      items_count: cartProducts.reduce((sum, item) => sum + item.quantity, 0),
      cart_total: cartProducts.reduce((sum, item) => sum + item.price * item.quantity, 0),
      is_mobile: isLikelyMobileViewport(),
    });
  }, [cartProducts]);

  useEffect(() => {
    if (isGuest || fulfillmentMode !== "SHIP" || !savedDelivery) return;
    if (deliveryAddressSource !== "saved") return;
    setFormState((prev) => ({
      ...prev,
      cep: savedDelivery.cep,
      city: savedDelivery.city,
      state: savedDelivery.state,
      street: savedDelivery.street,
      number: savedDelivery.number,
      complement: savedDelivery.complement ?? "",
      neighborhood: savedDelivery.neighborhood,
    }));
  }, [isGuest, savedDelivery, deliveryAddressSource, fulfillmentMode]);

  useEffect(() => {
    if (fulfillmentMode === "PICKUP") {
      setShippingQuoteCents(0);
      setShippingCarrierLabel(null);
      setFreightOptions([]);
      setMelhorEnvioServiceId(null);
      setCepStatus("idle");
      setCepMessage(null);
      return;
    }

    if (cepDigits.length !== 8) {
      setShippingQuoteCents(null);
      setShippingCarrierLabel(null);
      setFreightOptions([]);
      setMelhorEnvioServiceId(null);
      setCepStatus("idle");
      setCepMessage(null);
      return;
    }

    const ac = new AbortController();

    const timer = window.setTimeout(async () => {
      setCepStatus("loading");
      setCepMessage("Consultando CEP e cotando frete...");
      setError(null);

      try {
        const res = await fetch("/api/shipping/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: ac.signal,
          body: JSON.stringify({ cep: cepDigits, items: cart }),
        });
        const data = (await res.json()) as ShippingQuoteApiOk;

        if (!res.ok) {
          setCepStatus("error");
          setCepMessage(data.error || "CEP nao encontrado.");
          setShippingQuoteCents(null);
          setShippingCarrierLabel(null);
          setFreightOptions([]);
          setMelhorEnvioServiceId(null);
          return;
        }

        setFormState((prev) => ({
          ...prev,
          cep: cepDigits,
          state: data.state,
          city: data.city || prev.city,
          street: data.street || prev.street,
          neighborhood: data.neighborhood || prev.neighborhood,
        }));
        const fr = freightStateFromQuoteApi(data);
        setFreightOptions(fr.options);
        setMelhorEnvioServiceId(fr.melhorEnvioServiceId);
        setShippingQuoteCents(fr.shippingInCents);
        setShippingCarrierLabel(fr.carrierLabel);
        setCepStatus("ok");
        setCepMessage(
          data.shippingSource === "melhor_envio"
            ? "Endereco encontrado. Frete cotado (Melhor Envio)."
            : "Endereco encontrado. Frete estimado (sem integracao ativa).",
        );
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        setCepStatus("error");
        setCepMessage("Falha ao consultar CEP. Tente novamente.");
        setShippingQuoteCents(null);
        setShippingCarrierLabel(null);
        setFreightOptions([]);
        setMelhorEnvioServiceId(null);
      }
    }, 500);

    return () => {
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [cepDigits, cart, fulfillmentMode]);

  const pricing = useMemo(() => {
    const productSubtotal = cartProducts.reduce((sum, item) => {
      const unitPrice =
        paymentMethod === "PIX"
          ? item.price * (1 - item.pixDiscountPercent / 100)
          : item.price;
      return sum + unitPrice * item.quantity;
    }, 0);

    const couponDiscount = calculateCouponDiscountReais(coupon, productSubtotal);
    const subtotal = Math.max(productSubtotal - couponDiscount, 0);

    if (fulfillmentMode === "PICKUP") {
      return {
        productSubtotal,
        couponDiscount,
        subtotal,
        shipping: 0,
        total: subtotal,
      };
    }

    const shippingReais =
      shippingQuoteCents != null ? shippingQuoteCents / 100 : null;

    return {
      productSubtotal,
      couponDiscount,
      subtotal,
      shipping: shippingReais,
      total: shippingReais != null ? subtotal + shippingReais : null,
    };
  }, [cartProducts, coupon, paymentMethod, shippingQuoteCents, fulfillmentMode]);

  const stockErrors = useMemo(() => {
    const errors: string[] = [];
    cartProducts.forEach((item) => {
      if (item.stock <= 0) {
        errors.push(`${item.name} não está disponível (sem estoque).`);
      } else if (item.quantity > item.stock) {
        errors.push(`${item.name} tem apenas ${item.stock} un. em estoque.`);
      }
    });
    return errors;
  }, [cartProducts]);

  const profileIncomplete = useMemo(() => {
    if (isGuest) return false;
    const cpf = onlyDigits(customer.cpf, 11);
    const phone = onlyDigits(customer.phone, 11);
    return (
      !customer.name?.trim() ||
      !isValidEmail(customer.email.trim()) ||
      !isValidCpfDigits(cpf) ||
      !isValidPhoneBrDigits(phone)
    );
  }, [isGuest, customer.name, customer.email, customer.cpf, customer.phone]);

  async function refreshCepManually() {
    if (cepDigits.length !== 8) {
      setCepMessage("Digite o CEP com 8 digitos.");
      setCepStatus("error");
      return;
    }
    setCepStatus("loading");
    setCepMessage("Consultando...");
    try {
      const res = await fetch("/api/shipping/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cep: cepDigits, items: cart }),
      });
      const data = (await res.json()) as ShippingQuoteApiOk;
      if (!res.ok) {
        setCepStatus("error");
        setCepMessage(data.error || "CEP invalido.");
        setShippingQuoteCents(null);
        setShippingCarrierLabel(null);
        setFreightOptions([]);
        setMelhorEnvioServiceId(null);
        return;
      }
      setFormState((prev) => ({
        ...prev,
        cep: cepDigits,
        state: data.state,
        city: data.city || prev.city,
        street: data.street || prev.street,
        neighborhood: data.neighborhood || prev.neighborhood,
      }));
      const fr = freightStateFromQuoteApi(data);
      setFreightOptions(fr.options);
      setMelhorEnvioServiceId(fr.melhorEnvioServiceId);
      setShippingQuoteCents(fr.shippingInCents);
      setShippingCarrierLabel(fr.carrierLabel);
      setCepStatus("ok");
      setCepMessage("Endereco encontrado.");
    } catch {
      setCepStatus("error");
      setCepMessage("Erro de rede.");
      setShippingQuoteCents(null);
      setShippingCarrierLabel(null);
      setFreightOptions([]);
      setMelhorEnvioServiceId(null);
    }
  }

  const canSubmit =
    !profileIncomplete &&
    (fulfillmentMode === "PICKUP"
      ? true
      : cepStatus === "ok" && shippingQuoteCents != null);

  function completeStripeRedirect(url: string) {
    if (process.env.NODE_ENV === "development") {
      console.info(
        "[checkout] Redirecionando para Stripe. Se checkout.stripe.com ficar em skeleton, na aba Rede verifique bloqueios a js.stripe.com ou m.stripe.network (Chrome Android: chrome://inspect).",
      );
    }
    trackEcommerceEvent("checkout_stripe_handoff", {
      is_mobile: isLikelyMobileViewport(),
    });
    setStripeHandoffUrl(url);
    window.setTimeout(() => {
      window.location.assign(url);
    }, 500);
  }

  function handleCheckoutSubmit(analyticsSource: string) {
    setError(null);
    trackEcommerceEvent("checkout_submit", {
      source: analyticsSource,
      payment_method: paymentMethod,
      is_mobile: isLikelyMobileViewport(),
    });

    if (fulfillmentMode === "PICKUP") {
      if (isGuest) {
        if (!formState.recipientName.trim()) {
          setError("Preencha o nome completo.");
          return;
        }
        if (!isValidCpfDigits(formState.cpf)) {
          setError("CPF invalido. Verifique os digitos.");
          return;
        }
        if (!isValidEmail(formState.email)) {
          setError("E-mail invalido.");
          return;
        }
        if (!isValidPhoneBrDigits(formState.phone)) {
          setError("Telefone deve ter DDD + numero (10 ou 11 digitos).");
          return;
        }
      }

      startTransition(async () => {
        try {
          const response = await fetch("/api/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              items: cart,
              paymentMethod,
              fulfillmentType: "PICKUP",
              couponCode: coupon?.code || null,
              shipping: {
                ...formState,
                cep: "",
                city: "",
                state: "",
                street: "",
                number: "",
                complement: "",
                neighborhood: "",
                cpf: onlyDigits(formState.cpf, 11),
                phone: onlyDigits(formState.phone, 11),
                email: formState.email.trim().toLowerCase(),
              },
            }),
          });

          let payload: { error?: string; url?: string };
          try {
            payload = (await response.json()) as {
              error?: string;
              url?: string;
            };
          } catch {
            setError("Resposta invalida do servidor. Tente novamente.");
            return;
          }

          if (!response.ok || !payload.url) {
            trackEcommerceEvent("checkout_submit_error", {
              source: analyticsSource,
              reason: payload.error || "checkout_init_failed",
              payment_method: paymentMethod,
              is_mobile: isLikelyMobileViewport(),
            });
            setError(payload.error || "Nao foi possivel iniciar o checkout.");
            return;
          }

          completeStripeRedirect(payload.url);
        } catch {
          trackEcommerceEvent("checkout_submit_error", {
            source: analyticsSource,
            reason: "network_error",
            payment_method: paymentMethod,
            is_mobile: isLikelyMobileViewport(),
          });
          setError("Falha de rede. Verifique sua conexao e tente de novo.");
        }
      });
      return;
    }

    const addressFields: Array<[keyof typeof formState, string]> = [
      ["cep", "CEP"],
      ["city", "Cidade"],
      ["state", "UF"],
      ["street", "Logradouro"],
      ["number", "Numero"],
      ["neighborhood", "Bairro"],
    ];
    const personalFields: Array<[keyof typeof formState, string]> = [
      ["recipientName", "Nome completo"],
      ["email", "E-mail"],
      ["cpf", "CPF"],
      ["phone", "Telefone"],
    ];

    const required = isGuest ? [...personalFields, ...addressFields] : addressFields;
    const missing = required.find(([key]) => !String(formState[key]).trim());
    if (missing) {
      setError(`Preencha o campo: ${missing[1]}.`);
      return;
    }

    if (cepDigits.length !== 8 || cepStatus !== "ok" || shippingQuoteCents == null) {
      setError("Informe um CEP valido e aguarde a busca concluir para calcular o frete.");
      return;
    }

    if (isGuest) {
      if (!isValidCpfDigits(formState.cpf)) {
        setError("CPF invalido. Verifique os digitos.");
        return;
      }
      if (!isValidEmail(formState.email)) {
        setError("E-mail invalido.");
        return;
      }
      if (!isValidPhoneBrDigits(formState.phone)) {
        setError("Telefone deve ter DDD + numero (10 ou 11 digitos).");
        return;
      }
    }
    if (sanitizeUf(formState.state).length !== 2) {
      setError("UF invalida.");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: cart,
            paymentMethod,
            fulfillmentType: "SHIP",
            couponCode: coupon?.code || null,
            ...(melhorEnvioServiceId != null && freightOptions.length > 0
              ? { melhorEnvioServiceId }
              : {}),
            shipping: {
              ...formState,
              cep: cepDigits,
              state: sanitizeUf(formState.state),
            },
          }),
        });

        let payload: { error?: string; url?: string };
        try {
          payload = (await response.json()) as {
            error?: string;
            url?: string;
          };
        } catch {
          setError("Resposta invalida do servidor. Tente novamente.");
          return;
        }

        if (!response.ok || !payload.url) {
          trackEcommerceEvent("checkout_submit_error", {
            source: analyticsSource,
            reason: payload.error || "checkout_init_failed",
            payment_method: paymentMethod,
            is_mobile: isLikelyMobileViewport(),
          });
          setError(payload.error || "Nao foi possivel iniciar o checkout.");
          return;
        }

        completeStripeRedirect(payload.url);
      } catch {
        trackEcommerceEvent("checkout_submit_error", {
          source: analyticsSource,
          reason: "network_error",
          payment_method: paymentMethod,
          is_mobile: isLikelyMobileViewport(),
        });
        setError("Falha de rede. Verifique sua conexao e tente de novo.");
      }
    });
  }

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-4 pb-28 sm:px-6 lg:grid-cols-[1fr_390px] lg:gap-8 lg:px-8 lg:py-10 lg:pb-10">
      <section className="space-y-4 lg:space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)] lg:text-sm lg:tracking-[0.28em]">
            Checkout
          </p>
          <h1 className="mt-1.5 font-display text-2xl font-black tracking-tight text-[var(--color-ink)] sm:text-3xl lg:mt-3 lg:text-4xl">
            Finalize sua compra com pagamento real.
          </h1>
          {isGuest ? (
            <p className="mt-2 inline-flex rounded-full bg-[var(--color-soft)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink)] sm:px-3 sm:py-1 sm:text-xs lg:mt-3">
              Compra como convidado
            </p>
          ) : null}
          <p className="mt-1.5 text-xs leading-snug text-[var(--color-muted)] lg:mt-2 lg:text-sm lg:leading-normal">
            {isGuest
              ? fulfillmentMode === "PICKUP"
                ? "Retirada na loja sem frete. Apos o pagamento, voce recebe por e-mail o codigo para retirar o pedido."
                : "Endereco via Brasil API; frete cotado com Melhor Envio (Correios, Jadlog, etc.) quando configurado. CPF e telefone apenas numeros."
              : fulfillmentMode === "PICKUP"
                ? "Retirada na loja sem frete. Usamos os dados da sua conta para contato; o codigo de retirada vai para o seu e-mail cadastrado."
                : savedDelivery
                  ? "Usamos nome, e-mail, CPF e telefone da sua conta. Voce pode usar o endereco salvo em Minha conta ou informar outro so para esta entrega (Brasil API + Melhor Envio quando configurado)."
                  : "Usamos nome, e-mail, CPF e telefone da sua conta. Preencha o endereco de entrega abaixo (Brasil API + Melhor Envio quando configurado)."}
          </p>
          {isGuest ? (
            <p className="mt-1.5 text-[11px] leading-snug text-[var(--color-muted)] lg:mt-2 lg:text-sm lg:leading-normal">
              Quer acompanhar pedidos e recomprar mais rapido? Voce pode{" "}
              <a
                href="/criar-conta?next=/conta/pedidos"
                className="font-semibold text-[var(--color-primary)] underline underline-offset-2"
              >
                criar conta depois da compra
              </a>
              .
            </p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-[var(--color-line)] bg-white p-4 shadow-[0_20px_60px_rgba(15,23,42,0.06)] lg:rounded-[2rem] lg:p-6">
          <h2 className="font-display text-xl font-bold text-[var(--color-ink)] lg:text-2xl">
            {fulfillmentMode === "PICKUP"
              ? "Dados para retirada na loja"
              : "Dados de entrega"}
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:mt-6 lg:gap-4">
            {isGuest ? (
              <>
                <label className="block sm:col-span-2">
                  <span className={labelClass}>
                    Nome completo
                  </span>
                  <input
                    value={formState.recipientName}
                    onChange={(e) =>
                      setFormState((c) => ({ ...c, recipientName: e.target.value }))
                    }
                    autoComplete="name"
                    className={`${inputClass} mt-1`}
                    placeholder="Nome como no documento"
                  />
                </label>

                <label className="block">
                  <span className={labelClass}>
                    E-mail
                  </span>
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={formState.email}
                    onChange={(e) =>
                      setFormState((c) => ({ ...c, email: e.target.value.trim() }))
                    }
                    className={`${inputClass} mt-1`}
                    placeholder="voce@email.com"
                  />
                </label>

                <label className="block">
                  <span className={labelClass}>
                    CPF (somente numeros)
                  </span>
                  <input
                    inputMode="numeric"
                    autoComplete="off"
                    value={formatCpfDisplay(formState.cpf)}
                    onChange={(e) =>
                      setFormState((c) => ({
                        ...c,
                        cpf: onlyDigits(e.target.value, 11),
                      }))
                    }
                    className={`${inputClass} mt-1`}
                    placeholder="000.000.000-00"
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className={labelClass}>
                    Telefone com DDD (somente numeros)
                  </span>
                  <input
                    inputMode="tel"
                    autoComplete="tel"
                    value={formatPhoneBrDisplay(formState.phone)}
                    onChange={(e) =>
                      setFormState((c) => ({
                        ...c,
                        phone: onlyDigits(e.target.value, 11),
                      }))
                    }
                    className={`${inputClass} mt-1`}
                    placeholder="(11) 99999-9999"
                  />
                </label>
              </>
            ) : (
              <div className="block rounded-2xl border border-[var(--color-line)] bg-[var(--color-soft)] p-3 sm:col-span-2">
                <p className={labelClass}>Dados da conta</p>
                <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">
                  {customer.name?.trim() || "—"}
                </p>
                <p className="mt-1 text-xs text-[var(--color-muted)]">{customer.email}</p>
                <p className="mt-2 text-xs text-[var(--color-muted)]">
                  CPF: {customer.cpf ? formatCpfDisplay(onlyDigits(customer.cpf, 11)) : "—"} · Tel.:{" "}
                  {customer.phone
                    ? formatPhoneBrDisplay(onlyDigits(customer.phone, 11))
                    : "—"}
                </p>
                <Link
                  href="/conta"
                  className="mt-3 inline-flex text-xs font-semibold text-[var(--color-primary)] underline underline-offset-2"
                >
                  Alterar dados na conta
                </Link>
              </div>
            )}

            {profileIncomplete ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950 sm:col-span-2">
                <p className="font-semibold">
                  Complete nome, e-mail, CPF e telefone em Conta para finalizar a compra.
                </p>
                <Link
                  href="/conta"
                  className="mt-2 inline-flex font-semibold text-[var(--color-primary)] underline underline-offset-2"
                >
                  Ir para Conta
                </Link>
              </div>
            ) : null}

            <div className="block sm:col-span-2">
              <span className={labelClass}>Como receber</span>
              <ul className="mt-2 space-y-2">
                <li>
                  <label
                    className={`flex cursor-pointer items-start gap-2 rounded-2xl border px-2.5 py-2 text-xs sm:gap-3 sm:px-3 sm:py-3 sm:text-sm lg:py-3 ${
                      fulfillmentMode === "SHIP"
                        ? "border-[var(--color-primary)] bg-[var(--color-soft)]"
                        : "border-[var(--color-line)] bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="fulfillment-mode"
                      className="mt-1"
                      checked={fulfillmentMode === "SHIP"}
                      onChange={() => {
                        setFulfillmentMode("SHIP");
                        setShippingQuoteCents(null);
                        setShippingCarrierLabel(null);
                        setFreightOptions([]);
                        setMelhorEnvioServiceId(null);
                        setCepStatus("idle");
                        setCepMessage(null);
                      }}
                    />
                    <span className="text-[var(--color-ink)]">
                      <span className="font-semibold">Receber no endereco</span>
                      <span className="mt-0.5 block text-[11px] leading-tight text-[var(--color-muted)] sm:text-sm sm:leading-normal">
                        Calcular frete pelo CEP e entrega pelos Correios ou parceiros.
                      </span>
                    </span>
                  </label>
                </li>
                <li>
                  <label
                    className={`flex cursor-pointer items-start gap-2 rounded-2xl border px-2.5 py-2 text-xs sm:gap-3 sm:px-3 sm:py-3 sm:text-sm lg:py-3 ${
                      fulfillmentMode === "PICKUP"
                        ? "border-[var(--color-primary)] bg-[var(--color-soft)]"
                        : "border-[var(--color-line)] bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="fulfillment-mode"
                      className="mt-1"
                      checked={fulfillmentMode === "PICKUP"}
                      onChange={() => {
                        setFulfillmentMode("PICKUP");
                        setFormState((p) => ({
                          ...p,
                          cep: "",
                          city: "",
                          state: "",
                          street: "",
                          number: "",
                          complement: "",
                          neighborhood: "",
                        }));
                      }}
                    />
                    <span className="text-[var(--color-ink)]">
                      <span className="font-semibold">Retirar na loja</span>
                      <span className="mt-0.5 block text-[11px] leading-tight text-[var(--color-muted)] sm:text-sm sm:leading-normal">
                        Sem frete — pague apenas os produtos e retire com codigo enviado por e-mail.
                      </span>
                    </span>
                  </label>
                </li>
              </ul>
            </div>

            {fulfillmentMode === "SHIP" ? (
              <>
                {savedDelivery ? (
                  <div className="block sm:col-span-2">
                    <span className={labelClass}>Endereco de entrega</span>
                    <ul className="mt-2 space-y-2">
                      <li>
                        <label
                          className={`flex cursor-pointer items-start gap-2 rounded-2xl border px-2.5 py-2 text-xs sm:gap-3 sm:px-3 sm:py-3 sm:text-sm lg:py-3 ${
                            deliveryAddressSource === "saved"
                              ? "border-[var(--color-primary)] bg-[var(--color-soft)]"
                              : "border-[var(--color-line)] bg-white"
                          }`}
                        >
                          <input
                            type="radio"
                            name="delivery-address-source"
                            className="mt-1"
                            checked={deliveryAddressSource === "saved"}
                            onChange={() => {
                              setDeliveryAddressSource("saved");
                            }}
                          />
                          <span className="text-[var(--color-ink)]">
                            <span className="font-semibold">Usar meu endereco cadastrado</span>
                            <span className="mt-0.5 block text-[11px] leading-tight text-[var(--color-muted)] sm:text-sm sm:leading-normal">
                              {formatCepDisplay(savedDelivery.cep)} · {savedDelivery.street},{" "}
                              {savedDelivery.number}
                              {savedDelivery.complement
                                ? ` — ${savedDelivery.complement}`
                                : ""}{" "}
                              · {savedDelivery.neighborhood}, {savedDelivery.city} — {savedDelivery.state}
                            </span>
                          </span>
                        </label>
                      </li>
                      <li>
                        <label
                          className={`flex cursor-pointer items-start gap-2 rounded-2xl border px-2.5 py-2 text-xs sm:gap-3 sm:px-3 sm:py-3 sm:text-sm lg:py-3 ${
                            deliveryAddressSource === "new"
                              ? "border-[var(--color-primary)] bg-[var(--color-soft)]"
                              : "border-[var(--color-line)] bg-white"
                          }`}
                        >
                          <input
                            type="radio"
                            name="delivery-address-source"
                            className="mt-1"
                            checked={deliveryAddressSource === "new"}
                            onChange={() => {
                              setDeliveryAddressSource("new");
                              setFormState((p) => ({
                                ...p,
                                cep: "",
                                city: "",
                                state: "",
                                street: "",
                                number: "",
                                complement: "",
                                neighborhood: "",
                              }));
                              setShippingQuoteCents(null);
                              setShippingCarrierLabel(null);
                              setFreightOptions([]);
                              setMelhorEnvioServiceId(null);
                              setCepStatus("idle");
                              setCepMessage(null);
                            }}
                          />
                          <span className="text-[var(--color-ink)]">
                            <span className="font-semibold">Entregar em outro endereco</span>
                            <span className="mt-0.5 block text-[11px] leading-tight text-[var(--color-muted)] sm:text-sm sm:leading-normal">
                              Informe um CEP e endereco diferentes para este pedido.
                            </span>
                          </span>
                        </label>
                      </li>
                    </ul>
                  </div>
                ) : null}

                {savedDelivery && deliveryAddressSource === "saved" ? (
                  <>
                    <div className="block rounded-2xl border border-[var(--color-line)] bg-[var(--color-soft)] p-3 sm:col-span-2">
                      <p className={labelClass}>Endereco de entrega</p>
                      <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">
                        {formatCepDisplay(savedDelivery.cep)} · {savedDelivery.street},{" "}
                        {savedDelivery.number}
                        {savedDelivery.complement ? ` — ${savedDelivery.complement}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-[var(--color-muted)]">
                        {savedDelivery.neighborhood}, {savedDelivery.city} — {savedDelivery.state}
                      </p>
                      <Link
                        href="/conta/enderecos"
                        className="mt-3 inline-flex text-xs font-semibold text-[var(--color-primary)] underline underline-offset-2"
                      >
                        Alterar dados do endereco
                      </Link>
                    </div>
                    {cepMessage || cepStatus === "loading" ? (
                      <p
                        className={`mt-2 block text-xs sm:col-span-2 sm:text-sm ${
                          cepStatus === "error"
                            ? "text-red-600"
                            : cepStatus === "ok"
                              ? "text-emerald-700"
                              : "text-[var(--color-muted)]"
                        }`}
                      >
                        {cepStatus === "loading" ? "… " : null}
                        {cepMessage ?? "Consultando frete..."}
                      </p>
                    ) : null}
                    {freightOptions.length > 1 ? (
                      <div className="block sm:col-span-2">
                        <span className={labelClass}>Forma de entrega</span>
                        <ul className="mt-2 space-y-2">
                          {freightOptions.map((opt) => {
                            const selected = melhorEnvioServiceId === opt.id;
                            return (
                              <li key={opt.id}>
                                <label
                                  className={`flex cursor-pointer items-start gap-2 rounded-2xl border px-2.5 py-2 text-xs sm:gap-3 sm:px-3 sm:py-3 sm:text-sm lg:py-3 ${
                                    selected
                                      ? "border-[var(--color-primary)] bg-[var(--color-soft)]"
                                      : "border-[var(--color-line)] bg-white"
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name="melhor-envio-service"
                                    className="mt-1"
                                    checked={selected}
                                    onChange={() => {
                                      setMelhorEnvioServiceId(opt.id);
                                      setShippingQuoteCents(Math.round(opt.priceReais * 100));
                                      setShippingCarrierLabel(`${opt.company} — ${opt.name}`);
                                    }}
                                  />
                                  <span className="text-[var(--color-ink)]">
                                    <span className="font-semibold">
                                      {opt.company} — {opt.name}
                                    </span>
                                    <span className="mt-0.5 block text-[11px] leading-tight text-[var(--color-muted)] sm:text-sm sm:leading-normal">
                                      {formatCurrency(opt.priceReais)}
                                      {opt.deliveryDays > 0
                                        ? ` · ${opt.deliveryDays} dia(s) util(is)`
                                        : ""}
                                    </span>
                                  </span>
                                </label>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <>
                    <div className="block sm:col-span-2">
                      <span className={labelClass}>
                        CEP (endereco + frete)
                      </span>
                      <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                        <input
                          inputMode="numeric"
                          autoComplete="postal-code"
                          value={formatCepDisplay(formState.cep)}
                          onChange={(e) =>
                            setFormState((c) => ({
                              ...c,
                              cep: onlyDigits(e.target.value, 8),
                            }))
                          }
                          className={`${inputClass} sm:max-w-[200px]`}
                          placeholder="00000-000"
                        />
                        <button
                          type="button"
                          onClick={() => void refreshCepManually()}
                          className="touch-target-mobile rounded-2xl border border-[var(--color-line)] px-4 py-2.5 text-xs font-bold text-[var(--color-ink)] hover:bg-[var(--color-soft)] sm:px-5 sm:py-3 sm:text-sm"
                        >
                          Buscar CEP agora
                        </button>
                      </div>
                      {cepMessage ? (
                        <p
                          className={`mt-2 text-xs sm:text-sm ${
                            cepStatus === "error"
                              ? "text-red-600"
                              : cepStatus === "ok"
                                ? "text-emerald-700"
                                : "text-[var(--color-muted)]"
                          }`}
                        >
                          {cepStatus === "loading" ? "… " : null}
                          {cepMessage}
                        </p>
                      ) : null}
                    </div>

                    {freightOptions.length > 1 ? (
                      <div className="block sm:col-span-2">
                        <span className={labelClass}>Forma de entrega</span>
                        <ul className="mt-2 space-y-2">
                          {freightOptions.map((opt) => {
                            const selected = melhorEnvioServiceId === opt.id;
                            return (
                              <li key={opt.id}>
                                <label
                                  className={`flex cursor-pointer items-start gap-2 rounded-2xl border px-2.5 py-2 text-xs sm:gap-3 sm:px-3 sm:py-3 sm:text-sm lg:py-3 ${
                                    selected
                                      ? "border-[var(--color-primary)] bg-[var(--color-soft)]"
                                      : "border-[var(--color-line)] bg-white"
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name="melhor-envio-service"
                                    className="mt-1"
                                    checked={selected}
                                    onChange={() => {
                                      setMelhorEnvioServiceId(opt.id);
                                      setShippingQuoteCents(Math.round(opt.priceReais * 100));
                                      setShippingCarrierLabel(`${opt.company} — ${opt.name}`);
                                    }}
                                  />
                                  <span className="text-[var(--color-ink)]">
                                    <span className="font-semibold">
                                      {opt.company} — {opt.name}
                                    </span>
                                    <span className="mt-0.5 block text-[11px] leading-tight text-[var(--color-muted)] sm:text-sm sm:leading-normal">
                                      {formatCurrency(opt.priceReais)}
                                      {opt.deliveryDays > 0
                                        ? ` · ${opt.deliveryDays} dia(s) util(is)`
                                        : ""}
                                    </span>
                                  </span>
                                </label>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ) : null}

                    <label className="block">
                      <span className={labelClass}>
                        UF
                      </span>
                      <input
                        inputMode="text"
                        autoComplete="address-level1"
                        value={formState.state}
                        onChange={(e) =>
                          setFormState((c) => ({
                            ...c,
                            state: sanitizeUf(e.target.value),
                          }))
                        }
                        maxLength={2}
                        className={`${inputClass} mt-1 uppercase`}
                        placeholder="SP"
                      />
                    </label>

                    <label className="block">
                      <span className={labelClass}>
                        Cidade
                      </span>
                      <input
                        autoComplete="address-level2"
                        value={formState.city}
                        onChange={(e) =>
                          setFormState((c) => ({ ...c, city: e.target.value }))
                        }
                        className={`${inputClass} mt-1`}
                        placeholder="Cidade"
                      />
                    </label>

                    <label className="block sm:col-span-2">
                      <span className={labelClass}>
                        Logradouro
                      </span>
                      <input
                        autoComplete="street-address"
                        value={formState.street}
                        onChange={(e) =>
                          setFormState((c) => ({ ...c, street: e.target.value }))
                        }
                        className={`${inputClass} mt-1`}
                        placeholder="Rua, avenida..."
                      />
                    </label>

                    <label className="block">
                      <span className={labelClass}>
                        Numero
                      </span>
                      <input
                        inputMode="text"
                        value={formState.number}
                        onChange={(e) =>
                          setFormState((c) => ({
                            ...c,
                            number: sanitizeAddressNumber(e.target.value),
                          }))
                        }
                        className={`${inputClass} mt-1`}
                        placeholder="123 ou S/N"
                      />
                    </label>

                    <label className="block">
                      <span className={labelClass}>
                        Complemento
                      </span>
                      <input
                        value={formState.complement}
                        onChange={(e) =>
                          setFormState((c) => ({ ...c, complement: e.target.value }))
                        }
                        className={`${inputClass} mt-1`}
                        placeholder="Apto, bloco..."
                      />
                    </label>

                    <label className="block sm:col-span-2">
                      <span className={labelClass}>
                        Bairro
                      </span>
                      <input
                        autoComplete="address-level3"
                        value={formState.neighborhood}
                        onChange={(e) =>
                          setFormState((c) => ({ ...c, neighborhood: e.target.value }))
                        }
                        className={`${inputClass} mt-1`}
                        placeholder="Bairro"
                      />
                    </label>
                  </>
                )}
              </>
            ) : (
              <p className="block text-xs leading-snug text-[var(--color-muted)] sm:col-span-2 sm:text-sm sm:leading-normal">
                Endereco nao e necessario. O codigo para retirar na loja sera enviado para o e-mail
                informado apos a confirmacao do pagamento.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--color-line)] bg-white p-4 shadow-[0_20px_60px_rgba(15,23,42,0.06)] lg:rounded-[2rem] lg:p-6">
          <h2 className="font-display text-xl font-bold text-[var(--color-ink)] lg:text-2xl">
            Forma de pagamento
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:mt-6">
            {(
              [
                {
                  key: "PIX" as const,
                  label: "Pix",
                  icon: <CheckoutPixIcon className="shrink-0" />,
                },
                {
                  key: "CARD" as const,
                  label: "Cartão",
                  icon: (
                    <CheckoutCardIcon className="shrink-0 text-[var(--color-ink)]" />
                  ),
                },
              ] as const
            ).map((method) => (
              <button
                key={method.key}
                type="button"
                onClick={() => setPaymentMethod(method.key)}
                className={`flex items-center gap-2.5 rounded-[1.4rem] border px-3 py-3 text-left sm:gap-3 sm:px-4 sm:py-4 lg:py-4 ${
                  paymentMethod === method.key
                    ? "border-[var(--color-primary)] bg-[var(--color-soft)]"
                    : "border-[var(--color-line)]"
                }`}
              >
                {method.icon}
                <span className="font-bold text-[var(--color-ink)]">{method.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <aside className="h-fit rounded-2xl border border-[var(--color-line)] bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.08)] lg:rounded-[2rem] lg:p-6">
        <h2 className="font-display text-xl font-bold text-[var(--color-ink)] lg:text-2xl">
          Resumo do pedido
        </h2>
        <div className="mt-4 space-y-3 lg:mt-6 lg:space-y-4">
          {cartProducts.map((item) => {
            const unitPrice =
              paymentMethod === "PIX"
                ? item.price * (1 - item.pixDiscountPercent / 100)
                : item.price;
            return (
              <div key={item.id} className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-ink)] sm:text-base">
                    {item.name}
                  </p>
                  <p className="text-xs text-[var(--color-muted)] sm:text-sm">
                    Qtde: {item.quantity}
                  </p>
                </div>
                <p className="text-sm font-bold text-[var(--color-ink)] sm:text-base">
                  {formatCurrency(unitPrice * item.quantity)}
                </p>
              </div>
            );
          })}
        </div>
        <div className="mt-4 space-y-2 border-t border-[var(--color-line)] pt-4 text-xs sm:mt-6 sm:space-y-3 sm:pt-6 sm:text-sm">
          <div className="flex items-center justify-between text-[var(--color-muted)]">
            <span>Produtos</span>
            <span>{formatCurrency(pricing.productSubtotal)}</span>
          </div>
          {coupon ? (
            <div className="flex items-center justify-between text-[var(--color-muted)]">
              <span>Cupom {coupon.code}</span>
              <span>- {formatCurrency(pricing.couponDiscount)}</span>
            </div>
          ) : null}
          <div className="flex items-center justify-between text-[var(--color-muted)]">
            <span>Subtotal</span>
            <span>{formatCurrency(pricing.subtotal)}</span>
          </div>
          {fulfillmentMode === "SHIP" ? (
            <>
          <div className="flex flex-col gap-1 text-[var(--color-muted)] sm:flex-row sm:items-center sm:justify-between">
            <span>Frete</span>
            <span className="text-right font-medium text-[var(--color-ink)]">
              {pricing.shipping != null ? formatCurrency(pricing.shipping) : "—"}
            </span>
          </div>
          {shippingCarrierLabel ? (
            <p className="text-xs text-[var(--color-muted)]">{shippingCarrierLabel}</p>
          ) : null}
            </>
          ) : (
            <p className="text-xs text-[var(--color-muted)] sm:text-sm">
              Retirada na loja — valor apenas dos produtos (sem frete).
            </p>
          )}
          <div className="flex items-center justify-between text-base font-bold text-[var(--color-ink)] sm:text-lg">
            <span>Total</span>
            <span>
              {pricing.total != null ? formatCurrency(pricing.total) : "—"}
            </span>
          </div>
        </div>
        {stockErrors.length > 0 && (
          <div className="mt-3 space-y-2 rounded-2xl bg-red-50 p-3 text-xs text-red-700 sm:mt-4 sm:p-4 sm:text-sm">
            <p className="font-semibold">Problemas com estoque:</p>
            <ul className="list-inside list-disc">
              {stockErrors.map((msg, idx) => (
                <li key={idx}>{msg}</li>
              ))}
            </ul>
          </div>
        )}
        {error ? (
          <p className="mt-4 text-sm font-medium text-[var(--color-primary)]">{error}</p>
        ) : null}
        <button
          type="button"
          disabled={
            isPending || stockErrors.length > 0 || !canSubmit || stripeHandoffUrl != null
          }
          onClick={() => handleCheckoutSubmit("checkout_desktop")}
          className="mt-6 hidden w-full items-center justify-center rounded-full bg-[var(--color-primary)] px-6 py-3.5 text-sm font-bold text-white disabled:opacity-70 lg:inline-flex lg:mt-8 lg:py-4"
        >
          {isPending || stripeHandoffUrl ? "Redirecionando..." : "Ir para pagamento seguro"}
        </button>
      </aside>
      <div className="fixed inset-x-3 bottom-3 z-20 rounded-2xl border border-[var(--color-line)] bg-white/95 p-2.5 shadow-[0_20px_40px_rgba(15,23,42,0.14)] backdrop-blur-sm lg:hidden">
        <div className="mb-1.5 flex items-center justify-between text-xs text-[var(--color-muted)] sm:text-sm">
          <span>Total</span>
          <span className="text-base font-black text-[var(--color-ink)] sm:text-lg">
            {pricing.total != null ? formatCurrency(pricing.total) : "—"}
          </span>
        </div>
        <button
          type="button"
          disabled={
            isPending || stockErrors.length > 0 || !canSubmit || stripeHandoffUrl != null
          }
          onClick={() => handleCheckoutSubmit("checkout_mobile_sticky")}
          className="touch-target-mobile inline-flex w-full items-center justify-center rounded-full bg-[var(--color-primary)] px-6 py-2.5 text-sm font-bold text-white disabled:opacity-70"
        >
          {isPending || stripeHandoffUrl ? "Redirecionando..." : "Ir para pagamento seguro"}
        </button>
      </div>
      {stripeHandoffUrl ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="stripe-handoff-title"
        >
          <div className="max-w-md rounded-2xl border border-[var(--color-line)] bg-white p-6 shadow-xl">
            <p
              id="stripe-handoff-title"
              className="text-center font-display text-lg font-black text-[var(--color-ink)]"
            >
              Redirecionando para o pagamento seguro
            </p>
            <p className="mt-3 text-center text-sm leading-relaxed text-[var(--color-muted)]">
              Voce sera enviado para a pagina da Stripe. Se ela ficar em branco ou carregando sem
              parar, desative bloqueadores de anuncios ou apps de DNS privado, teste outra rede
              (Wi‑Fi ou dados) ou abra em aba anonima. No Chrome do celular da para inspecionar em{" "}
              <span className="font-mono text-xs">chrome://inspect</span> e ver se scripts da
              Stripe falharam na aba Rede.
            </p>
            <a
              href={stripeHandoffUrl}
              className="mt-5 flex w-full items-center justify-center rounded-full bg-[var(--color-primary)] px-6 py-3.5 text-center text-sm font-bold text-white no-underline"
            >
              Abrir pagamento na Stripe
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
