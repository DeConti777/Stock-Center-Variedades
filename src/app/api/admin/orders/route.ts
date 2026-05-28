import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { listAdminOrders, updateOrderStatus } from "@/lib/admin-server";
import {
  adminOrderPatchSchema,
  formatAdminOrderPatchError,
} from "@/lib/admin-order-patch";

function unauthorizedResponse() {
  return NextResponse.json(
    { error: "Nao autorizado." },
    { status: 403 },
  );
}

export async function GET() {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return unauthorizedResponse();
  }

  const orders = await listAdminOrders();
  return NextResponse.json({ orders });
}

export async function PATCH(request: Request) {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return unauthorizedResponse();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "JSON invalido." },
      { status: 400 },
    );
  }

  const result = adminOrderPatchSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: formatAdminOrderPatchError(result.error) },
      { status: 400 },
    );
  }

  const { id, ...input } = result.data;

  try {
    const order = await updateOrderStatus(id, input);
    return NextResponse.json({ order });
  } catch (error) {
    console.error("[admin/orders PATCH]", error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2022" ||
        error.message.includes("shippingDispatchMode") ||
        error.message.includes("does not exist"))
    ) {
      return NextResponse.json(
        {
          error:
            "Banco desatualizado: execute `npx prisma migrate deploy` para habilitar o modo de despacho.",
        },
        { status: 500 },
      );
    }

    const message =
      error instanceof Error ? error.message : "Erro ao atualizar pedido.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
