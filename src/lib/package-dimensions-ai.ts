import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, Output, type UserContent } from "ai";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { AdminProductCreateInput } from "@/lib/admin-server";
import { clampPackageCm, clampPackageKg } from "@/lib/package-dimensions";

const SYSTEM_PROMPT = `Voce estima medidas da EMBALAGEM FECHADA pronta para postagem no Brasil (Melhor Envio: Correios, Jadlog, etc.).
Nao estime apenas o produto "nu": inclua caixa de papelao e protecao tipica de e-commerce.
Regras:
- packageWidthCm, packageHeightCm, packageLengthCm: inteiros em cm (1-200). Orientacao importa pouco; prefira largura <= comprimento quando possivel; altura = face em pe do pacote.
- packageWeightKg: kg com ate 2 decimais (0.01-30); produto + caixa + enchimento; em duvida arredonde levemente para cima.
- Kits: uma caixa unica que caiba tudo.
- Itens muito leves/pequenos: caixa pequena, nao padrao medio sem necessidade.
- Liquidos, vidro, eletronicos frageis: +1-2 cm por lado e +50-150 g de protecao.
- Nome generico sem tipo claro: confidence <= 0.4 e dimensoes null.
- Nao invente marca/modelo; so dimensoes plausiveis para o tipo descrito.
- Se nao tiver confianca razoavel, retorne null nos quatro campos de dimensao.`;

const modelOutputSchema = z.object({
  packageWidthCm: z.number().nullable(),
  packageHeightCm: z.number().nullable(),
  packageLengthCm: z.number().nullable(),
  packageWeightKg: z.number().nullable(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  warnings: z.array(z.string()),
});

export type PackageEstimateInput = {
  name: string;
  category?: string | null;
  shortDescription?: string | null;
  coverImage?: string | null;
  images?: string[] | null;
};

export type PackageEstimateResult = {
  packageWidthCm: number | null;
  packageHeightCm: number | null;
  packageLengthCm: number | null;
  packageWeightKg: number | null;
  confidence: number;
  reasoning: string;
  warnings: string[];
  skippedReason?: string;
};

/** Chave do Google AI Studio / Gemini API (aceita alias GOOGLE_GENERATIVE_AI_API_KEY do SDK). */
export function getGeminiApiKey(): string | undefined {
  const key =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  return key || undefined;
}

export function isPackageAiEnabled(): boolean {
  if (process.env.PACKAGE_AI_ENABLED === "false") return false;
  return Boolean(getGeminiApiKey());
}

export function getPackageAiSkippedReason(): string {
  if (process.env.PACKAGE_AI_ENABLED === "false") {
    return "IA de embalagem desligada (PACKAGE_AI_ENABLED=false).";
  }
  if (!getGeminiApiKey()) {
    return "GEMINI_API_KEY ausente: adicione no .env (veja .env.example) e reinicie o npm run dev.";
  }
  return "IA de embalagem indisponivel.";
}

export function getPackageAiMinConfidence(): number {
  const raw = process.env.PACKAGE_AI_MIN_CONFIDENCE?.trim();
  if (!raw) return 0.5;
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : 0.5;
}

/** Modelos com cota no tier gratuito (evitar gemini-2.0-flash se limit=0 na conta). */
const GEMINI_FALLBACK_MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash-lite",
  "gemini-2.5-flash",
] as const;

export function getPackageAiModelId(): string {
  return process.env.PACKAGE_AI_MODEL?.trim() || "gemini-2.5-flash-lite";
}

export function getPackageAiModelCandidates(): string[] {
  const primary = getPackageAiModelId();
  const rest = GEMINI_FALLBACK_MODELS.filter((m) => m !== primary);
  return [...new Set([primary, ...rest])];
}

export function isGeminiQuotaError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /quota|rate.?limit|429|RESOURCE_EXHAUSTED|exceeded your current/i.test(
    msg,
  );
}

export function formatGeminiEstimateError(error: unknown): string {
  if (isGeminiQuotaError(error)) {
    return (
      "Cota gratuita do Gemini indisponivel para este modelo (limite 0 ou esgotado). " +
      "Defina PACKAGE_AI_MODEL=gemini-2.5-flash-lite no .env, aguarde ~1 min e tente de novo, " +
      "ou ative faturamento em https://ai.google.dev"
    );
  }
  return error instanceof Error ? error.message : "Falha ao consultar o Gemini.";
}

