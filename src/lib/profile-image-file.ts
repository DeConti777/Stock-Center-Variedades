import { unlink } from "node:fs/promises";
import path from "node:path";

export function isStoredProfileImage(url: string | null | undefined): url is string {
  return typeof url === "string" && url.startsWith("/uploads/profile/");
}

export async function removeStoredProfileImageFile(url: string | null | undefined) {
  if (!isStoredProfileImage(url)) {
    return;
  }
  const absolute = path.join(process.cwd(), "public", url.replace(/^\//, ""));
  try {
    await unlink(absolute);
  } catch {
    /* arquivo ausente */
  }
}
