"use client";

import { useEffect, useRef } from "react";
import {
  COOKIE_CONSENT_ACCEPTED_EVENT,
  COOKIE_CONSENT_STORAGE_KEY,
} from "@/lib/cookie-consent";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function readMeasurementId(): string | undefined {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  return id || undefined;
}

function hasConsent(): boolean {
  try {
    return localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function injectGtag(measurementId: string) {
  const scriptId = `ga4-gtag-${measurementId}`;
  if (document.getElementById(scriptId)) return;

  const script = document.createElement("script");
  script.id = scriptId;
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer!.push(args);
  };
  window.gtag("js", new Date());
  window.gtag("config", measurementId);
}

export function ConditionalAnalytics() {
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!readMeasurementId()) return;

    function tryLoad() {
      const mid = readMeasurementId();
      if (!mid || !hasConsent()) return;
      const scriptId = `ga4-gtag-${mid}`;
      if (document.getElementById(scriptId)) {
        loadedRef.current = true;
        return;
      }
      if (loadedRef.current) return;
      injectGtag(mid);
      loadedRef.current = true;
    }

    tryLoad();

    function onAccepted() {
      tryLoad();
    }

    function onStorage(e: StorageEvent) {
      if (e.key === COOKIE_CONSENT_STORAGE_KEY) onAccepted();
    }

    window.addEventListener(COOKIE_CONSENT_ACCEPTED_EVENT, onAccepted);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(COOKIE_CONSENT_ACCEPTED_EVENT, onAccepted);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return null;
}