export function resolveAbsoluteImageUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  return trimmed.startsWith("/") ? `${base}${trimmed}` : `${base}/${trimmed}`;
}

export function collectProductImageUrls(
  coverImage?: string | null,
  images?: string[] | null,
  max = 2,
): string[] {
  const out: string[] = [];
  const push = (raw: string) => {
    const u = raw.trim();
    if (!u || out.includes(u)) return;
    out.push(u);
  };
  if (coverImage) push(coverImage);
  for (const img of images ?? []) {
    if (out.length >= max) break;
    push(img);
  }
  return out.slice(0, max);
}

export function hasAnyPackageField(
  source?: Pick<
    AdminProductCreateInput,
    | "packageWidthCm"
    | "packageHeightCm"
    | "packageLengthCm"
    | "packageWeightKg"
  > | null,
): boolean {
  return (
    source?.packageWidthCm != null ||
    source?.packageHeightCm != null ||
    source?.packageLengthCm != null ||
    source?.packageWeightKg != null
  );
}

async function loadImageDataForModel(imageUrl: string): Promise<string | null> {
  const trimmed = imageUrl.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("/uploads/")) {
    try {
      const filePath = path.join(process.cwd(), "public", trimmed);
      const buf = await readFile(filePath);
      const ext = path.extname(trimmed).toLowerCase();
      const mime =
        ext === ".png"
          ? "image/png"
          : ext === ".webp"
            ? "image/webp"
            : ext === ".gif"
              ? "image/gif"
              : "image/jpeg";
      return `data:${mime};base64,${buf.toString("base64")}`;
    } catch {
      // fallback to absolute URL
    }
  }

  return resolveAbsoluteImageUrl(trimmed);
}

export function normalizePackageAiOutput(
  raw: z.infer<typeof modelOutputSchema>,
  minConfidence = getPackageAiMinConfidence(),
): PackageEstimateResult {
  const confidence = Math.min(1, Math.max(0, raw.confidence));
  const lowConfidence = confidence < minConfidence;
  const dimsIncomplete =
    raw.packageWidthCm == null ||
    raw.packageHeightCm == null ||
    raw.packageLengthCm == null ||
    raw.packageWeightKg == null;

  if (lowConfidence || dimsIncomplete) {
    return {
      packageWidthCm: null,
      packageHeightCm: null,
      packageLengthCm: null,
      packageWeightKg: null,
      confidence,
      reasoning: raw.reasoning,
      warnings: [
        ...raw.warnings,
        ...(lowConfidence
          ? [`Confianca ${Math.round(confidence * 100)}% abaixo do minimo (${Math.round(minConfidence * 100)}%).`]
          : []),
      ],
    };
  }

  const wRaw = raw.packageWidthCm!;
  const hRaw = raw.packageHeightCm!;
  const lRaw = raw.packageLengthCm!;
  const kgRaw = raw.packageWeightKg!;

  let w = clampPackageCm(wRaw);
  const h = clampPackageCm(hRaw);
  let l = clampPackageCm(lRaw);
  const kg = clampPackageKg(kgRaw);

  if (w > l) {
    const swap = w;
    w = l;
    l = swap;
  }

  return {
    packageWidthCm: w,
    packageHeightCm: h,
    packageLengthCm: l,
    packageWeightKg: kg,
    confidence,
    reasoning: raw.reasoning,
    warnings: raw.warnings,
  };
}

type EstimateDeps = {
  generate?: typeof runPackageEstimateGeneration;
};

async function generatePackageEstimateWithModel(
  google: ReturnType<typeof createGoogleGenerativeAI>,
  modelId: string,
  userContent: UserContent,
): Promise<z.infer<typeof modelOutputSchema>> {
  const { output } = await generateText({
    model: google(modelId),
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userContent }],
    output: Output.object({ schema: modelOutputSchema }),
    maxRetries: 0,
  });

  if (!output) {
    throw new Error("IA nao retornou estimativa estruturada.");
  }

  return output;
}

