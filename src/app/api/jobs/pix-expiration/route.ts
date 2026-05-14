import { NextResponse } from "next/server";
import { getPrismaOrNull } from "@/lib/prisma";
import { expireReservedPixOrders } from "@/lib/pix-inventory";

function hasCronAuthorization(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    if (!cronSecret) return false;
    const authHeader = request.headers.get("authorization") || "";
    return authHeader === `Bearer ${cronSecret}`;
  }

  if (!cronSecret) return true;

  const authHeader = request.headers.get("authorization") || "";
  return authHeader === `Bearer ${cronSecret}`;
}

async function runExpiration(request: Request) {
  if (!hasCronAuthorization(request)) {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  const prisma = getPrismaOrNull();
  if (!prisma) {
    return NextResponse.json(
      { error: "Banco de dados nao configurado." },
      { status: 503 },
    );
  }

  const result = await expireReservedPixOrders(prisma);
  return NextResponse.json({
    ok: true,
    matched: result.matched,
    released: result.released,
  });
}

export async function POST(request: Request) {
  return runExpiration(request);
}

// Muitos agendadores externos usam GET; POST continua disponível.
export async function GET(request: Request) {
  return runExpiration(request);
}
