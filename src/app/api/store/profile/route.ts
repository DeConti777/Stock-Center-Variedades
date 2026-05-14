import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/auth";
import {
  isValidCpfDigits,
  isValidPhoneBrDigits,
  onlyDigits,
  sanitizeUf,
} from "@/lib/br-fields";
import { getPrismaOrNull } from "@/lib/prisma";
import { resolveSavedDeliveryForPersist } from "@/lib/saved-delivery-address";

const savedDeliveryPatchSchema = z
  .object({
    cep: z.string().min(1),
    street: z.string().min(1),
    number: z.string().min(1),
    complement: z.string().optional().nullable(),
    neighborhood: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
  })
  .strict();

const patchSchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    phone: z.string().optional(),
    cpf: z.string().optional(),
    savedDelivery: z.union([z.null(), savedDeliveryPatchSchema]).optional(),
  })
  .strict()
  .refine(
    (b) =>
      b.name !== undefined ||
      b.phone !== undefined ||
      b.cpf !== undefined ||
      b.savedDelivery !== undefined,
    { message: "Nenhum campo para atualizar." },
  );

function normalizePhone(raw: string | undefined): { ok: true; value: string | null } | { ok: false; message: string } {
  const digits = onlyDigits(raw ?? "");
  if (digits.length === 0) {
    return { ok: true, value: null };
  }
  if (!isValidPhoneBrDigits(digits)) {
    return { ok: false, message: "Telefone invalido. Use DDD + numero (10 ou 11 digitos)." };
  }
  return { ok: true, value: digits };
}

function normalizeCpf(raw: string | undefined): { ok: true; value: string | null } | { ok: false; message: string } {
  const digits = onlyDigits(raw ?? "", 11);
  if (digits.length === 0) {
    return { ok: true, value: null };
  }
  if (!isValidCpfDigits(digits)) {
    return { ok: false, message: "CPF invalido." };
  }
  return { ok: true, value: digits };
}

const savedSelect = {
  savedDeliveryCep: true,
  savedDeliveryStreet: true,
  savedDeliveryNumber: true,
  savedDeliveryComplement: true,
  savedDeliveryNeighborhood: true,
  savedDeliveryCity: true,
  savedDeliveryState: true,
} as const;

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Faca login para alterar seus dados." }, { status: 401 });
    }

    const prisma = getPrismaOrNull();
    if (!prisma) {
      return NextResponse.json({ error: "Banco indisponivel." }, { status: 503 });
    }

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
    }

    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados invalidos. Verifique os campos enviados." },
        { status: 400 },
      );
    }

    const data: Prisma.UserUpdateInput = {};

    if (parsed.data.name !== undefined) {
      const name = parsed.data.name.trim();
      if (name.length < 2) {
        return NextResponse.json({ error: "Informe seu nome completo." }, { status: 400 });
      }
      data.name = name;
    }

    if (parsed.data.phone !== undefined) {
      const phoneNorm = normalizePhone(parsed.data.phone);
      if (!phoneNorm.ok) {
        return NextResponse.json({ error: phoneNorm.message }, { status: 400 });
      }
      data.phone = phoneNorm.value;
    }

    if (parsed.data.cpf !== undefined) {
      const cpfNorm = normalizeCpf(parsed.data.cpf);
      if (!cpfNorm.ok) {
        return NextResponse.json({ error: cpfNorm.message }, { status: 400 });
      }
      data.cpf = cpfNorm.value;
    }

    if (parsed.data.savedDelivery !== undefined) {
      if (parsed.data.savedDelivery === null) {
        data.savedDeliveryCep = null;
        data.savedDeliveryStreet = null;
        data.savedDeliveryNumber = null;
        data.savedDeliveryComplement = null;
        data.savedDeliveryNeighborhood = null;
        data.savedDeliveryCity = null;
        data.savedDeliveryState = null;
      } else {
        const d = parsed.data.savedDelivery;
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
        Object.assign(data, resolved.data);
      }
    }

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data,
      select: {
        name: true,
        email: true,
        phone: true,
        cpf: true,
        ...savedSelect,
      },
    });

    return NextResponse.json({
      user: {
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        cpf: updated.cpf,
        savedDelivery: {
          cep: updated.savedDeliveryCep,
          street: updated.savedDeliveryStreet,
          number: updated.savedDeliveryNumber,
          complement: updated.savedDeliveryComplement,
          neighborhood: updated.savedDeliveryNeighborhood,
          city: updated.savedDeliveryCity,
          state: updated.savedDeliveryState,
        },
      },
    });
  } catch (error) {
    console.error("[api/store/profile PATCH]", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json(
        { error: "Conta nao encontrada. Faca login novamente." },
        { status: 404 },
      );
    }
    const message = error instanceof Error ? error.message : String(error);
    if (/savedDelivery|does not exist|no such column/i.test(message)) {
      return NextResponse.json(
        {
          error:
            "Banco de dados desatualizado (faltam colunas de endereco). Rode `npx prisma db push` ou aplique as migracoes e reinicie o servidor.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "Nao foi possivel salvar os dados. Tente novamente." },
      { status: 500 },
    );
  }
}
