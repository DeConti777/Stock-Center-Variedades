"use client";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export type EcommerceEventName =
  | "view_item"
  | "add_to_cart"
  | "begin_checkout"
  | "checkout_submit"
  | "checkout_submit_error"
  | "checkout_stripe_handoff"
  | "checkout_result";

export function isLikelyMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 1024px)").matches;
}

export function trackEcommerceEvent(
  eventName: EcommerceEventName,
  params: Record<string, unknown>,
) {
  if (typeof window === "undefined") return;
  if (typeof window.gtag !== "function") return;
  window.gtag("event", eventName, params);
}
