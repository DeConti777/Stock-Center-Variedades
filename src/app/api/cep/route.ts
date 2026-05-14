import { NextResponse } from "next/server";
import { lookupCepWithShipping } from "@/lib/cep-fetch";

export async function GET(request: Request) {
  const cep = new URL(request.url).searchParams.get("cep")?.replace(/\D/g, "") ?? "";

  if (cep.length !== 8) {
    return NextResponse.json(
      { error: "Informe o CEP com 8 digitos." },
      { status: 400 },
    );
  }

  const result = await lookupCepWithShipping(cep);

  if (!result) {
    return NextResponse.json(
      { error: "CEP nao encontrado. Verifique e tente novamente." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ...result,
    shippingReais: result.shippingInCents / 100,
  });
}
