import { NextResponse } from "next/server";
import { z } from "zod";
import { sendInboxNotification } from "@/lib/email";
import { getPrismaOrNull } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

const bodySchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().max(40).optional().or(z.literal("")),
  message: z.string().min(10).max(5000),
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
  const limited = checkRateLimit(`lead:contact:${ip}`, {
    limit: 6,
    windowMs: 60 * 60 * 1000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Muitas mensagens. Tente novamente mais tarde." },
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
    return NextResponse.json(
      { error: "Preencha nome, e-mail e mensagem corretamente." },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLowerCase();
  const phone = parsed.data.phone?.trim() || null;

  await prisma.contactMessage.create({
    data: {
      name: parsed.data.name.trim(),
      email,
      phone,
      message: parsed.data.message.trim(),
    },
  });

  const safe = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  await sendInboxNotification({
    subject: `[Contato site] ${parsed.data.name.trim()}`,
    replyTo: email,
    html: `<p><strong>Nome:</strong> ${safe(parsed.data.name.trim())}</p>
<p><strong>E-mail:</strong> ${safe(email)}</p>
${phone ? `<p><strong>Telefone:</strong> ${safe(phone)}</p>` : ""}
<p><strong>Mensagem:</strong></p><p>${safe(parsed.data.message.trim()).replace(/\n/g, "<br/>")}</p>`,
  });

  return NextResponse.json({ ok: true });
}
