/** Upload de imagem de produto (painel admin). */
export async function uploadProductImageClient(file: File): Promise<string> {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch("/api/admin/products/upload", {
    method: "POST",
    body,
  });
  const json = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
  if (!res.ok) {
    throw new Error(json?.error || "Falha no envio da imagem.");
  }
  if (!json?.url) {
    throw new Error("Resposta invalida do servidor.");
  }
  return json.url;
}
