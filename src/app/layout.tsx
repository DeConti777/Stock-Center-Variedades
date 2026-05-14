import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { ConditionalAnalytics } from "@/components/layout/conditional-analytics";
import { SiteChrome } from "@/components/layout/site-chrome";
import { SiteWideJsonLd } from "@/components/seo/site-wide-json-ld";
import { StoreProvider } from "@/components/store/store-provider";
import { auth } from "@/auth";
import { getUserStoreSnapshot } from "@/lib/store-server";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.stockcentervariedades.com.br"),
  title: {
    default: "Stock Center Variedades | Loja online com ofertas e entrega rapida",
    template: "%s | Stock Center Variedades",
  },
  description:
    "Loja online de utilidades, eletronicos, presentes e organizacao com Pix com desconto, parcelamento e envio para todo o Brasil.",
  keywords: [
    "Stock Center Variedades",
    "loja online",
    "variedades",
    "promocoes",
    "utilidades domesticas",
    "eletronicos",
    "presentes",
    "e-commerce Brasil",
    "comprar online com pix",
    "ofertas com entrega rapida",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Stock Center Variedades | Compre online com seguranca",
    description:
      "Ofertas em utilidades, presentes e eletronicos com Pix com desconto, suporte humano e entrega rapida.",
    url: "https://www.stockcentervariedades.com.br",
    siteName: "Stock Center Variedades",
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: "/stock-center-logo.png",
        width: 512,
        height: 512,
        alt: "Stock Center Variedades",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Stock Center Variedades | Loja online confiavel",
    description:
      "Compre com seguranca, aproveite ofertas reais e receba rapido em todo o Brasil.",
    images: ["/stock-center-logo.png"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const viewer = session?.user
    ? {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
        profileImage: session.user.profileImage ?? null,
      }
    : null;
  const storeSnapshot = viewer
    ? await getUserStoreSnapshot(viewer.id)
    : { cart: [], favorites: [], visitedProductIds: [], lastRecoveredAt: null };

  return (
    <html
      lang="pt-BR"
      className={`${manrope.variable} ${spaceGrotesk.variable} h-full`}
    >
      <body className="min-h-full bg-[var(--color-surface)] text-[var(--color-ink)] antialiased">
        <SiteWideJsonLd />
        <StoreProvider
          viewerId={viewer?.id ?? null}
          initialCart={storeSnapshot.cart}
          initialFavorites={storeSnapshot.favorites}
          initialLastRecoveredAt={storeSnapshot.lastRecoveredAt}
          initialVisitedProductIds={storeSnapshot.visitedProductIds}
        >
          <SiteChrome viewer={viewer}>{children}</SiteChrome>
          <ConditionalAnalytics />
        </StoreProvider>
      </body>
    </html>
  );
}
