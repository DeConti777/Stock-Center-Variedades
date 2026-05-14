import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dedupeProductImageUrlsGlobally } from "@/lib/admin-server";

function unauthorizedResponse() {
  return NextResponse.json({ error: "Nao autorizado." }, { status: 403 });
}

export async function POST() {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return unauthorizedResponse();
  }

  try {
    const result = await dedupeProductImageUrlsGlobally();
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao deduplicar imagens.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
