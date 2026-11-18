import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
import { labels, selectBooks, type Book, type Status } from "./books";
import { Cover } from "./BookCover";
import { BookList } from "./BookList";
import { groupAuthors, authorInitials, displayAuthor } from "./authors";
import {
  binding,
  automaticSpine,
  spineStyles,
  type SpineStyle,
} from "./spines";

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      typeof error.detail === "string"
        ? error.detail
        : "No hemos podido completar la operación.",
    );
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
function AuthorPortrait({
  name,
  bookIds,
  displayName,
  large = false,
}: {
  name: string;
  bookIds: number[];
  displayName?: string;
  large?: boolean;
}) {
  const [portrait, setPortrait] = useState<{
    photo_url: string;
    source_url: string;
  } | null>(null);
  const [broken, setBroken] = useState(false);
  const ids = bookIds.slice(0, 3).join(",");
  useEffect(() => {
    let active = true;
    setPortrait(null);
    setBroken(false);
    void (async () => {
      for (const id of ids.split(",").filter(Boolean)) {
        if (!active) return;
        try {
          const result = await api<{
            photo_url: string;
            source_url: string;
          } | null>(
            `/authors/portrait?${new URLSearchParams({ book_id: id, name })}`,
          );
          if (result) {
            if (active) setPortrait(result);
            return;
          }
        } catch {
          /* A missing portrait should never block the author's books. */
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [name, ids]);
  return (
    <span
      className={`author-portrait ${large ? "portrait-large" : ""}`}
      title={portrait && !broken ? "Retrato: Open Library" : undefined}
    >
      {portrait && !broken ? (
        <img
          src={portrait.photo_url}
          alt={`Retrato de ${displayName || name}`}
          onError={() => setBroken(true)}
        />
      ) : (
        <span className="author-monogram" aria-hidden="true">
          {authorInitials(displayName || name)}
        </span>
      )}
      {large && portrait && !broken && (
        <a
          className="portrait-credit"
          href={portrait.source_url}
          target="_blank"
          rel="noreferrer"
        >
          Open Library ↗
        </a>
      )}
    </span>
  );
}
function Bookshelf({
  books,
  onOpen,
  onAdd,
  loading,
}: {
  books: Book[];
  onOpen: (book: Book) => void;
  onAdd: () => void;
  loading: boolean;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width),
    );
    if (frame.current) observer.observe(frame.current);
    return () => observer.disconnect();
  }, []);
  const rows: Book[][] = [[]];
  let used = 0;
  for (const book of books) {
    const size = binding(book).width + 3;
    if (
      used + size > Math.max(80, width - 48) &&
      rows[rows.length - 1].length
    ) {
      rows.push([]);
      used = 0;
    }
    rows[rows.length - 1].push(book);
    used += size;
  }
  while (rows.length < 3) rows.push([]);
  return (
    <div className="bookcase" ref={frame} aria-label="Estantería de libros">
      {rows.map((row, index) => (
        <div className="shelf" key={index}>
          <div className="shelf-books">
            {row.map((book) => {
              const look = binding(book);
              return (
                <button
                  key={book.id}
                  className={`spine ${look.width < 28 ? "thin-binding" : ""} spine-${look.style}`}
                  style={{
                    width: look.width,
                    height: look.height,
                    backgroundColor: look.colour,
                    color: look.ink,
                  }}
                  onClick={() => onOpen(book)}
                  aria-label={`Abrir ${book.title}, ${displayAuthor(book)}`}
                  title={`${book.title} · ${displayAuthor(book)} · ${book.number_of_pages ? `${book.number_of_pages} páginas` : "Páginas desconocidas"}`}
                >
                  <span className="spine-author">{displayAuthor(book)}</span>
                  <span
                    className="spine-title"
                    style={{
                      fontSize: Math.max(
                        9,
                        Math.min(
                          Math.min(16, look.width - 5),
                          (look.height - 90) / (book.title.length * 0.55),
                        ),
                      ),
                    }}
                  >
                    {book.title}
                  </span>
                  <span className="spine-mark" aria-hidden="true">
                    {look.publisher || "·"}
                  </span>
                  {book.status === "reading" && (
                    <span className="ribbon" aria-hidden="true" />
                  )}
                </button>
              );
            })}
            {!books.length && index === 0 && (
              <button className="shelf-invitation" onClick={onAdd}>
                {loading
                  ? "Abriendo biblioteca…"
                  : "＋ Colocar el primer libro"}
              </button>
            )}
          </div>
          <div className="shelf-edge" aria-hidden="true" />
        </div>
      ))}
    </div>
  );
}
const finishes = {
  walnut: "Nogal",
  cherry: "Cerezo",
  light: "Roble natural",
  white: "Fresno blanco",
  black: "Ébano",
} as const;
type Finish = keyof typeof finishes;
function FinishPicker({
  finish,
  onChange,
}: {
  finish: Finish;
  onChange: (finish: Finish) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    menu.current
      ?.querySelector<HTMLButtonElement>('[aria-checked="true"]')
      ?.focus();
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  return (
    <div
      className="finish-picker"
      ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node))
          setOpen(false);
      }}
    >
      <span>Acabado</span>
      <div className="finish-dropdown">
        <button
          type="button"
          className="finish-trigger"
          ref={trigger}
          aria-label={`Acabado de la estantería: ${finishes[finish]}`}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls="finish-menu"
          onClick={() => setOpen(!open)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
            }
          }}
        >
          <span className={`wood-swatch swatch-${finish}`} aria-hidden="true" />
          {finishes[finish]}
          <span className="finish-chevron" aria-hidden="true">
            ⌄
          </span>
        </button>
        {open && (
          <div
            id="finish-menu"
            className="finish-menu"
            role="menu"
            aria-label="Acabado de la estantería"
            ref={menu}
            onKeyDown={(event) => {
              const buttons = [
                ...(menu.current?.querySelectorAll<HTMLButtonElement>(
                  '[role="menuitemradio"]',
                ) ?? []),
              ];
              const current = buttons.indexOf(
                document.activeElement as HTMLButtonElement,
              );
              if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
                event.preventDefault();
                const next =
                  event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? buttons.length - 1
                      : (current +
                          (event.key === "ArrowDown" ? 1 : -1) +
                          buttons.length) %
                        buttons.length;
                buttons[next]?.focus();
              } else if (event.key === "Escape") {
                event.preventDefault();
                setOpen(false);
                trigger.current?.focus();
              }
            }}
          >
            {Object.entries(finishes).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="menuitemradio"
                aria-checked={finish === key}
                tabIndex={-1}
                onClick={() => {
                  onChange(key as Finish);
                  setOpen(false);
                  trigger.current?.focus();
                }}
              >
                <span
                  className={`wood-swatch swatch-${key}`}
                  aria-hidden="true"
                />
                <span>{label}</span>
                <span className="finish-check" aria-hidden="true">
                  {finish === key ? "✓" : ""}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
function AuthorNameEditor({
  author,
  onSave,
}: {
  author: { name: string; sortName: string; lookupName: string };
  onSave: (name: string, sort: string) => Promise<void>;
}) {
  const [name, setName] = useState(author.name),
    [sort, setSort] = useState(author.sortName),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <details className="author-name-editor">
      <summary>Nombre y ordenación</summary>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setMessage("");
          try {
            await onSave(name.trim(), sort.trim());
            setMessage("Nombre guardado.");
          } catch (error) {
            setMessage((error as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Nombre habitual
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={200}
          />
        </label>
        <label>
          Apellido para ordenar
          <input
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            required
            maxLength={200}
          />
        </label>
        <button
          className="primary"
          disabled={busy || !name.trim() || !sort.trim()}
        >
          {busy ? "Guardando…" : "Guardar"}
        </button>
        <p className="hint">
          Nombre del catálogo: {author.lookupName}. El orden sugerido se puede
          corregir para apellidos compuestos.
        </p>
        <p role="status">{message}</p>
      </form>
    </details>
  );
}
function useLibraryRoute() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const update = () => setHash(window.location.hash);
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  let author = "";
  try {
    if (hash.startsWith("#autores/"))
      author = decodeURIComponent(hash.slice(9));
  } catch {
    /* Malformed URLs return to the author index. */
  }
  return {
    section: hash.startsWith("#autores")
      ? "authors"
      : hash === "#lista"
        ? "list"
        : "shelf",
    author,
  };
}
function App() {
  const route = useLibraryRoute();
  const [finish, setFinish] = useState<Finish>(() => {
    try {
      const saved = localStorage.getItem("antibiblioteca.shelf-finish");
      return saved && Object.hasOwn(finishes, saved)
        ? (saved as Finish)
        : "walnut";
    } catch {
      return "walnut";
    }
  });
  function changeFinish(value: Finish) {
    setFinish(value);
    try {
      localStorage.setItem("antibiblioteca.shelf-finish", value);
    } catch {
      /* Keep the selection for this session when storage is unavailable. */
    }
  }
  const [books, setBooks] = useState<Book[]>([]),
    [loading, setLoading] = useState(true);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [filter, setFilter] = useState<Status | "all">("all");
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState(""),
    [results, setResults] = useState<Book[]>([]);
  const [language, setLanguage] = useState("es");
  const [publisher, setPublisher] = useState("");
  const [searching, setSearching] = useState(false),
    [searched, setSearched] = useState(false),
    [searchError, setSearchError] = useState("");
  const [busy, setBusy] = useState<string | null>(null),
    [addingStatus, setAddingStatus] = useState<Status>("pending");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = books.find((book) => book.id === selectedId);
  const detail = useRef<HTMLDialogElement>(null);
  const dialog = useRef<HTMLDialogElement>(null),
    searchVersion = useRef(0);
  async function load() {
    setLoading(true);
    setError("");
    try {
      setBooks(await api<Book[]>("/books"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  useEffect(() => {
    if (selected) detail.current?.showModal();
    else detail.current?.close();
  }, [selected]);
  async function search(e: React.FormEvent) {
    e.preventDefault();
    const version = ++searchVersion.current;
    setSearching(true);
    setSearchError("");
    setResults([]);
    setSearched(false);
    try {
      const found = await api<Book[]>(
        `/search?${new URLSearchParams({ q: query.trim(), language, publisher })}`,
      );
      if (version === searchVersion.current) {
        setResults(found);
        setSearched(true);
      }
    } catch (e) {
      if (version === searchVersion.current)
        setSearchError((e as Error).message);
    } finally {
      if (version === searchVersion.current) setSearching(false);
    }
  }
  async function add(book: Book) {
    setBusy(book.source_id);
    setSearchError("");
    try {
      const saved = await api<Book>("/books", {
        method: "POST",
        body: JSON.stringify({ ...book, status: addingStatus }),
      });
      setBooks((current) => [saved, ...current]);
      setNotice(`«${book.title}» ya está en tu biblioteca.`);
    } catch (e) {
      setSearchError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  async function status(book: Book, value: Status) {
    setBusy(book.source_id);
    setError("");
    try {
      const saved = await api<Book>(`/books/${book.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: value }),
      });
      setBooks((current) =>
        current.map((b) => (b.id === saved.id ? saved : b)),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  async function remove(book: Book) {
    if (!window.confirm(`¿Quitar «${book.title}» de tu biblioteca?`)) return;
    setBusy(book.source_id);
    try {
      await api(`/books/${book.id}`, { method: "DELETE" });
      setSelectedId(null);
      setBooks((current) => current.filter((b) => b.id !== book.id));
      setNotice("Libro eliminado.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  const authors = groupAuthors(books);
  const currentAuthor = authors.find((author) => author.key === route.author);
  const visible = selectBooks(books, "", filter, "author");
  return (
    <>
      <header className="topbar">
        <a className="brand" href="/">
          mi antibiblioteca
        </a>
        <button className="primary" onClick={() => setOpen(true)}>
          ＋ Añadir libro
        </button>
      </header>
      <main>
        <nav className="section-nav" aria-label="Secciones de la biblioteca">
          <a
            href="#estanteria"
            aria-current={route.section === "shelf" ? "page" : undefined}
          >
            Estantería
          </a>
          <a
            href="#lista"
            aria-current={route.section === "list" ? "page" : undefined}
          >
            Lista <span>{books.length}</span>
          </a>
          <a
            href="#autores"
            aria-current={route.section === "authors" ? "page" : undefined}
          >
            Autores <span>{authors.length}</span>
          </a>
        </nav>
        {route.section === "shelf" ? (
          <section
            className="library"
            aria-label="Mi biblioteca"
            data-finish={finish}
          >
            <div className="library-heading">
              <h1>Mi estantería</h1>
              <span>
                {books.length} {books.length === 1 ? "libro" : "libros"}
              </span>
              <FinishPicker finish={finish} onChange={changeFinish} />
            </div>
            <div className="tabs" aria-label="Filtrar por estado">
              {(["all", "reading", "pending", "read"] as const).map((item) => (
                <button
                  key={item}
                  aria-pressed={filter === item}
                  className={filter === item ? "active" : ""}
                  onClick={() => setFilter(item)}
                >
                  {item === "all" ? "Todos los libros" : labels[item]}
                  <span>
                    {
                      books.filter((b) => item === "all" || b.status === item)
                        .length
                    }
                  </span>
                </button>
              ))}
            </div>
            {error && (
              <div className="error" role="alert">
                {error}{" "}
                <button onClick={() => void load()}>Volver a cargar</button>
              </div>
            )}
            <p className="notice" role="status">
              {notice}
            </p>
            <Bookshelf
              books={visible}
              onOpen={(book) => setSelectedId(book.id!)}
              onAdd={() => setOpen(true)}
              loading={loading}
            />
            {!loading && !visible.length && books.length > 0 && (
              <p className="shelf-message">No hay libros con este estado.</p>
            )}
          </section>
        ) : route.section === "list" ? (
          <BookList
            books={books}
            loading={loading}
            error={error}
            onRetry={() => void load()}
            onOpen={(book) => setSelectedId(book.id!)}
            onAdd={() => setOpen(true)}
          />
        ) : (
          <section className="authors-section" aria-label="Autores">
            {route.author && (
              <a className="back-link" href="#autores">
                ← Todos los autores
              </a>
            )}
            <div className="authors-heading">
              {currentAuthor && (
                <AuthorPortrait
                  name={currentAuthor.lookupName}
                  displayName={currentAuthor.name}
                  bookIds={currentAuthor.books.map((book) => book.id!)}
                  large
                />
              )}
              <div>
                <p className="section-kicker">MI BIBLIOTECA</p>
                <h1>
                  {currentAuthor
                    ? currentAuthor.name
                    : route.author
                      ? "Autor no encontrado"
                      : "Autores"}
                </h1>
              </div>
              <span>
                {currentAuthor ? currentAuthor.books.length : authors.length}{" "}
                {currentAuthor
                  ? currentAuthor.books.length === 1
                    ? "libro en tu biblioteca"
                    : "libros en tu biblioteca"
                  : authors.length === 1
                    ? "autor"
                    : "autores"}
              </span>
            </div>
            {currentAuthor && (
              <AuthorNameEditor
                key={currentAuthor.key}
                author={currentAuthor}
                onSave={async (display_name, sort_name) => {
                  const updated = await api<Book[]>("/authors/preference", {
                    method: "PUT",
                    body: JSON.stringify({
                      book_id: currentAuthor.books[0].id,
                      catalog_name: currentAuthor.lookupName,
                      display_name,
                      sort_name,
                    }),
                  });
                  setBooks(updated);
                }}
              />
            )}
            {error && (
              <p className="error" role="alert">
                {error}{" "}
                <button onClick={() => void load()}>Volver a cargar</button>
              </p>
            )}
            {loading ? (
              <p className="authors-empty" role="status">
                Cargando autores…
              </p>
            ) : currentAuthor ? (
              <>
                <div
                  className="author-tabs"
                  role="tablist"
                  aria-label="Contenido del autor"
                >
                  <button
                    id="author-books-tab"
                    role="tab"
                    aria-selected="true"
                    aria-controls="author-books"
                  >
                    Libros <span>{currentAuthor.books.length}</span>
                  </button>
                </div>
                <div
                  id="author-books"
                  role="tabpanel"
                  aria-labelledby="author-books-tab"
                  className="author-books"
                >
                  {currentAuthor.books.map((book) => (
                    <button
                      className="author-book"
                      key={book.id}
                      onClick={() => setSelectedId(book.id!)}
                      aria-label={`Abrir ${book.title}`}
                    >
                      <Cover book={book} />
                      <div>
                        <h2>{book.title}</h2>
                        <p>{book.publisher || "Editorial no indicada"}</p>
                        <span className="book-status">
                          {labels[book.status ?? "pending"]}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            ) : route.author ? (
              <p className="authors-empty">
                Este autor ya no tiene libros guardados.{" "}
                <a href="#autores">Volver a Autores</a>
              </p>
            ) : authors.length ? (
              <div className="authors-grid">
                {authors.map((author) => (
                  <a
                    className="author-card"
                    key={author.key}
                    href={`#autores/${encodeURIComponent(author.key)}`}
                  >
                    <AuthorPortrait
                      name={author.lookupName}
                      displayName={author.name}
                      bookIds={author.books.map((book) => book.id!)}
                    />
                    <div>
                      <h2>{author.name}</h2>
                      <p>
                        {author.books.length}{" "}
                        {author.books.length === 1 ? "libro" : "libros"}
                      </p>
                    </div>
                    <span className="author-arrow" aria-hidden="true">
                      ↗
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              <div className="authors-empty">
                <p>
                  Los autores aparecerán aquí cuando añadas libros a tu
                  biblioteca.
                </p>
                <button className="primary" onClick={() => setOpen(true)}>
                  Añadir un libro
                </button>
              </div>
            )}
          </section>
        )}
      </main>
      <dialog
        ref={detail}
        aria-labelledby="book-title"
        onCancel={() => setSelectedId(null)}
        onClick={(e) => {
          if (e.target === detail.current) setSelectedId(null);
        }}
      >
        {selected && (
          <div className="dialog-inner">
            <div className="dialog-heading">
              <h2 id="book-title">{selected.title}</h2>
              <button
                className="close"
                aria-label="Devolver a la estantería"
                onClick={() => setSelectedId(null)}
              >
                ×
              </button>
            </div>
            <div className="book-detail">
              <Cover book={selected} />
              <div>
                <p>{displayAuthor(selected)}</p>
                {selected.publisher && (
                  <p className="hint">
                    {selected.publisher} ·{" "}
                    {selected.language === "spa"
                      ? "Español"
                      : selected.language === "eng"
                        ? "English"
                        : "Idioma no indicado"}
                  </p>
                )}
                {selected.year && (
                  <p className="hint">Primera publicación: {selected.year}</p>
                )}
                <form
                  className="pages-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const value = new FormData(e.currentTarget).get(
                      "pages",
                    ) as string;
                    setBusy(selected.source_id);
                    setError("");
                    try {
                      const saved = await api<Book>(`/books/${selected.id}`, {
                        method: "PATCH",
                        body: JSON.stringify({
                          number_of_pages: value ? Number(value) : null,
                        }),
                      });
                      setBooks((current) =>
                        current.map((book) =>
                          book.id === saved.id ? saved : book,
                        ),
                      );
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setBusy(null);
                    }
                  }}
                >
                  <label>
                    Páginas{" "}
                    <input
                      key={`${selected.id}-${selected.number_of_pages}`}
                      name="pages"
                      type="number"
                      min="1"
                      max="20000"
                      defaultValue={selected.number_of_pages ?? ""}
                      placeholder="Sin dato"
                      aria-label="Número de páginas"
                    />
                  </label>
                  <button
                    className="add-button"
                    disabled={busy === selected.source_id}
                  >
                    Guardar
                  </button>
                </form>
                {!selected.number_of_pages && (
                  <p className="hint">
                    Sin dato de páginas: grosor provisional.
                  </p>
                )}
                <label>
                  Estado{" "}
                  <select
                    aria-label={`Estado de ${selected.title}`}
                    value={selected.status}
                    disabled={busy === selected.source_id}
                    onChange={(e) =>
                      void status(selected, e.target.value as Status)
                    }
                  >
                    {Object.entries(labels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="spine-picker">
                  Estilo del lomo
                  <select
                    aria-label="Estilo del lomo"
                    value={selected.spine_style ?? "auto"}
                    disabled={busy === selected.source_id}
                    onChange={async (e) => {
                      const style = e.target.value;
                      setBusy(selected.source_id);
                      setError("");
                      try {
                        const saved = await api<Book>(`/books/${selected.id}`, {
                          method: "PATCH",
                          body: JSON.stringify({
                            spine_style: style === "auto" ? null : style,
                          }),
                        });
                        setBooks((current) =>
                          current.map((book) =>
                            book.id === saved.id ? saved : book,
                          ),
                        );
                      } catch (e) {
                        setError((e as Error).message);
                      } finally {
                        setBusy(null);
                      }
                    }}
                  >
                    <option value="auto">
                      Automático · {spineStyles[automaticSpine(selected)].label}
                    </option>
                    {Object.entries(spineStyles).map(([key, style]) => (
                      <option key={key} value={key}>
                        {style.label}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="hint">
                  Diseño aproximado. Elige la colección si el automático no
                  coincide con tu ejemplar.
                </p>
                <button
                  className="remove"
                  disabled={busy === selected.source_id}
                  onClick={() => void remove(selected)}
                >
                  Quitar de mi biblioteca
                </button>
              </div>
            </div>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </div>
        )}
      </dialog>
      <dialog
        aria-labelledby="search-title"
        ref={dialog}
        onCancel={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === dialog.current) setOpen(false);
        }}
      >
        <div className="dialog-inner">
          <div className="dialog-heading">
            <div>
              <h2 id="search-title">Añadir un libro</h2>
            </div>
            <button
              className="close"
              aria-label="Cerrar búsqueda"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </div>
          <p className="hint">
            Busca por título, autor o ISBN. Traemos la portada y los datos por
            ti.
          </p>
          <div className="edition-filters">
            <label>
              Idioma
              <select
                aria-label="Idioma de la edición"
                value={language}
                onChange={(e) => {
                  setLanguage(e.target.value);
                  setResults([]);
                  setSearched(false);
                  searchVersion.current++;
                  setSearching(false);
                }}
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </label>
            <label>
              Editorial
              <input
                aria-label="Editorial"
                list="publishers"
                placeholder="Cualquiera"
                value={publisher}
                maxLength={100}
                onChange={(e) => {
                  setPublisher(e.target.value);
                  setResults([]);
                  setSearched(false);
                  searchVersion.current++;
                  setSearching(false);
                }}
              />
              <datalist id="publishers">
                {[
                  "Herder",
                  "Anagrama",
                  "Alianza",
                  "Acantilado",
                  "Tusquets",
                  "Seix Barral",
                  "Debolsillo",
                  "Penguin",
                  "Faber",
                  "Vintage",
                  "Oxford University Press",
                ].map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </label>
          </div>
          <form onSubmit={search} className="search-form">
            <input
              autoFocus
              aria-label="Título, autor o ISBN"
              placeholder="Título, autor o ISBN"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              minLength={2}
              maxLength={200}
              required
            />
            <button
              className="primary"
              disabled={searching || query.trim().length < 2}
            >
              {searching ? "Buscando…" : "Buscar"}
            </button>
          </form>
          <label className="add-status">
            Añadir como{" "}
            <select
              value={addingStatus}
              onChange={(e) => setAddingStatus(e.target.value as Status)}
            >
              {Object.entries(labels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <p className="hint">
            Solo se muestran ediciones con el idioma seleccionado confirmado.
            Puedes filtrar por editorial o buscar el ISBN de tu ejemplar.
          </p>
          {searchError && (
            <p className="error" role="alert">
              {searchError}
            </p>
          )}
          {searching && <p role="status">Buscando en Open Library…</p>}
          {searched && !results.length && (
            <p role="status">
              No encontramos coincidencias. Prueba con el autor o el ISBN.
            </p>
          )}
          <div className="results">
            {results.map((book) => {
              const exists = books.some((b) => b.source_id === book.source_id);
              return (
                <article className="result" key={book.source_id}>
                  <Cover book={book} />
                  <div>
                    <h3>{book.title}</h3>
                    <p>{displayAuthor(book)}</p>
                    <p className="edition-info">
                      {book.language === "spa" ? "Español" : "English"} ·{" "}
                      {book.publisher || "Editorial no indicada"}
                    </p>
                    {book.year && (
                      <small>Primera publicación: {book.year}</small>
                    )}
                    <a
                      href={`https://openlibrary.org/${book.source_id.startsWith("OL") && book.source_id.endsWith("M") ? "books" : "works"}/${book.source_id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Ver en Open Library ↗
                    </a>
                  </div>
                  <button
                    className="add-button"
                    disabled={exists || busy !== null}
                    onClick={() => void add(book)}
                  >
                    {exists
                      ? "Añadido ✓"
                      : busy === book.source_id
                        ? "Guardando…"
                        : "Añadir"}
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      </dialog>
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
