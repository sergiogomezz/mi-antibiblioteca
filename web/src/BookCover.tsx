import { displayAuthor } from "./authors";
import { useState, useEffect } from "react";
import type { Book } from "./books";
export function Cover({ book }: { book: Book }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [book.cover_id]);
  return (
    <div className="cover">
      {book.cover_id && !broken ? (
        <img
          src={`https://covers.openlibrary.org/b/id/${book.cover_id}-M.jpg?default=false`}
          alt={`Portada de ${book.title}`}
          onError={() => setBroken(true)}
        />
      ) : (
        <div className="paper-cover">
          <span>MI ANTIBIBLIOTECA</span>
          <strong>{book.title}</strong>
          <small>{displayAuthor(book)}</small>
        </div>
      )}
    </div>
  );
}
