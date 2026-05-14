import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AccountPageView } from "@/components/account/account-page-view";
import { getPrismaOrNull } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Minha Conta",
  description:
    "Acompanhe pedidos, favoritos, recuperacao de carrinho e dados de entrega.",
};

export default async function AccountPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?next=/conta");
  }

  const prisma = getPrismaOrNull();

  const fallbackView = (
    <AccountPageView
      customerName={session.user.name || "Cliente"}
      customerEmail={session.user.email || ""}
      profileImage={session.user.profileImage ?? null}
      phone={null}
      cpf={null}
      favoritesCount={0}
      lastRecoveredAt={null}
      orderCount={0}
      recentOrders={[]}
    />
  );

  if (!prisma) {
    return fallbackView;
  }

  try {
    const [favoritesCount, cart, orderCount, orders, dbUser] = await Promise.all([
      prisma.favorite.count({ where: { userId: session.user.id } }),
      prisma.cart.findUnique({ where: { userId: session.user.id } }),
      prisma.order.count({ where: { userId: session.user.id } }),
      prisma.order.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          items: {
            select: {
              id: true,
              productName: true,
              image: true,
              quantity: true,
            },
          },
        },
      }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          name: true,
          phone: true,
          cpf: true,
        },
      }),
    ]);

    return (
      <AccountPageView
        customerName={dbUser?.name?.trim() || session.user.name || "Cliente"}
        customerEmail={session.user.email || ""}
        profileImage={session.user.profileImage ?? null}
        phone={dbUser?.phone ?? null}
        cpf={dbUser?.cpf ?? null}
        favoritesCount={favoritesCount}
        lastRecoveredAt={cart?.lastRecoveredAt?.toISOString() || null}
        orderCount={orderCount}
        recentOrders={orders.map((order) => ({
          id: order.id,
          totalInCents: order.totalInCents,
          status: order.status,
          createdAt: order.createdAt.toISOString(),
          items: order.items.map((item) => ({
            id: item.id,
            productName: item.productName,
            image: item.image,
            quantity: item.quantity,
          })),
        }))}
      />
    );
  } catch (error) {
    console.error("[conta] falha ao carregar dados (Prisma/schema ou banco):", error);
    return fallbackView;
  }
}
