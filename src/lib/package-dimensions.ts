import type { MelhorEnvioProduct } from "@/lib/melhor-envio";

/** Campos opcionais no cadastro do produto (null = usar padrao da loja). */
export type PackageSource = {
  packageWidthCm?: number | null;
  packageHeightCm?: number | null;
  packageLengthCm?: number | null;
  packageWeightKg?: number | null;
};

export type ResolvedPackageCm = {
  widthCm: number;
  heightCm: number;
  lengthCm: number;
  weightKg: number;
  usesStoreDefault: boolean;
};

export function getDefaultPackageDims() {
  const widthCm = Math.max(1, Math.round(Number(process.env.SHIPPING_DEFAULT_WIDTH_CM) || 18));
  const heightCm = Math.max(1, Math.round(Number(process.env.SHIPPING_DEFAULT_HEIGHT_CM) || 11));
  const lengthCm = Math.max(1, Math.round(Number(process.env.SHIPPING_DEFAULT_LENGTH_CM) || 22));
  const weightKg = Math.max(0.01, Number(process.env.SHIPPING_DEFAULT_WEIGHT_KG) || 0.35);
  return { widthCm, heightCm, lengthCm, weightKg };
}

export function clampPackageCm(value: number) {
  return Math.min(200, Math.max(1, Math.round(value)));
}

export function clampPackageKg(value: number) {
  return Math.min(30, Math.max(0.01, Math.round(value * 100) / 100));
}

function clampCm(value: number) {
  return clampPackageCm(value);
}

function clampKg(value: number) {
  return clampPackageKg(value);
}

/** Resolve medidas do produto; campos vazios usam SHIPPING_DEFAULT_* do .env. */
export function resolvePackageDims(source?: PackageSource | null): ResolvedPackageCm {
  const defaults = getDefaultPackageDims();
  const hasAny =
    source?.packageWidthCm != null ||
    source?.packageHeightCm != null ||
    source?.packageLengthCm != null ||
    source?.packageWeightKg != null;

  if (!hasAny) {
    return { ...defaults, usesStoreDefault: true };
  }

  return {
    widthCm: clampCm(source?.packageWidthCm ?? defaults.widthCm),
    heightCm: clampCm(source?.packageHeightCm ?? defaults.heightCm),
    lengthCm: clampCm(source?.packageLengthCm ?? defaults.lengthCm),
    weightKg: clampKg(source?.packageWeightKg ?? defaults.weightKg),
    usesStoreDefault: false,
  };
}

export type CartPackageLine = {
  id: string;
  price: number;
  quantity: number;
  package?: PackageSource | null;
};

export function buildMelhorEnvioProductsFromCartLines(
  lines: CartPackageLine[],
): MelhorEnvioProduct[] {
  return lines.map((line) => {
    const dims = resolvePackageDims(line.package);
    return {
      id: line.id,
      width: dims.widthCm,
      height: dims.heightCm,
      length: dims.lengthCm,
      weight: dims.weightKg,
      insurance_value: Math.round(line.price * 100) / 100,
      quantity: line.quantity,
    };
  });
}

export type PackageUnit = ResolvedPackageCm & { quantity: number };

/** Um volume unico para inserir etiqueta no carrinho ME (varios itens na mesma caixa). */
export function aggregatePackageVolume(units: PackageUnit[]): {
  height: number;
  width: number;
  length: number;
  weight: number;
} {
  if (units.length === 0) {
    const d = getDefaultPackageDims();
    return {
      height: d.heightCm,
      width: d.widthCm,
      length: d.lengthCm,
      weight: d.weightKg,
    };
  }

  let totalWeight = 0;
  let totalVolume = 0;
  let maxW = 0;
  let maxH = 0;
  let maxL = 0;

  for (const unit of units) {
    const q = Math.max(1, unit.quantity);
    totalWeight += unit.weightKg * q;
    totalVolume += unit.widthCm * unit.heightCm * unit.lengthCm * q;
    maxW = Math.max(maxW, unit.widthCm);
    maxH = Math.max(maxH, unit.heightCm);
    maxL = Math.max(maxL, unit.lengthCm);
  }

  const cubeSide = Math.cbrt(totalVolume);
  const width = clampCm(Math.max(maxW, cubeSide));
  const height = clampCm(Math.max(maxH, cubeSide * 0.75));
  const length = clampCm(Math.max(maxL, cubeSide * 1.15));

  return {
    width,
    height,
    length,
    weight: clampKg(totalWeight),
  };
}

export function parsePackageFieldsFromForm(input: {
  packageWidthCm?: string;
  packageHeightCm?: string;
  packageLengthCm?: string;
  packageWeightKg?: string;
}):
  | {
      packageWidthCm: number | null;
      packageHeightCm: number | null;
      packageLengthCm: number | null;
      packageWeightKg: number | null;
    }
  | { error: string } {
  const raw = {
    w: input.packageWidthCm?.trim() ?? "",
    h: input.packageHeightCm?.trim() ?? "",
    l: input.packageLengthCm?.trim() ?? "",
    kg: input.packageWeightKg?.trim().replace(",", ".") ?? "",
  };

  if (!raw.w && !raw.h && !raw.l && !raw.kg) {
    return {
      packageWidthCm: null,
      packageHeightCm: null,
      packageLengthCm: null,
      packageWeightKg: null,
    };
  }

  const width = Number(raw.w);
  const height = Number(raw.h);
  const length = Number(raw.l);
  const weight = Number(raw.kg);

  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    !Number.isFinite(length) ||
    !Number.isFinite(weight) ||
    width < 1 ||
    height < 1 ||
    length < 1 ||
    weight <= 0
  ) {
    return {
      error:
        "Embalagem: informe largura, altura, comprimento (cm) e peso (kg) validos, ou deixe tudo vazio para usar o padrao da loja.",
    };
  }

  return {
    packageWidthCm: clampCm(width),
    packageHeightCm: clampCm(height),
    packageLengthCm: clampCm(length),
    packageWeightKg: clampKg(weight),
  };
}

export function formatPackageDimsLabel(dims: ResolvedPackageCm) {
  return `${dims.widthCm}×${dims.heightCm}×${dims.lengthCm} cm · ${dims.weightKg} kg`;
}

const PACKAGE_FIELD_KEYS = [
  "packageWidthCm",
  "packageHeightCm",
  "packageLengthCm",
  "packageWeightKg",
] as const;

type PackageFieldKey = (typeof PACKAGE_FIELD_KEYS)[number];

function coercePackageFieldValue(
  key: PackageFieldKey,
  value: unknown,
): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const n =
    typeof value === "number"
      ? value
      : Number(String(value).trim().replace(",", "."));
  if (!Number.isFinite(n)) return undefined;
  if (key === "packageWeightKg") return clampPackageKg(n);
  return clampPackageCm(n);
}

/** Normaliza embalagem no body da API (aceita numero ou string do formulario). */
export function coercePackageFieldsInBody<T extends Record<string, unknown>>(
  body: T,
): T {
  const next = { ...body };
  for (const key of PACKAGE_FIELD_KEYS) {
    if (!(key in next)) continue;
    const coerced = coercePackageFieldValue(key, next[key]);
    if (coerced !== undefined) {
      (next as Record<string, unknown>)[key] = coerced;
    }
  }
  return next;
}
