import type { Metadata } from "next";
import { ForgotPasswordView } from "@/components/account/forgot-password-view";

export const metadata: Metadata = {
  title: "Esqueci minha senha",
  description:
    "Recupere o acesso da sua conta com verificacao em duas etapas por e-mail.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordView />;
}
