import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import {
  adminPackageFieldsSchema,
  formatZodValidationError,
  prepareAdminProductBody,
} from "./admin-product-api.ts";

const patchPackageSchema = z.object({
  id: z.string(),
  ...adminPackageFieldsSchema,
});

test("prepareAdminProductBody coerces string package fields for zod", () => {
  const body = prepareAdminProductBody({
    id: "p1",
    packageWidthCm: "22",
    packageHeightCm: "9",
    packageLengthCm: "25",
    packageWeightKg: "0,48",
  });
  const parsed = patchPackageSchema.safeParse(body);
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.packageWidthCm, 22);
    assert.equal(parsed.data.packageWeightKg, 0.48);
  }
});

test("formatZodValidationError includes field path", () => {
  const result = patchPackageSchema.safeParse({
    id: "p1",
    packageWeightKg: 0,
  });
  assert.equal(result.success, false);
  if (!result.success) {
    const msg = formatZodValidationError(result.error);
    assert.match(msg, /packageWeightKg|too small|greater/i);
  }
});
