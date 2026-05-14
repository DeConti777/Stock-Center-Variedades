import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ProfilePersonalForm } from "@/components/account/profile-personal-form";
import { getPrismaOrNull } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Informações do perfil",
  description: "Atualize nome, telefone e CPF usados em pedidos e comunicação da loja.",
};

export default async function AccountProfileInfoPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?next=/conta/informacoes");
  }

  const prisma = getPrismaOrNull();

  if (!prisma) {
    const customerName = session.user.name || "Cliente";
    const customerEmail = session.user.email || "";
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-[var(--color-line)] bg-white px-6 py-8 shadow-[var(--shadow-soft)] sm:px-10">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">Minha conta</p>
          <h1 className="mt-4 font-display text-4xl font-black tracking-tight text-[var(--color-ink)] sm:text-5xl">
            Informações do seu perfil
          </h1>
          <p className="mt-3 max-w-2xl text-base text-[var(--color-muted)]">
            Dados usados em pedidos e comunicação da loja. Você pode atualizar nome, telefone e CPF quando precisar.
          </p>
          <Link
            href="/conta"
            className="mt-6 inline-flex items-center gap-1 text-sm font-bold text-[var(--color-primary)] hover:underline"
          >
            <span aria-hidden>‹</span> Voltar para Minha conta
          </Link>
        </div>

        <div className="rounded-[2rem] border border-[var(--color-line)] bg-[var(--color-soft)] p-4 text-sm text-[var(--color-muted)] shadow-[var(--shadow-soft)]">
          Alguns dados podem estar indisponíveis no momento. Se não conseguir salvar, tente novamente mais tarde.
        </div>

        <div className="rounded-[2rem] border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-soft)] sm:p-8">
          <p className="font-display text-lg font-bold text-[var(--color-ink)]">Dados cadastrais</p>
          <ProfilePersonalForm
            customerName={customerName}
            customerEmail={customerEmail}
            phone={null}
            cpf={null}
          />
        </div>
      </div>
    );
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      phone: true,
      cpf: true,
    },
  });

  const customerName = dbUser?.name?.trim() || session.user.name || "Cliente";
  const customerEmail = session.user.email || "";

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] border border-[var(--color-line)] bg-white px-6 py-8 shadow-[var(--shadow-soft)] sm:px-10">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">Minha conta</p>
        <h1 className="mt-4 font-display text-4xl font-black tracking-tight text-[var(--color-ink)] sm:text-5xl">
          Informações do seu perfil
        </h1>
        <p className="mt-3 max-w-2xl text-base text-[var(--color-muted)]">
          Dados usados em pedidos e comunicação da loja. Você pode atualizar nome, telefone e CPF quando precisar.
        </p>
        <Link
          href="/conta"
          className="mt-6 inline-flex items-center gap-1 text-sm font-bold text-[var(--color-primary)] hover:underline"
        >
          <span aria-hidden>‹</span> Voltar para Minha conta
        </Link>
      </div>

      <div className="rounded-[2rem] border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-soft)] sm:p-8">
        <p className="font-display text-lg font-bold text-[var(--color-ink)]">Dados cadastrais</p>
        <ProfilePersonalForm
          customerName={customerName}
          customerEmail={customerEmail}
          phone={dbUser?.phone ?? null}
          cpf={dbUser?.cpf ?? null}
        />
      </div>
    </div>
  );
}
