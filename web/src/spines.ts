export const spineStyles = {
  neutral: {
    label: "Neutro",
    publisher: "",
    colour: "#d6cdb8",
    ink: "#2f302a",
    height: 238,
  },
  herder: {
    label: "Herder · blanco",
    publisher: "Herder",
    colour: "#eeede5",
    ink: "#17648a",
    height: 248,
  },
  "herder-green": {
    label: "Herder · verde",
    publisher: "Herder",
    colour: "#a0bc32",
    ink: "#20231b",
    height: 248,
  },
  anagrama: {
    label: "Anagrama · crema",
    publisher: "ANAGRAMA",
    colour: "#e8ddac",
    ink: "#26241c",
    height: 247,
  },
  "anagrama-compactos": {
    label: "Anagrama · Compactos",
    publisher: "ANAGRAMA",
    colour: "#cbb83d",
    ink: "#22221d",
    height: 225,
  },
  alianza: {
    label: "Alianza · bolsillo",
    publisher: "Alianza",
    colour: "#242421",
    ink: "#f4eee0",
    height: 224,
  },
  acantilado: {
    label: "Acantilado · rojo",
    publisher: "ACANTILADO",
    colour: "#b82d25",
    ink: "#f6edd8",
    height: 252,
  },
  "penguin-classics": {
    label: "Penguin Classics · negro",
    publisher: "PENGUIN",
    colour: "#222320",
    ink: "#f4f0e8",
    height: 245,
  },
  "penguin-orange": {
    label: "Penguin · clásico naranja",
    publisher: "PENGUIN",
    colour: "#e98627",
    ink: "#28251c",
    height: 228,
  },
} as const;
export type SpineStyle = keyof typeof spineStyles;
export type SpineBook = {
  source_id: string;
  publisher?: string | null;
  number_of_pages?: number | null;
  spine_style?: SpineStyle | null;
};
export function automaticSpine(book: SpineBook): SpineStyle {
  const publisher = (book.publisher ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (/\bherder\b/.test(publisher))
    return book.source_id === "OL26482265M" ? "herder-green" : "herder";
  if (/\banagrama\b/.test(publisher))
    return /compactos/.test(publisher) ? "anagrama-compactos" : "anagrama";
  if (/\balianza\b/.test(publisher)) return "alianza";
  if (/\bacantilado\b/.test(publisher)) return "acantilado";
  // A publishing group is not a collection. Never infer Classics from PRH.
  if (/penguin classics/.test(publisher)) return "penguin-classics";
  if (/\bpenguin\b/.test(publisher) && !/random house/.test(publisher))
    return "penguin-orange";
  return "neutral";
}
export function binding(book: SpineBook) {
  const style =
    book.spine_style && book.spine_style in spineStyles
      ? book.spine_style
      : automaticSpine(book);
  const preset = spineStyles[style];
  const hash = [...book.source_id].reduce(
    (n, c) => (n * 31 + c.charCodeAt(0)) >>> 0,
    0,
  );
  const compactColours = [
    "#e0b83c",
    "#a2bba2",
    "#b58ab0",
    "#77b3c5",
    "#c65e3c",
    "#b8c25b",
  ];
  return {
    ...preset,
    style,
    width: book.number_of_pages
      ? Math.max(12, Math.min(110, 6 + book.number_of_pages * 0.06))
      : 24,
    colour:
      style === "anagrama-compactos"
        ? compactColours[hash % compactColours.length]
        : preset.colour,
  };
}
