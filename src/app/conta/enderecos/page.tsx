import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AccountAddressesView } from "@/components/account/account-addresses-view";
import { getPrismaOrNull } from "@/lib/prisma";
import { getUserSavedAddressDelegate } from "@/lib/prisma-user-saved-address";
import { onlyDigits } from "@/lib/br-fields";
import { pickSavedDeliveryForCheckout } from "@/lib/saved-delivery-address";

export const metadata: Metadata = {
  title: "Endereços",
  description: "Gerencie seu endereço de entrega favorito para preencher o checkout automaticamente.",
};

export default async function AccountAddressesPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?next=/conta/enderecos");
  }

  const prisma = getPrismaOrNull();

  const emptyInitial = {
    cep: null as string | null,
    street: null as string | null,
    number: null as string | null,
    complement: null as string | null,
    neighborhood: null as string | null,
    city: null as string | null,
    state: null as string | null,
  };

  if (!prisma) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-[var(--color-line)] bg-white px-6 py-8 shadow-[var(--shadow-soft)] sm:px-10">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">Minha conta</p>
          <h1 className="mt-4 font-display text-4xl font-black tracking-tight text-[var(--color-ink)] sm:text-5xl">
            Endereços
          </h1>
          <Link
            href="/conta"
            className="mt-6 inline-flex items-center gap-1 text-sm font-bold text-[var(--color-primary)] hover:underline"
          >
            <span aria-hidden>‹</span> Voltar para Minha conta
          </Link>
        </div>
        <div className="rounded-[2rem] border border-[var(--color-line)] bg-white p-8 text-center text-[var(--color-muted)] shadow-[var(--shadow-soft)]">
          Servico temporariamente indisponivel.
        </div>
      </div>
    );
  }

  const savedAddr = getUserSavedAddressDelegate(prisma);
  const [dbUser, extras] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        phone: true,
        savedDeliveryCep: true,
        savedDeliveryStreet: true,
        savedDeliveryNumber: true,
        savedDeliveryComplement: true,
        savedDeliveryNeighborhood: true,
        savedDeliveryCity: true,
        savedDeliveryState: true,
      },
    }),
    savedAddr
      ? savedAddr.findMany({
          where: { userId: session.user.id },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const primaryInitial = dbUser
    ? {
        cep: dbUser.savedDeliveryCep,
        street: dbUser.savedDeliveryStreet,
        number: dbUser.savedDeliveryNumber,
        complement: dbUser.savedDeliveryComplement,
        neighborhood: dbUser.savedDeliveryNeighborhood,
        city: dbUser.savedDeliveryCity,
        state: dbUser.savedDeliveryState,
      }
    : emptyInitial;

  const userForPick = dbUser ?? {
    savedDeliveryCep: null,
    savedDeliveryStreet: null,
    savedDeliveryNumber: null,
    savedDeliveryComplement: null,
    savedDeliveryNeighborhood: null,
    savedDeliveryCity: null,
    savedDeliveryState: null,
  };

  const hasPrimarySaved = pickSavedDeliveryForCheckout(userForPick) !== null;

  const customerName = dbUser?.name?.trim() || session.user.name || "Cliente";
  const phoneDigits = onlyDigits(dbUser?.phone ?? "");

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] border border-[var(--color-line)] bg-white px-6 py-8 shadow-[var(--shadow-soft)] sm:px-10">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--color-muted)]">Minha conta</p>
        <h1 className="mt-4 font-display text-4xl font-black tracking-tight text-[var(--color-ink)] sm:text-5xl">
          Endereços
        </h1>
        <p className="mt-3 max-w-2xl text-base text-[var(--color-muted)]">
          Endereco favorito no checkout e enderecos adicionais salvos na sua conta.
        </p>
        <Link
          href="/conta"
          className="mt-6 inline-flex items-center gap-1 text-sm font-bold text-[var(--color-primary)] hover:underline"
        >
          <span aria-hidden>‹</span> Voltar para Minha conta
        </Link>
      </div>

      <AccountAddressesView
        primaryInitial={primaryInitial}
        hasPrimarySaved={hasPrimarySaved}
        extras={extras.map((ex) => ({
          id: ex.id,
          cep: ex.cep,
          street: ex.street,
          number: ex.number,
          complement: ex.complement,
          neighborhood: ex.neighborhood,
          city: ex.city,
          state: ex.state,
          label: ex.label,
        }))}
        customerName={customerName}
        phoneDigits={phoneDigits}
      />
    </div>
  );
}
