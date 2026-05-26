import Link from "next/link";
import type { ReactNode } from "react";
import { formatCurrency } from "@/lib/catalog";
import { getOrderStatusLabel } from "@/lib/order-status";
import {
  AccountMenuRow,
  IconMapPin,
  IconProfileCard,
  profileNeedsAttention,
} from "@/components/account/account-menu-row";
import { EditableProfileAvatarHero } from "@/components/account/editable-profile-avatar-hero";
import {
  OrderItemsPreview,
  type OrderPreviewLineItem,
} from "@/components/account/order-items-preview";
import { ProfileSecurityBanner } from "@/components/account/profile-security-banner";

type RecentOrder = {
  id: string;
  totalInCents: number;
  status: string;
  createdAt: string;
  items: OrderPreviewLineItem[];
};

function ProfileCard({
  href,
  title,
  description,
  icon,
  badge,
}: {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
  badge?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col rounded-[1.5rem] border border-[var(--color-line)] bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(15,23,42,0.09)]"
    >
      {badge ? (
        <span
          className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-gold-soft)] text-sm font-black text-[var(--color-primary)]"
          aria-hidden
        >
          !
        </span>
      ) : null}
      <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-soft)] text-[var(--color-ink)]">
        {icon}
      </span>
      <p className="font-display text-lg font-bold text-[var(--color-ink)] group-hover:text-[var(--color-primary)]">
        {title}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">{description}</p>
    </Link>
  );
}

