import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginPageView } from "@/components/account/login-page-view";
import { getOAuthProviderAvailability } from "@/lib/oauth-providers";

export const metadata: Metadata = {
  title: "Login do Cliente",
  description:
    "Acesse sua conta para acompanhar pedidos, favoritos e recuperar seu carrinho.",
};

export default async function LoginPage() {
  const session = await auth();

  if (session?.user?.id) {
    redirect("/conta");
  }

  return (
    <LoginPageView oauthAvailability={getOAuthProviderAvailability()} />
  );
}
