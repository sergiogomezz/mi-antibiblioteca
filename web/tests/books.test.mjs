import { test } from "node:test";
import assert from "node:assert/strict";
import { selectBooks } from "../src/books.ts";
const books = [
  {
    id: 1,
    title: "Árbol",
    author: "José",
    publisher: "Alianza",
    status: "read",
    number_of_pages: 200,
  },
  {
    id: 3,
    title: "Bosque",
    author: "Ana",
    publisher: "Herder",
    status: "pending",
    number_of_pages: null,
  },
  {
    id: 2,
    title: "Campo",
    author: "Luis",
    publisher: null,
    status: "reading",
    number_of_pages: 100,
  },
];
test("search handles accents, authors, publishers and combines state filter", () => {
  assert.deepEqual(
    selectBooks(books, "arbol", "read", "recent").map((b) => b.id),
    [1],
  );
  assert.deepEqual(
    selectBooks(books, "JOSE", "all", "recent").map((b) => b.id),
    [1],
  );
  assert.equal(selectBooks(books, "herder", "read", "title").length, 0);
  assert.equal(selectBooks(books, "herder", "pending", "title")[0].id, 3);
  assert.deepEqual(selectBooks(books, "missing", "all", "title"), []);
});
test("sorts pages with unknowns last, recent and author without mutating library", () => {
  assert.deepEqual(
    selectBooks(books, "", "all", "pages").map((b) => b.id),
    [2, 1, 3],
  );
  assert.deepEqual(
    selectBooks(books, "", "all", "recent").map((b) => b.id),
    [3, 2, 1],
  );
  assert.deepEqual(
    selectBooks(books, "", "all", "author").map((b) => b.id),
    [3, 1, 2],
  );
  assert.deepEqual(
    books.map((b) => b.id),
    [1, 3, 2],
  );
});

test("author sorting uses surname, handles compounds and title tie-breaks", () => {
  const input = [
    {
      id: 1,
      title: "Zeta",
      author: "Viktor Emil Frankl",
      author_profiles: [
        { display_name: "Viktor Frankl", sort_name: "Frankl, Viktor" },
      ],
    },
    { id: 2, title: "B", author: "Umberto Eco" },
    { id: 3, title: "A", author: "Gabriel García Márquez" },
    { id: 4, title: "Alfa", author: "Viktor Frankl" },
    { id: 5, title: "C", author: "García Lorca, Federico" },
  ];
  assert.deepEqual(
    selectBooks(input, "", "all", "author").map((b) => b.id),
    [2, 4, 1, 5, 3],
  );
  assert.equal(selectBooks(input, "Viktor Frankl", "all", "author").length, 2);
});
