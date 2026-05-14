import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { syncUserCart } from "@/lib/store-server";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  const body = (await request.json()) as { items: Array<{ productId: string; quantity: number }> };

  await syncUserCart(session.user.id, body.items || []);

  return NextResponse.json({ ok: true });
}
