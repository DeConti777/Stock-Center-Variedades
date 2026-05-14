import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getPrismaOrNull } from "@/lib/prisma";

const validateSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

const MAX_ATTEMPTS = 5;

function hashCode(code: string) {
  const secret = process.env.AUTH_SECRET || "stock-center-dev-secret";
  return createHash("sha256").update(`${code}:${secret}`).digest("hex");
}

export async function POST(request: Request) {
  const prisma = getPrismaOrNull();
  if (!prisma) {
    return NextResponse.json(
      { error: "Banco de dados nao configurado." },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = validateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos para validar codigo." },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Codigo invalido ou expirado." }, { status: 400 });
  }

  const resetCode = await prisma.passwordResetCode.findFirst({
    where: {
      userId: user.id,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!resetCode) {
    return NextResponse.json({ error: "Codigo invalido ou expirado." }, { status: 400 });
  }

  if (resetCode.attempts >= MAX_ATTEMPTS) {
    await prisma.passwordResetCode.update({
      where: { id: resetCode.id },
      data: { usedAt: new Date() },
    });
    return NextResponse.json(
      { error: "Muitas tentativas. Solicite um novo codigo." },
      { status: 429 },
    );
  }

  if (resetCode.codeHash !== hashCode(parsed.data.code)) {
    await prisma.passwordResetCode.update({
      where: { id: resetCode.id },
      data: { attempts: { increment: 1 } },
    });
    return NextResponse.json({ error: "Codigo invalido ou expirado." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
