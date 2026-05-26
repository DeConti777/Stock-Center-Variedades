"use client";

type PackageFieldValues = {
  packageWidthCm: string;
  packageHeightCm: string;
  packageLengthCm: string;
  packageWeightKg: string;
};

export type PackageEstimateHint = {
  confidence?: number;
  reasoning?: string;
  warnings?: string[];
  skippedReason?: string;
};

type ProductPackageFieldsProps = {
  values: PackageFieldValues;
  onChange: (field: keyof PackageFieldValues, value: string) => void;
  errors?: Partial<Record<keyof PackageFieldValues | "package", string>>;
  className?: string;
  canEstimate?: boolean;
  estimating?: boolean;
  onEstimate?: () => void;
  estimateHint?: PackageEstimateHint | null;
};

export function ProductPackageFields({
  values,
  onChange,
  errors,
  className = "",
  canEstimate = true,
  estimating = false,
  onEstimate,
  estimateHint,
}: ProductPackageFieldsProps) {
  const inputClass =
    "mt-1 w-full rounded-xl border border-[var(--color-line)] bg-white px-3 py-2 text-sm";

  return (
    <fieldset
      className={`rounded-2xl border border-dashed border-[var(--color-line)] p-4 ${className}`}
    >
      <legend className="px-1 text-sm font-bold text-[var(--color-ink)]">
        Embalagem para frete (Melhor Envio)
      </legend>
      <p className="mt-1 text-xs text-[var(--color-muted)]">
        Medidas da caixa fechada com o produto dentro. Deixe vazio para usar o padrao da loja
        (variaveis SHIPPING_DEFAULT_* no .env). Na criacao, o Gemini pode preencher automaticamente
        se estes campos estiverem vazios (GEMINI_API_KEY no .env).
      </p>
      {onEstimate ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={onEstimate}
            disabled={!canEstimate || estimating}
            className="rounded-full border border-[var(--color-line)] bg-white px-4 py-2 text-xs font-semibold text-[var(--color-ink)] hover:border-[var(--color-primary)] disabled:opacity-50"
          >
            {estimating ? "Estimando..." : "Estimar com IA"}
          </button>
        </div>
      ) : null}
      {estimateHint?.skippedReason ? (
        <p className="mt-2 text-xs text-amber-700">{estimateHint.skippedReason}</p>
      ) : null}
      {estimateHint?.reasoning ? (
        <p className="mt-2 text-xs text-[var(--color-muted)]">
          {estimateHint.confidence != null
            ? `Confianca ${Math.round(estimateHint.confidence * 100)}%. `
            : ""}
          {estimateHint.reasoning}
        </p>
      ) : null}
      {estimateHint?.warnings?.length ? (
        <ul className="mt-1 list-inside list-disc text-xs text-amber-800">
          {estimateHint.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      ) : null}
      {errors?.package ? (
        <p className="mt-2 text-xs text-red-600">{errors.package}</p>
      ) : null}
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs font-semibold text-[var(--color-ink)]">
          Largura (cm)
          <input
            type="number"
            min={1}
            max={200}
            step={1}
            value={values.packageWidthCm}
            onChange={(e) => onChange("packageWidthCm", e.target.value)}
            placeholder="ex.: 20"
            className={inputClass}
          />
        </label>
        <label className="text-xs font-semibold text-[var(--color-ink)]">
          Altura (cm)
          <input
            type="number"
            min={1}
            max={200}
            step={1}
            value={values.packageHeightCm}
            onChange={(e) => onChange("packageHeightCm", e.target.value)}
            placeholder="ex.: 15"
            className={inputClass}
          />
        </label>
        <label className="text-xs font-semibold text-[var(--color-ink)]">
          Comprimento (cm)
          <input
            type="number"
            min={1}
            max={200}
            step={1}
            value={values.packageLengthCm}
            onChange={(e) => onChange("packageLengthCm", e.target.value)}
            placeholder="ex.: 25"
            className={inputClass}
          />
        </label>
        <label className="text-xs font-semibold text-[var(--color-ink)]">
          Peso (kg)
          <input
            type="number"
            min={0.01}
            max={30}
            step={0.01}
            value={values.packageWeightKg}
            onChange={(e) => onChange("packageWeightKg", e.target.value)}
            placeholder="ex.: 0,35"
            className={inputClass}
          />
        </label>
      </div>
    </fieldset>
  );
}

export function packageFieldsFromProduct(p: {
  packageWidthCm?: number | null;
  packageHeightCm?: number | null;
  packageLengthCm?: number | null;
  packageWeightKg?: number | null;
}): PackageFieldValues {
  return {
    packageWidthCm:
      p.packageWidthCm != null ? String(p.packageWidthCm) : "",
    packageHeightCm:
      p.packageHeightCm != null ? String(p.packageHeightCm) : "",
    packageLengthCm:
      p.packageLengthCm != null ? String(p.packageLengthCm) : "",
    packageWeightKg:
      p.packageWeightKg != null ? String(p.packageWeightKg) : "",
  };
}

export const emptyPackageFields = (): PackageFieldValues => ({
  packageWidthCm: "",
  packageHeightCm: "",
  packageLengthCm: "",
  packageWeightKg: "",
});
