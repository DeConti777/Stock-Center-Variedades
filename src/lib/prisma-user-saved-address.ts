import type { PrismaClient } from "@prisma/client";

export type UserSavedAddressRow = {
  id: string;
  cep: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  label: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
};

/**
 * O delegate `userSavedAddress` só existe no client depois de `npx prisma generate`
 * com o modelo `UserSavedAddress` no schema. Se for `null`, rode `npx prisma generate`
 * (feche o servidor Next / Cursor que possam travar o DLL no Windows).
 */
export function getUserSavedAddressDelegate(prisma: PrismaClient) {
  const raw = prisma as unknown as Record<string, unknown>;
  const d = raw.userSavedAddress;
  if (d != null && typeof d === "object" && d !== null && "findMany" in d) {
    return d as {
      findMany: (args: {
        where: { userId: string };
        orderBy: { createdAt: "asc" };
      }) => Promise<UserSavedAddressRow[]>;
      findFirst: (args: {
        where: { id: string; userId: string };
      }) => Promise<UserSavedAddressRow | null>;
      create: (args: { data: Record<string, unknown> }) => Promise<UserSavedAddressRow>;
      update: (args: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => Promise<UserSavedAddressRow>;
      deleteMany: (args: {
        where: { id: string; userId: string };
      }) => Promise<{ count: number }>;
    };
  }
  return null;
}
