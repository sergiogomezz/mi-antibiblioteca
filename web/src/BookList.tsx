import { displayAuthor } from "./authors";
import { useState } from "react";
import { Cover } from "./BookCover";
import {
  labels,
  selectBooks,
  type Book,
  type Status,
  type BookSort,
} from "./books";
const views = {
  table: "Tabla",
  cards: "Portadas",
  compact: "Compacta",
} as const;
type View = keyof typeof views;
export function BookList({
  books,
  loading,
  error,
  onRetry,
  onOpen,
  onAdd,
}: {
  books: Book[];
  loading: boolean;
  error: string;
  onRetry: () => void;
  onOpen: (book: Book) => void;
  onAdd: () => void;
}) {
  const [view, setView] = useState<View>(() => {
    try {
      const saved = localStorage.getItem("antibiblioteca.list-view");
      return saved && Object.hasOwn(views, saved) ? (saved as View) : "table";
    } catch {
      return "table";
    }
  });
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status | "all">("all");
  const [sort, setSort] = useState<BookSort>("author");
  const selected = selectBooks(books, query, status, sort);
  function chooseView(value: View) {
    setView(value);
    try {
      localStorage.setItem("antibiblioteca.list-view", value);
    } catch {
      /* Session selection remains usable. */
    }
  }
  return (
    <section className="book-list-section" aria-label="Lista de libros">
      <div className="list-heading">
        <h1>Lista</h1>
        <div
          className="view-switch"
          role="group"
          aria-label="Vista de los libros"
        >
          {Object.entries(views).map(([key, label]) => (
            <button
              type="button"
              key={key}
              aria-pressed={view === key}
              onClick={() => chooseView(key as View)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="list-tools">
        <label className="list-search">
          Buscar
          <input
            type="search"
            placeholder="Título, autor o editorial"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label>
          Estado
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Status | "all")}
          >
            <option value="all">Todos</option>
            {Object.entries(labels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Ordenar por
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as BookSort)}
          >
            <option value="recent">Últimos añadidos</option>
            <option value="title">Título</option>
            <option value="author">Apellido del autor (A–Z)</option>
            <option value="pages">Número de páginas</option>
          </select>
        </label>
      </div>
      <p className="list-count" role="status">
        {loading
          ? "Cargando libros…"
          : `${selected.length} de ${books.length} libros`}
      </p>
      {error && (
        <p className="error" role="alert">
          {error} <button onClick={onRetry}>Volver a cargar</button>
        </p>
      )}
      {!loading && !books.length ? (
        <div className="authors-empty">
          <p>Aún no tienes libros en tu biblioteca.</p>
          <button className="primary" onClick={onAdd}>
            Añadir un libro
          </button>
        </div>
      ) : !loading && !selected.length ? (
        <div className="authors-empty">
          <p>No hay libros que coincidan con estos filtros.</p>
          <button
            className="add-button"
            onClick={() => {
              setQuery("");
              setStatus("all");
            }}
          >
            Limpiar filtros
          </button>
        </div>
      ) : view === "table" ? (
        <div
          className="table-scroll"
          role="region"
          aria-label="Tabla de libros"
          tabIndex={0}
        >
          <table className="books-table">
            <thead>
              <tr>
                <th scope="col">Libro</th>
                <th scope="col">Autor</th>
                <th scope="col">Editorial</th>
                <th scope="col">Estado</th>
                <th scope="col" className="numeric">
                  Páginas
                </th>
              </tr>
            </thead>
            <tbody>
              {selected.map((book) => (
                <tr key={book.id}>
                  <td>
                    <button className="table-book" onClick={() => onOpen(book)}>
                      <Cover book={book} />
                      <span>{book.title}</span>
                    </button>
                  </td>
                  <td>{displayAuthor(book)}</td>
                  <td>{book.publisher || "—"}</td>
                  <td>
                    <span className="book-status">
                      {labels[book.status ?? "pending"]}
                    </span>
                  </td>
                  <td className="numeric">{book.number_of_pages ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : view === "cards" ? (
        <div className="list-cards">
          {selected.map((book) => (
            <button
              className="list-cover-card"
              key={book.id}
              onClick={() => onOpen(book)}
              aria-label={`Abrir ${book.title}`}
            >
              <div className="list-cover-stage">
                <Cover book={book} />
              </div>
              <h2>{book.title}</h2>
              <p>{displayAuthor(book)}</p>
              <span className="book-status">
                {labels[book.status ?? "pending"]}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <ul className="compact-books">
          {selected.map((book) => (
            <li key={book.id}>
              <button onClick={() => onOpen(book)}>
                <span className="compact-title">
                  <strong>{book.title}</strong>
                  <span>{displayAuthor(book)}</span>
                </span>
                <span className="compact-publisher">
                  {book.publisher || "—"}
                </span>
                <span className="book-status">
                  {labels[book.status ?? "pending"]}
                </span>
                <span className="compact-pages">
                  {book.number_of_pages ? `${book.number_of_pages} págs.` : "—"}
                </span>
                <span aria-hidden="true">↗</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
