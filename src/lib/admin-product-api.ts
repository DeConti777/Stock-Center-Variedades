import { Prisma } from "@prisma/client";
import { z } from "zod";
import { coercePackageFieldsInBody } from "@/lib/package-dimensions";

const packageInt = z.union([
  z.number().int().min(1).max(200),
  z.null(),
]);

const packageWeight = z.union([z.number().min(0.01).max(30), z.null()]);

export const adminPackageFieldsSchema = {
  packageWidthCm: packageInt.optional(),
  packageHeightCm: packageInt.optional(),
  packageLengthCm: packageInt.optional(),
  packageWeightKg: packageWeight.optional(),
};

export function prepareAdminProductBody(body: Record<string, unknown>) {
  return coercePackageFieldsInBody(body);
}

export function formatZodValidationError(error: z.ZodError): string {
  const first = error.issues[0];
  if (!first) return "Dados invalidos.";
  const path = first.path.length > 0 ? `${first.path.join(".")}: ` : "";
  return `${path}${first.message}`;
}

export function formatAdminProductSaveError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return formatZodValidationError(error);
  }
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    const target = Array.isArray(error.meta?.target)
      ? (error.meta.target as string[]).join(", ")
      : "campo unico";
    if (target.includes("slug")) {
      return "Ja existe um produto com este slug.";
    }
    if (target.includes("sku")) {
      return "Ja existe um produto com este SKU.";
    }
    return "Slug ou SKU ja cadastrado em outro produto.";
  }
  if (error instanceof Error) {
    if (error.message.includes("Unique constraint")) {
      if (error.message.includes("slug")) {
        return "Ja existe um produto com este slug.";
      }
      if (error.message.includes("sku")) {
        return "Ja existe um produto com este SKU.";
      }
      return "Slug ou SKU ja cadastrado em outro produto.";
    }
    if (error.message.includes("Produto nao encontrado")) {
      return error.message;
    }
    return error.message;
  }
  return "Erro ao salvar produto.";
}
