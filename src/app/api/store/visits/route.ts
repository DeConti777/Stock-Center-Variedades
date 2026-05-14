import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { recordUserProductVisit } from "@/lib/store-server";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  const body = (await request.json()) as { productId?: string };

  if (!body.productId) {
    return NextResponse.json({ error: "Produto invalido." }, { status: 400 });
  }

  await recordUserProductVisit(session.user.id, body.productId);
  return NextResponse.json({ ok: true });
}
