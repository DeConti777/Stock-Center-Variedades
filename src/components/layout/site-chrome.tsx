import type { ReactNode } from "react";
import { FreeShippingBar } from "@/components/home/free-shipping-bar";
import { CookieConsentBanner } from "@/components/layout/cookie-consent-banner";
import { SkipToMainLink } from "@/components/layout/skip-to-main-link";
import { Header } from "@/components/layout/site-header";
import { Footer } from "@/components/layout/site-footer";
import { FloatingWhatsApp } from "@/components/layout/whatsapp-float";
import type { UserRole } from "@/lib/types";

type Viewer = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: UserRole;
  profileImage?: string | null;
} | null;

export function SiteChrome({
  children,
  viewer,
}: {
  children: ReactNode;
  viewer: Viewer;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <SkipToMainLink />
      <Header viewer={viewer} />
      <FreeShippingBar />
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <Footer />
      <CookieConsentBanner />
      <FloatingWhatsApp />
    </div>
  );
}
