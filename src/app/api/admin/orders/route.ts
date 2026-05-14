import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { listAdminOrders, updateOrderStatus } from "@/lib/admin-server";

const updateOrderSchema = z.object({
  id: z.string().min(1),
  status: z.string().min(2),
  shippingCode: z.string().optional().nullable(),
  shippingCarrier: z.string().optional().nullable(),
  trackingUrl: z.string().url().optional().nullable().or(z.literal("")),
  invoiceUrl: z.string().url().optional().nullable().or(z.literal("")),
});

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

  const result = updateOrderSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Dados invalidos para atualizar pedido." },
      { status: 400 },
    );
  }

  const { id, ...input } = result.data;
  const order = await updateOrderStatus(id, input);

  return NextResponse.json({ order });
}
