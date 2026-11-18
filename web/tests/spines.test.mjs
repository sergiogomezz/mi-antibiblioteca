import { test } from "node:test";
import assert from "node:assert/strict";
import { automaticSpine, binding } from "../src/spines.ts";
const book = { source_id: "OL1M", number_of_pages: 200 };
test("publisher aliases select families without guessing conglomerate collections", () => {
  assert.equal(
    automaticSpine({ ...book, publisher: "EDITORIAL HERDER, S.A." }),
    "herder",
  );
  assert.equal(
    automaticSpine({ ...book, publisher: "Editorial Anagrama – Compactos" }),
    "anagrama-compactos",
  );
  assert.equal(
    automaticSpine({ ...book, publisher: "Penguin Classics" }),
    "penguin-classics",
  );
  assert.equal(
    automaticSpine({ ...book, publisher: "Penguin Random House" }),
    "neutral",
  );
  assert.equal(automaticSpine({ ...book, publisher: null }), "neutral");
});
test("a manual collection overrides the family without changing page thickness", () => {
  const auto = binding({ ...book, publisher: "Anagrama" });
  const manual = binding({
    ...book,
    publisher: "Anagrama",
    spine_style: "anagrama-compactos",
  });
  assert.equal(auto.width, manual.width);
  assert.equal(manual.style, "anagrama-compactos");
  assert.ok(binding({ ...book, number_of_pages: 600 }).width > auto.width);
  assert.equal(binding({ ...book, number_of_pages: null }).width, 24);
});
