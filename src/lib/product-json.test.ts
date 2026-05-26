import assert from "node:assert/strict";
import test from "node:test";
import {
  commaSeparatedImageUrlsHadDuplicates,
  normalizeCommaSeparatedImageUrls,
} from "@/lib/product-json";

test("detecta quando CSV nao tem URLs duplicadas", () => {
  assert.equal(
    commaSeparatedImageUrlsHadDuplicates("https://a.jpg, https://b.jpg"),
    false,
  );
});

test("detecta quando CSV tem URLs duplicadas", () => {
  assert.equal(
    commaSeparatedImageUrlsHadDuplicates("https://a.jpg, https://a.jpg"),
    true,
  );
});

test("normaliza CSV removendo duplicatas e espacos extras", () => {
  assert.equal(
    normalizeCommaSeparatedImageUrls(" https://a.jpg , https://a.jpg, https://b.jpg "),
    "https://a.jpg, https://b.jpg",
  );
});
