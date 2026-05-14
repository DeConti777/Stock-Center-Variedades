import type { Metadata } from "next";
import { FavoritesView } from "@/components/store/favorites-view";

export const metadata: Metadata = {
  title: "Favoritos",
  description:
    "Guarde seus produtos favoritos para comprar depois com mais praticidade.",
};

export default function FavoritesPage() {
  return <FavoritesView />;
}