export function AccountPageView({
  customerName,
  customerEmail,
  profileImage,
  phone,
  cpf,
  favoritesCount,
  lastRecoveredAt,
  orderCount,
  recentOrders,
}: {
  customerName: string;
  customerEmail: string;
  profileImage: string | null;
  phone: string | null;
  cpf: string | null;
  favoritesCount: number;
  lastRecoveredAt: string | null;
  orderCount: number;
  recentOrders: RecentOrder[];
}) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-6 rounded-[2rem] border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-soft)] sm:flex-row sm:items-center sm:gap-8 sm:p-8">
        <EditableProfileAvatarHero
          profileImage={profileImage}
          customerName={customerName}
          customerEmail={customerEmail}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)]">
            Minha conta
          </p>
          <h1 className="mt-2 font-display text-3xl font-black tracking-tight text-[var(--color-ink)] sm:text-4xl">
            {customerName || "Cliente Stock Center"}
          </h1>
          <p className="mt-2 text-base text-[var(--color-muted)]">{customerEmail}</p>
        </div>
      </div>

      <ProfileSecurityBanner />

      <section id="informacoes" className="scroll-mt-28 rounded-[2rem] border border-[var(--color-line)] bg-white px-2 py-2 shadow-[var(--shadow-soft)] sm:px-4">
        <AccountMenuRow
          href="/conta/informacoes"
          label="Informações do seu perfil"
          icon={<IconProfileCard />}
          badge={profileNeedsAttention(phone, cpf)}
        />
        <AccountMenuRow href="/conta/enderecos" label="Endereços" icon={<IconMapPin />} />
      </section>

      <div>
        <h2 className="font-display text-xl font-bold text-[var(--color-ink)]">Atalhos</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <ProfileCard
            href="/conta/pedidos"
            title="Historico de compras"
            description={`${orderCount} pedido(s) · status, pagamento e entrega.`}
            icon={
              <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" strokeLinecap="round" />
              </svg>
            }
          />
          <ProfileCard
            href="/conta/opinioes"
            title="Opinioes"
            description="Avalie produtos que voce comprou com fotos e comentarios."
            icon={
              <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 17l-5 3 1-6-4-4 6-1 3-5 3 5 6 1-4 4 1 6-5-3z" strokeLinejoin="round" />
              </svg>
            }
          />
          <ProfileCard
            href="/esqueci-senha"
            title="Seguranca"
            description="Alterar senha e recuperar acesso."
            icon={
              <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 118 0v4" strokeLinecap="round" />
              </svg>
            }
          />
          <ProfileCard
            href="/favoritos"
            title="Favoritos"
            description={`${favoritesCount} produto(s) salvos para depois.`}
            icon={
              <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 21l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.18L12 21z" />
              </svg>
            }
          />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <article className="rounded-[2rem] border border-[var(--color-line)] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <p className="text-sm uppercase tracking-[0.22em] text-[var(--color-muted)]">Resumo</p>
          <p className="mt-3 text-2xl font-bold text-[var(--color-ink)]">{orderCount} pedidos</p>
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
            Acompanhe envios e pagamentos na area de pedidos.
          </p>
        </article>
        <article className="rounded-[2rem] border border-[var(--color-line)] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <p className="text-sm uppercase tracking-[0.22em] text-[var(--color-muted)]">Favoritos</p>
          <p className="mt-3 text-2xl font-bold text-[var(--color-ink)]">{favoritesCount} salvos</p>
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
            Lista sincronizada com sua conta em qualquer dispositivo.
          </p>
        </article>
        <article className="rounded-[2rem] border border-[var(--color-line)] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <p className="text-sm uppercase tracking-[0.22em] text-[var(--color-muted)]">Carrinho</p>
          <p className="mt-3 text-2xl font-bold text-[var(--color-ink)]">
            {lastRecoveredAt ? "Sincronizado" : "Sem recuperacao recente"}
          </p>
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
            Depois do login, seu carrinho pode continuar de onde parou.
          </p>
        </article>
      </div>

      <section className="min-w-0 rounded-[2rem] border border-[var(--color-line)] bg-white p-4 shadow-[var(--shadow-soft)] sm:p-6">
        <h2 className="font-display text-2xl font-bold text-[var(--color-ink)]">Pedidos recentes</h2>
        <div className="mt-6 space-y-4">
          {recentOrders.length ? (
            recentOrders.map((order) => {
              const orderCode = order.id.slice(0, 8).toUpperCase();
              const orderDate = new Date(order.createdAt).toLocaleDateString("pt-BR");
              const orderTotal = formatCurrency(order.totalInCents / 100);
              const orderStatus = getOrderStatusLabel(order.status);

              return (
                <Link
                  key={order.id}
                  href={`/conta/pedidos/${order.id}`}
                  className="flex min-w-0 flex-col gap-3 overflow-hidden rounded-[1.5rem] bg-[var(--color-soft)] p-4 transition hover:-translate-y-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-5"
                >
                  <div className="flex min-w-0 items-start justify-between gap-3 sm:hidden">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--color-ink)]">
                        Pedido{" "}
                        <span className="font-mono tracking-wide">{orderCode}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--color-muted)]">{orderDate}</p>
                    </div>
                    <div className="shrink-0 text-right text-sm">
                      <p className="font-bold text-[var(--color-ink)]">{orderTotal}</p>
                      <p className="text-xs text-[var(--color-muted)]">{orderStatus}</p>
                    </div>
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                    <OrderItemsPreview items={order.items} compact />
                    <div className="hidden min-w-0 flex-1 sm:block">
                      <p className="truncate font-semibold text-[var(--color-ink)]">
                        Pedido{" "}
                        <span className="font-mono tracking-wide">{orderCode}</span>
                      </p>
                      <p className="mt-1 text-sm text-[var(--color-muted)]">{orderDate}</p>
                    </div>
                  </div>

                  <div className="hidden shrink-0 text-sm sm:block sm:text-right">
                    <p className="font-bold text-[var(--color-ink)]">{orderTotal}</p>
                    <p className="text-[var(--color-muted)]">{orderStatus}</p>
                  </div>
                </Link>
              );
            })
          ) : (
            <p className="text-sm text-[var(--color-muted)]">
              Seus pedidos pagos aparecerao aqui depois do primeiro checkout.
            </p>
          )}
        </div>
      </section>
      <Link
        href="/conta/pedidos"
        className="inline-flex w-fit items-center justify-center rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-bold text-white"
      >
        Ver todos os pedidos
      </Link>
    </div>
  );
}
