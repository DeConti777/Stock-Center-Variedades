import assert from "node:assert/strict";
import test from "node:test";
import {
  aggregatePackageVolume,
  resolvePackageDims,
} from "./package-dimensions.ts";

test("resolvePackageDims uses store default when product fields are empty", () => {
  const dims = resolvePackageDims(null);
  assert.equal(dims.usesStoreDefault, true);
  assert.ok(dims.widthCm >= 1);
  assert.ok(dims.weightKg >= 0.01);
});

test("resolvePackageDims uses product fields when provided", () => {
  const dims = resolvePackageDims({
    packageWidthCm: 30,
    packageHeightCm: 10,
    packageLengthCm: 40,
    packageWeightKg: 1.2,
  });
  assert.equal(dims.usesStoreDefault, false);
  assert.equal(dims.widthCm, 30);
  assert.equal(dims.heightCm, 10);
  assert.equal(dims.lengthCm, 40);
  assert.equal(dims.weightKg, 1.2);
});

test("aggregatePackageVolume sums weight for multiple units", () => {
  const vol = aggregatePackageVolume([
    {
      widthCm: 20,
      heightCm: 10,
      lengthCm: 30,
      weightKg: 0.5,
      usesStoreDefault: false,
      quantity: 2,
    },
  ]);
  assert.equal(vol.weight, 1);
  assert.ok(vol.width >= 20);
});
