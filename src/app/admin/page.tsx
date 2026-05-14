import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminPageView } from "@/components/admin/admin-page-view";

export const metadata: Metadata = {
  title: "Painel Administrativo",
  description:
    "Painel simples para acompanhar vendas, pedidos, estoque e campanhas promocionais.",
};

export default async function AdminPage() {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  return <AdminPageView />;
}
