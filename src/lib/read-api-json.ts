/**
 * Le JSON de uma Response fetch de forma segura (evita "Unexpected end of JSON input"
 * quando o servidor devolve corpo vazio ou HTML).
 */
export async function readApiJson<T extends Record<string, unknown>>(
  res: Response,
): Promise<T> {
  const text = await res.text();
  const trimmed = text.trim();

  if (!trimmed) {
    if (!res.ok) {
      throw new Error(
        res.status === 413
          ? "Arquivo muito grande."
          : `Servidor retornou erro (${res.status}) sem detalhes.`,
      );
    }
    return {} as T;
  }

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    throw new Error(
      res.ok
        ? "Resposta invalida do servidor."
        : `Erro ${res.status}. A pagina pode ter sido recarregada ou o servidor falhou.`,
    );
  }
}
