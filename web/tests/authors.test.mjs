import { test } from "node:test";
import assert from "node:assert/strict";
import { groupAuthors } from "../src/authors.ts";
test("groups editions and normalizes spaces/case without duplicating a book", () => {
  const books = [
    { author: "Viktor Frankl", authors: ["Viktor Frankl", " viktor  frankl "] },
    { author: "VIKTOR FRANKL" },
  ];
  const groups = groupAuthors(books);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].books.length, 2);
});
test("each coauthor gets the book; comma-separated catalog names remain intact", () => {
  const joint = { author: "Uno, Dos", authors: ["Autora Uno", "Autor Dos"] };
  const legacy = { author: "García Márquez, Gabriel" };
  const groups = groupAuthors([joint, legacy]);
  assert.equal(groups.length, 3);
  assert.equal(groups.find((a) => a.name === "Autora Uno").books[0], joint);
  assert.equal(groups.find((a) => a.name === "Autor Dos").books[0], joint);
  assert.equal(
    groups.find((a) => a.name === "García Márquez, Gabriel").books[0],
    legacy,
  );
});
test("empty library has no authors and names with accents are preserved", () => {
  assert.deepEqual(groupAuthors([]), []);
  assert.equal(
    groupAuthors([{ author: "José Saramago" }])[0].name,
    "José Saramago",
  );
});

test("preferred names group aliases while retaining catalog identity for portraits", () => {
  const profile = {
    key: "viktor emil frankl",
    catalog_name: "Viktor Emil Frankl",
    display_name: "Viktor Frankl",
    sort_name: "Frankl, Viktor",
  };
  const groups = groupAuthors([
    { author: "Viktor Emil Frankl", author_profiles: [profile] },
    {
      author: "Viktor Frankl",
      author_profiles: [{ ...profile, catalog_name: "Viktor Frankl" }],
    },
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].name, "Viktor Frankl");
  assert.equal(groups[0].lookupName, "Viktor Emil Frankl");
  assert.equal(groups[0].books.length, 2);
});
