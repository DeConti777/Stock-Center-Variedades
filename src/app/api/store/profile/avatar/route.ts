import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { removeStoredProfileImageFile } from "@/lib/profile-image-file";
import { getPrismaOrNull } from "@/lib/prisma";

const MAX_BYTES = 5 * 1024 * 1024;

/** Erros típicos quando a coluna `profileImage` não existe no SQLite ou o client Prisma está velho. */
function isProfileImageSchemaError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2022" && /profileImage/i.test(JSON.stringify(error.meta ?? {}))) {
      return true;
    }
  }
  const msg = error instanceof Error ? error.message : String(error);
  return (
    /no such column:?\s*[`"]?User\.profileImage|no such column:?\s*[`"]?profileImage/i.test(msg) ||
    /Unknown argument\s*`profileImage`/i.test(msg)
  );
}

const SCHEMA_SYNC_HINT =
  " Pare o servidor, rode na pasta do projeto: npx prisma db push && npx prisma generate. " +
  "No Windows, verifique se nao ha DATABASE_URL nas variaveis de ambiente do sistema (sobrescreve o .env).";

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

function extFromFilename(name: string): string | undefined {
  const lower = name.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return ".jpg";
  if (lower.endsWith(".png")) return ".png";
  if (lower.endsWith(".webp")) return ".webp";
  if (lower.endsWith(".gif")) return ".gif";
  return undefined;
}

/** No servidor, `FormData` pode devolver `Blob` ou `File` de outro realm — `instanceof File` falha. */
function getUploadedImage(entry: FormDataEntryValue | null): { blob: Blob; fileName: string } | null {
  if (entry == null || typeof entry === "string") return null;
  if (!(entry instanceof Blob) || entry.size === 0) return null;
  const fileName = entry instanceof File ? entry.name : "upload";
  return { blob: entry, fileName };
}

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Faca login para alterar a foto." }, { status: 401 });
    }

    const prisma = getPrismaOrNull();
    if (!prisma) {
      return NextResponse.json({ error: "Banco indisponivel." }, { status: 503 });
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: "Formulario invalido." }, { status: 400 });
    }

    const uploaded = getUploadedImage(formData.get("file"));
    if (!uploaded) {
      return NextResponse.json({ error: "Selecione uma imagem." }, { status: 400 });
    }

    const { blob, fileName } = uploaded;
    const mimeType = blob.type || "";
    const ext = MIME_TO_EXT[mimeType] ?? extFromFilename(fileName);
    if (!ext) {
      return NextResponse.json(
        { error: "Formato nao suportado. Use JPEG, PNG, WebP ou GIF." },
        { status: 400 },
      );
    }

    if (blob.size > MAX_BYTES) {
      return NextResponse.json({ error: "Imagem muito grande (maximo 5 MB)." }, { status: 413 });
    }

    const previous = (await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { profileImage: true } as Prisma.UserSelect,
    })) as { profileImage: string | null } | null;

    const buffer = Buffer.from(await blob.arrayBuffer());
    const filename = `${randomUUID()}${ext}`;
    const relativeDir = path.join("public", "uploads", "profile");
    const absoluteDir = path.join(process.cwd(), relativeDir);
    const absoluteFile = path.join(absoluteDir, filename);

    await mkdir(absoluteDir, { recursive: true });
    await writeFile(absoluteFile, buffer);

    const url = `/uploads/profile/${filename}`;

    try {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { profileImage: url } as Prisma.UserUpdateInput,
      });
    } catch (updateErr) {
      try {
        await unlink(absoluteFile);
      } catch {
        /* arquivo ausente */
      }
      throw updateErr;
    }

    if (previous?.profileImage) {
      await removeStoredProfileImageFile(previous.profileImage);
    }

    return NextResponse.json({ profileImage: url });
  } catch (error) {
    console.error("[api/store/profile/avatar POST]", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json(
        {
          error:
            "Usuario nao encontrado no banco para esta sessao. Faca logout, login de novo e tente outra vez.",
        },
        { status: 404 },
      );
    }
    const hint = isProfileImageSchemaError(error) ? SCHEMA_SYNC_HINT : "";
    return NextResponse.json(
      {
        error: `Nao foi possivel salvar a foto.${hint}`.trim(),
      },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Faca login." }, { status: 401 });
    }

    const prisma = getPrismaOrNull();
    if (!prisma) {
      return NextResponse.json({ error: "Banco indisponivel." }, { status: 503 });
    }

    const previous = (await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { profileImage: true } as Prisma.UserSelect,
    })) as { profileImage: string | null } | null;

    await prisma.user.update({
      where: { id: session.user.id },
      data: { profileImage: null } as Prisma.UserUpdateInput,
    });

    if (previous?.profileImage) {
      await removeStoredProfileImageFile(previous.profileImage);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/store/profile/avatar DELETE]", error);
    const hint = isProfileImageSchemaError(error) ? SCHEMA_SYNC_HINT : "";
    return NextResponse.json(
      { error: `Nao foi possivel remover a foto.${hint}`.trim() },
      { status: 500 },
    );
  }
}
