import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminProductsManager } from "@/components/admin/admin-products-manager";
import { PageHighlight } from "@/components/ui/page-highlight";

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
      <PageHighlight
        eyebrow="Painel administrativo"
        title="Criacao de Produtos"
        description="Use esta pagina para cadastrar produtos manualmente ou em massa com IA."
      >
        <Link
          href="/admin"
          className="inline-flex items-center rounded-full border border-[var(--color-line)] px-5 py-2 text-sm font-semibold text-[var(--color-ink)] hover:bg-[var(--color-soft)]"
        >
          Voltar ao painel
        </Link>
      </PageHighlight>

      <AdminProductsManager mode="create" />
    </div>
  );
}
