import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { estimatePackageDimensions } from "@/lib/package-dimensions-ai";

const estimateSchema = z.object({
  name: z.string().min(2),
  category: z.string().optional(),
  shortDescription: z.string().optional(),
  coverImage: z.string().optional(),
  images: z.array(z.string()).optional(),
});

function unauthorizedResponse() {
  return NextResponse.json({ error: "Nao autorizado." }, { status: 403 });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return unauthorizedResponse();
  }

  const body = await request.json();
  const parsed = estimateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos para estimar embalagem." },
      { status: 400 },
    );
  }

  const estimate = await estimatePackageDimensions(parsed.data);
  return NextResponse.json({ estimate });
}
