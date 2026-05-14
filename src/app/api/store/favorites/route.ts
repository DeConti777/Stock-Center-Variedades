import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { toggleUserFavorite } from "@/lib/store-server";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  const body = (await request.json()) as { productId?: string };

  if (!body.productId) {
    return NextResponse.json(
      { error: "Produto invalido." },
      { status: 400 },
    );
  }

  const result = await toggleUserFavorite(session.user.id, body.productId);
  return NextResponse.json(result);
}
