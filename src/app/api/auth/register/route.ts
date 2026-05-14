import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { sanitizeUf } from "@/lib/br-fields";
import { getPrismaOrNull } from "@/lib/prisma";
import { resolveSavedDeliveryForPersist } from "@/lib/saved-delivery-address";

const registerSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().min(8).optional(),
  delivery: z
    .object({
      cep: z.string().min(1),
      street: z.string().min(1),
      number: z.string().min(1),
      complement: z.string().optional().nullable(),
      neighborhood: z.string().min(1),
      city: z.string().min(1),
      state: z.string().min(1),
    })
    .strict(),
});

export async function POST(request: Request) {
  const prisma = getPrismaOrNull();

  if (!prisma) {
    return NextResponse.json(
      { error: "Banco de dados nao configurado." },
      { status: 503 },
    );
  }

  const body = await request.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos para cadastro." },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    return NextResponse.json(
      { error: "Ja existe uma conta com esse e-mail." },
      { status: 409 },
    );
  }

  const d = parsed.data.delivery;
  const resolved = await resolveSavedDeliveryForPersist({
    cep: d.cep,
    street: d.street,
    number: d.number,
    complement: d.complement,
    neighborhood: d.neighborhood,
    city: d.city,
    state: sanitizeUf(d.state),
  });

  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        name: parsed.data.name,
        email,
        phone: parsed.data.phone?.trim() || null,
        passwordHash,
        ...resolved.data,
        cart: {
          create: {},
        },
      },
    });

    const guestOrders = await tx.order.findMany({
      where: {
        customerEmail: email,
        user: {
          email: {
            endsWith: "@stockcenter.local",
          },
        },
      },
      select: {
        id: true,
      },
    });

    if (guestOrders.length > 0) {
      for (const order of guestOrders) {
        await tx.order.update({
          where: { id: order.id },
          data: {
            userId: createdUser.id,
            checkoutEvents: {
              create: {
                userId: createdUser.id,
                type: "ACCOUNT_LINKED",
                message:
                  "Pedido de convidado vinculado automaticamente a nova conta pelo e-mail.",
              },
            },
          },
        });
      }
    }

    return createdUser;
  });

  return NextResponse.json({
    id: user.id,
    email: user.email,
  });
}
