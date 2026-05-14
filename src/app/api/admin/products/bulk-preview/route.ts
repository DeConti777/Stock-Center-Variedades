import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { listAdminProducts } from "@/lib/admin-server";
import { buildBulkProductDrafts } from "@/lib/admin-bulk-enrichment";

const bulkPreviewSchema = z.object({
  entries: z.array(z.string().min(2)).min(1).max(200),
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
  const parsed = bulkPreviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados invalidos para gerar o preview." },
      { status: 400 },
    );
  }

  const existing = await listAdminProducts();
  const drafts = await buildBulkProductDrafts({
    entries: parsed.data.entries,
    existingProducts: existing.map((item) => ({ slug: item.slug, sku: item.sku })),
  });

  return NextResponse.json({ drafts });
}
