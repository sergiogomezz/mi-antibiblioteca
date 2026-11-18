export type AuthorProfile = {
  key: string;
  catalog_name: string;
  display_name: string;
  sort_name: string | null;
};
export type AuthoredBook = {
  author: string;
  authors?: string[] | null;
  author_profiles?: AuthorProfile[];
};
export function authorKey(name: string) {
  return name
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("es");
}
export function groupAuthors<T extends AuthoredBook>(books: T[]) {
  const groups = new Map<
    string,
    {
      key: string;
      name: string;
      lookupName: string;
      sortName: string;
      books: T[];
    }
  >();
  for (const book of books) {
    // Never split on commas: they can be part of a person's catalogued name.
    const names = book.authors?.length
      ? book.authors
      : [book.author || "Autor desconocido"];
    const seen = new Set<string>();
    for (const raw of names) {
      const profile = book.author_profiles?.find(
        (profile) => authorKey(profile.catalog_name) === authorKey(raw),
      );
      const name = (profile?.display_name || raw).trim().replace(/\s+/g, " ");
      if (!name) continue;
      const key = profile?.key || authorKey(name);
      if (seen.has(key)) continue;
      seen.add(key);
      if (!groups.has(key))
        groups.set(key, {
          key,
          name,
          lookupName: raw,
          sortName: profile?.sort_name || surnameSortName(name),
          books: [],
        });
      groups.get(key)!.books.push(book);
    }
  }
  return [...groups.values()].sort((a, b) =>
    a.sortName.localeCompare(b.sortName, "es", { sensitivity: "base" }),
  );
}
export function authorInitials(name: string) {
  const words = name.trim().split(/\s+/);
  return (
    (words[0]?.[0] ?? "") + (words.length > 1 ? words[words.length - 1][0] : "")
  );
}

export function surnameSortName(name: string) {
  if (name.includes(",")) return name.trim();
  const full = name.trim().replace(/\s+/g, " ");
  // Known compound surnames; everything else remains editable in the author page.
  const compounds = ["García Márquez", "Vargas Llosa", "Le Guin"];
  const compound = compounds.find((surname) => full.endsWith(` ${surname}`));
  if (compound) return `${compound}, ${full.slice(0, -compound.length).trim()}`;
  const words = full.split(" ");
  if (words.length < 2) return full;
  let start = words.length - 1;
  while (
    start > 1 &&
    [
      "de",
      "del",
      "la",
      "las",
      "los",
      "van",
      "von",
      "der",
      "den",
      "da",
      "dos",
      "di",
      "du",
      "le",
    ].includes(words[start - 1].toLowerCase())
  )
    start--;
  return `${words.slice(start).join(" ")}, ${words.slice(0, start).join(" ")}`;
}
export function displayAuthor(book: AuthoredBook) {
  return (
    book.author_profiles?.map((profile) => profile.display_name).join(", ") ||
    book.author
  );
}
export function bookAuthorSort(book: AuthoredBook) {
  return (
    book.author_profiles?.[0]?.sort_name ||
    surnameSortName(
      book.author_profiles?.[0]?.display_name ||
        book.authors?.[0] ||
        book.author,
    )
  );
}
