import { bookAuthorSort, displayAuthor, type AuthorProfile } from "./authors.ts";
import type { SpineStyle } from "./spines";
export type Status = "pending" | "reading" | "read";
export type Book = {
  id?: number;
  source_id: string;
  title: string;
  author: string;
  authors?: string[];
  author_profiles?: AuthorProfile[];
  year: number | null;
  cover_id: number | null;
  status?: Status;
  number_of_pages?: number | null;
  spine_style?: SpineStyle | null;
  publisher?: string | null;
  language?: "spa" | "eng" | null;
};
export const labels: Record<Status, string> = {
  pending: "Pendiente",
  reading: "Leyendo",
  read: "Leído",
};

export type BookSort = "recent" | "title" | "author" | "pages";
export function selectBooks(
  books: Book[],
  query: string,
  status: Status | "all",
  sort: BookSort,
) {
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("es");
  const term = normalize(query.trim());
  return books
    .filter(
      (book) =>
        (status === "all" || book.status === status) &&
        normalize(
          [
            book.title,
            book.author,
            displayAuthor(book),
            book.publisher ?? "",
          ].join(" "),
        ).includes(term),
    )
    .sort((a, b) => {
      if (sort === "recent") return (b.id ?? 0) - (a.id ?? 0);
      if (sort === "pages")
        return (
          (a.number_of_pages ?? Infinity) - (b.number_of_pages ?? Infinity) ||
          a.title.localeCompare(b.title, "es")
        );
      if (sort === "author")
        return (
          bookAuthorSort(a).localeCompare(bookAuthorSort(b), "es", {
            sensitivity: "base",
          }) ||
          a.title.localeCompare(b.title, "es", { sensitivity: "base" }) ||
          (a.id ?? 0) - (b.id ?? 0)
        );
      return (
        a[sort].localeCompare(b[sort], "es", { sensitivity: "base" }) ||
        (b.id ?? 0) - (a.id ?? 0)
      );
    });
}