async function runPackageEstimateGeneration(
  input: PackageEstimateInput,
): Promise<z.infer<typeof modelOutputSchema>> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY ausente.");
  }
  const google = createGoogleGenerativeAI({ apiKey });

  const imageUrls = collectProductImageUrls(input.coverImage, input.images);
  const imageParts: UserContent = [];
  for (const url of imageUrls) {
    const data = await loadImageDataForModel(url);
    if (data) {
      imageParts.push({ type: "image", image: data });
    }
  }

  const userText = [
    `Produto: ${input.name}`,
    input.category ? `Categoria: ${input.category}` : null,
    input.shortDescription
      ? `Descricao curta: ${input.shortDescription.slice(0, 500)}`
      : null,
    imageParts.length > 0
      ? "Imagens anexas: produto e/ou embalagem para referencia de escala."
      : "Sem imagens: estime apenas pelo nome e categoria.",
  ]
    .filter(Boolean)
    .join("\n");

  const userContentWithImages: UserContent =
    imageParts.length > 0
      ? [{ type: "text", text: userText }, ...imageParts]
      : userText;

  const textOnlyContent: UserContent = [
    userText,
    imageParts.length > 0
      ? "Sem acesso a imagens nesta tentativa: estime pelo texto acima."
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  let lastError: unknown;

  for (const modelId of getPackageAiModelCandidates()) {
    try {
      return await generatePackageEstimateWithModel(
        google,
        modelId,
        userContentWithImages,
      );
    } catch (error) {
      lastError = error;
      if (!isGeminiQuotaError(error)) {
        throw error;
      }
      console.warn(
        `[package-dimensions-ai] cota/limite no modelo ${modelId}, tentando proximo...`,
      );
    }
  }

  if (imageParts.length > 0) {
    try {
      return await generatePackageEstimateWithModel(
        google,
        "gemini-2.5-flash-lite",
        textOnlyContent,
      );
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("Falha ao consultar o Gemini.");
}

export async function estimatePackageDimensions(
  input: PackageEstimateInput,
  deps?: EstimateDeps,
): Promise<PackageEstimateResult> {
  const useInjectedGenerate = Boolean(deps?.generate);

  if (!useInjectedGenerate && !isPackageAiEnabled()) {
    return {
      packageWidthCm: null,
      packageHeightCm: null,
      packageLengthCm: null,
      packageWeightKg: null,
      confidence: 0,
      reasoning: "",
      warnings: [],
      skippedReason: getPackageAiSkippedReason(),
    };
  }

  const name = input.name?.trim();
  if (!name || name.length < 2) {
    return {
      packageWidthCm: null,
      packageHeightCm: null,
      packageLengthCm: null,
      packageWeightKg: null,
      confidence: 0,
      reasoning: "",
      warnings: [],
      skippedReason: "Nome do produto obrigatorio para estimar.",
    };
  }

  try {
    const generate = deps?.generate ?? runPackageEstimateGeneration;
    const raw = await generate({ ...input, name });
    return normalizePackageAiOutput(raw);
  } catch (error) {
    console.error("[package-dimensions-ai]", error);
    const friendly = formatGeminiEstimateError(error);
    return {
      packageWidthCm: null,
      packageHeightCm: null,
      packageLengthCm: null,
      packageWeightKg: null,
      confidence: 0,
      reasoning: "",
      warnings: [friendly],
      skippedReason: friendly,
    };
  }
}

export async function maybeEnrichPackageOnCreate(
  input: AdminProductCreateInput,
  deps?: EstimateDeps,
): Promise<{
  input: AdminProductCreateInput;
  estimate?: PackageEstimateResult;
}> {
  if (hasAnyPackageField(input)) {
    return { input };
  }

  const estimate = await estimatePackageDimensions(
    {
      name: input.name,
      category: input.category,
      shortDescription: input.shortDescription,
      coverImage: input.coverImage,
      images: input.images,
    },
    deps,
  );

  if (
    estimate.packageWidthCm == null ||
    estimate.packageHeightCm == null ||
    estimate.packageLengthCm == null ||
    estimate.packageWeightKg == null
  ) {
    return { input, estimate };
  }

  return {
    input: {
      ...input,
      packageWidthCm: estimate.packageWidthCm,
      packageHeightCm: estimate.packageHeightCm,
      packageLengthCm: estimate.packageLengthCm,
      packageWeightKg: estimate.packageWeightKg,
    },
    estimate,
  };
}

export function packageEstimateToFormStrings(estimate: PackageEstimateResult) {
  return {
    packageWidthCm:
      estimate.packageWidthCm != null ? String(estimate.packageWidthCm) : "",
    packageHeightCm:
      estimate.packageHeightCm != null ? String(estimate.packageHeightCm) : "",
    packageLengthCm:
      estimate.packageLengthCm != null ? String(estimate.packageLengthCm) : "",
    packageWeightKg:
      estimate.packageWeightKg != null ? String(estimate.packageWeightKg) : "",
  };
}
