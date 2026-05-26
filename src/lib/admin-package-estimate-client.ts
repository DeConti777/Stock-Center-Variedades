export type PackageEstimateApiResult = {
  packageWidthCm: number | null;
  packageHeightCm: number | null;
  packageLengthCm: number | null;
  packageWeightKg: number | null;
  confidence: number;
  reasoning: string;
  warnings: string[];
  skippedReason?: string;
};

export type PackageEstimateRequest = {
  name: string;
  category?: string;
  shortDescription?: string;
  coverImage?: string;
  images?: string[];
};

export async function requestPackageEstimate(
  body: PackageEstimateRequest,
): Promise<PackageEstimateApiResult> {
  const response = await fetch("/api/admin/products/estimate-package", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await response.json().catch(() => null)) as
    | { estimate?: PackageEstimateApiResult; error?: string }
    | null;
  if (!response.ok) {
    throw new Error(json?.error || "Falha ao estimar embalagem com IA.");
  }
  if (!json?.estimate) {
    throw new Error("Resposta invalida da estimativa de embalagem.");
  }
  return json.estimate;
}

export function packageEstimateToFormValues(estimate: PackageEstimateApiResult) {
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

export function productMissingPackageFields(product: {
  packageWidthCm?: number | null;
  packageHeightCm?: number | null;
  packageLengthCm?: number | null;
  packageWeightKg?: number | null;
}): boolean {
  return (
    product.packageWidthCm == null &&
    product.packageHeightCm == null &&
    product.packageLengthCm == null &&
    product.packageWeightKg == null
  );
}
