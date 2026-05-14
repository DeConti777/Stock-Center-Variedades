import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { sanitizeUf } from "@/lib/br-fields";
import { getPrismaOrNull } from "@/lib/prisma";
import { getUserSavedAddressDelegate } from "@/lib/prisma-user-saved-address";
import { resolveSavedDeliveryForPersist } from "@/lib/saved-delivery-address";

const bodySchema = z
  .object({
    cep: z.string().min(1),
    street: z.string().min(1),
    number: z.string().min(1),
    complement: z.string().optional().nullable(),
    neighborhood: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    label: z.string().max(80).optional(),
  })
  .strict();

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Faca login para alterar seus dados." }, { status: 401 });
    }

    const prisma = getPrismaOrNull();
    if (!prisma) {
      return NextResponse.json({ error: "Banco indisponivel." }, { status: 503 });
    }

    const savedAddr = getUserSavedAddressDelegate(prisma);
    if (!savedAddr) {
      return NextResponse.json(
        {
          error:
            "Servidor desatualizado: rode `npx prisma generate` na pasta do projeto e reinicie o Next.js.",
        },
        { status: 503 },
      );
    }

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados invalidos." }, { status: 400 });
    }

    const d = parsed.data;
    const resolved = await resolveSavedDeliveryForPersist(
      {
        cep: d.cep,
        street: d.street,
        number: d.number,
        complement: d.complement,
        neighborhood: d.neighborhood,
        city: d.city,
        state: sanitizeUf(d.state),
      },
      { fallbackWithoutApi: true },
    );

    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: 400 });
    }

    const r = resolved.data;
    const label =
      d.label?.trim() ||
      "Endereco residencial";

    const created = await savedAddr.create({
      data: {
        userId: session.user.id,
        cep: r.savedDeliveryCep,
        street: r.savedDeliveryStreet,
        number: r.savedDeliveryNumber,
        complement: r.savedDeliveryComplement,
        neighborhood: r.savedDeliveryNeighborhood,
        city: r.savedDeliveryCity,
        state: r.savedDeliveryState,
        label,
      },
    });

    return NextResponse.json({ address: created });
  } catch (error) {
    console.error("[api/store/profile/extra-addresses POST]", error);
    return NextResponse.json({ error: "Nao foi possivel salvar o endereco." }, { status: 500 });
  }
}
