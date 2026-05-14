"use client";

import { useEffect } from "react";
import { isLikelyMobileViewport, trackEcommerceEvent } from "@/lib/analytics";

type PageEventTrackerProps = {
  eventName: "checkout_result";
  payload: Record<string, unknown>;
};

export function PageEventTracker({ eventName, payload }: PageEventTrackerProps) {
  useEffect(() => {
    trackEcommerceEvent(eventName, {
      ...payload,
      is_mobile: isLikelyMobileViewport(),
    });
  }, [eventName, payload]);

  return null;
}
