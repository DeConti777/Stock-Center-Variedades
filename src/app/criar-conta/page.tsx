import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { RegisterPageView } from "@/components/account/register-page-view";

export const metadata: Metadata = {
  title: "Criar conta",
  description:
    "Crie sua conta para acompanhar pedidos, favoritos e concluir seu checkout.",
};

export default async function RegisterPage() {
  const session = await auth();

  if (session?.user?.id) {
    redirect("/conta");
  }

  return <RegisterPageView />;
}
