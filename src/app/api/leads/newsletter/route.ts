import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { sendInboxNotification } from "@/lib/email";
import { getPrismaOrNull } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

const bodySchema = z.object({
  email: z.string().email(),
  source: z.enum(["home", "footer", "other"]).optional(),
});

function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export async function POST(request: Request) {
  const prisma = getPrismaOrNull();
  if (!prisma) {
    return NextResponse.json(
      { error: "Banco de dados nao configurado." },
      { status: 503 },
    );
  }

  const ip = clientIp(request);
  const limited = checkRateLimit(`lead:newsletter:${ip}`, {
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Muitas tentativas. Tente novamente mais tarde." },
      { status: 429 },
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
    return NextResponse.json({ error: "E-mail invalido." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const source = parsed.data.source ?? "home";

  try {
    await prisma.newsletterSubscription.create({
      data: { email, source },
    });
    await sendInboxNotification({
      subject: `[Newsletter] novo cadastro: ${email}`,
      html: `<p>Novo e-mail na newsletter: <strong>${email.replace(/</g, "")}</strong></p><p>Origem: ${source}</p>`,
    });
    return NextResponse.json({ ok: true, created: true });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ ok: true, alreadySubscribed: true });
    }
    throw error;
  }
}
