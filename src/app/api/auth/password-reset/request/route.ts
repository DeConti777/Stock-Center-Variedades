import { createHash, randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sendPasswordResetCodeEmail } from "@/lib/email";
import { getPrismaOrNull } from "@/lib/prisma";

const requestSchema = z.object({
  email: z.string().email(),
});

const CODE_EXPIRES_MINUTES = 10;

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
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "E-mail invalido." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true },
  });

  // Resposta generica para nao revelar se o e-mail existe.
  if (!user) {
    return NextResponse.json({ ok: true });
  }

  const code = String(randomInt(100000, 1000000));
  const expiresAt = new Date(Date.now() + CODE_EXPIRES_MINUTES * 60 * 1000);

  await prisma.passwordResetCode.create({
    data: {
      userId: user.id,
      codeHash: hashCode(code),
      expiresAt,
    },
  });

  const emailResult = await sendPasswordResetCodeEmail({
    to: user.email,
    name: user.name,
    code,
    expiresInMinutes: CODE_EXPIRES_MINUTES,
  });

  if (!emailResult.ok) {
    return NextResponse.json(
      {
        error:
          "Servico de e-mail indisponivel no momento. Verifique RESEND_API_KEY e RESEND_FROM_EMAIL.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true });
}
