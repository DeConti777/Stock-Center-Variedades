import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminProductsManager } from "@/components/admin/admin-products-manager";

export const metadata: Metadata = {
  title: "Criacao de Produtos | Painel Administrativo",
  description: "Pagina dedicada para criacao manual e em massa de produtos.",
};

export default async function AdminProductCreationPage() {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] bg-[var(--color-ink)] px-5 py-6 text-white sm:rounded-[2.5rem] sm:px-10 sm:py-10">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-white/60">
          Painel administrativo
        </p>
        <h1 className="mt-4 max-w-4xl font-display text-3xl font-black tracking-tight sm:text-5xl">
          Criacao de Produtos
        </h1>
        <p className="mt-4 text-sm text-white/80">
          Use esta pagina para cadastrar produtos manualmente ou em massa com IA.
        </p>
        <Link
          href="/admin"
          className="mt-6 inline-flex items-center rounded-full border border-white/40 px-5 py-2 text-sm font-semibold text-white hover:bg-white/10"
        >
          Voltar ao painel
        </Link>
      </div>

      <AdminProductsManager mode="create" />
    </div>
  );
}
