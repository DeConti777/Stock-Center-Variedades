import type { Metadata } from "next";
import { AboutPageView } from "@/components/institutional/about-page-view";

export const metadata: Metadata = {
  title: "Sobre Nos",
  description:
    "Conheca a historia, a missao e a credibilidade da Stock Center Variedades.",
};

export default function AboutPage() {
  return <AboutPageView />;
}
