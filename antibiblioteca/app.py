import json
import os
import re
import sqlite3
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

import httpx
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from antibiblioteca.authors import identity_key, present_authors
from antibiblioteca.pages import edition_pages
from antibiblioteca.portraits import normal_name, resolve_portrait

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = Path(os.environ.get("ANTIBIBLIOTECA_DB", ROOT / "data/library.sqlite3"))
Status = Literal["pending", "reading", "read"]
SpineStyle = Literal[
    "neutral",
    "herder",
    "herder-green",
    "anagrama",
    "anagrama-compactos",
    "alianza",
    "acantilado",
    "penguin-classics",
    "penguin-orange",
]


def connect():
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    return db


@asynccontextmanager
async def lifespan(app):
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with connect() as db:
        db.execute("""CREATE TABLE IF NOT EXISTS books (
            id INTEGER PRIMARY KEY, source_id TEXT NOT NULL UNIQUE,
            title TEXT NOT NULL, author TEXT NOT NULL, year INTEGER,
            cover_id INTEGER, status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)""")
        columns = {row[1] for row in db.execute("PRAGMA table_info(books)")}
        for column in ("publisher", "language"):
            if column not in columns:
                db.execute(f"ALTER TABLE books ADD COLUMN {column} TEXT")
        if "authors_json" not in columns:
            db.execute("ALTER TABLE books ADD COLUMN authors_json TEXT")
        if "spine_style" not in columns:
            db.execute("ALTER TABLE books ADD COLUMN spine_style TEXT")
        if "number_of_pages" not in columns:
            db.execute("ALTER TABLE books ADD COLUMN number_of_pages INTEGER")
        db.execute(
            "CREATE TABLE IF NOT EXISTS author_portraits (book_id INTEGER, name TEXT, payload TEXT, checked_at REAL, PRIMARY KEY(book_id,name))"
        )
        db.execute(
            "CREATE TABLE IF NOT EXISTS author_preferences (key TEXT PRIMARY KEY, display_name TEXT NOT NULL, sort_name TEXT NOT NULL)"
        )
    yield


app = FastAPI(title="Mi antibiblioteca", lifespan=lifespan)


@app.middleware("http")
async def local_writes(request: Request, call_next):
    # A foreign web page must not write to a local user's library.
    if request.method not in ("GET", "HEAD", "OPTIONS"):
        origin = request.headers.get("origin")
        allowed = {
            f"http://{host}:{port}"
            for host in ("localhost", "127.0.0.1")
            for port in (8000, 5173)
        }
        if origin and origin not in allowed:
            return JSONResponse({"detail": "Origen no permitido"}, status_code=403)
    return await call_next(request)


class BookInput(BaseModel):
    source_id: str = Field(pattern=r"^OL\d+[WM]$")
    title: str = Field(min_length=1, max_length=1000)
    author: str = Field(min_length=1, max_length=1000)
    authors: list[str] | None = Field(default=None, max_length=100)
    year: int | None = None
    cover_id: int | None = Field(default=None, gt=0)
    status: Status = "pending"
    publisher: str | None = Field(default=None, max_length=1000)
    language: Literal["spa", "eng"] | None = None
    number_of_pages: int | None = Field(default=None, gt=0, le=20000)
    spine_style: SpineStyle | None = None


class BookUpdate(BaseModel):
    status: Status | None = None
    number_of_pages: int | None = Field(default=None, gt=0, le=20000)
    spine_style: SpineStyle | None = None


@app.get("/api/search")
async def search(
    q: str = Query(min_length=2, max_length=200),
    language: Literal["es", "en"] = "es",
    publisher: str = Query(default="", max_length=100),
):
    query = q.strip()
    if len(query) < 2:
        raise HTTPException(422, "Escribe un título, autor o ISBN.")
    isbn = re.sub(r"[\s-]", "", query)
    term = (
        f"isbn:{isbn}" if re.fullmatch(r"(\d{13}|\d{9}[\dXx])", isbn) else f"({query})"
    )
    code = {"es": "spa", "en": "eng"}[language]
    term += f" AND language:{code}"
    if publisher.strip():
        escaped = publisher.strip().replace("\\", "\\\\").replace('"', '\\"')
        term += f' AND publisher:"{escaped}"'
    params = {
        "q": term,
        "limit": 12,
        "lang": language,
        "fields": "key,author_name,first_publish_year,editions,editions.key,editions.title,editions.language,editions.publisher,editions.cover_i",
    }
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.get(
                "https://openlibrary.org/search.json",
                params=params,
                headers={"User-Agent": "MiAntibiblioteca/0.1 (personal local library)"},
            )
            response.raise_for_status()
            docs = response.json()["docs"]
    except (httpx.HTTPError, ValueError, KeyError):
        raise HTTPException(
            502, "Open Library no responde ahora. Prueba de nuevo en un momento."
        )
    results = []
    seen = set()
    for doc in docs:
        for edition in doc.get("editions", {}).get("docs", []):
            source_id = edition.get("key", "").split("/")[-1]
            # Work titles/covers can belong to a different language; only trust
            # the matching edition's metadata and its explicitly declared language.
            if (
                code not in edition.get("language", [])
                or not re.fullmatch(r"OL\d+M", source_id)
                or source_id in seen
            ):
                continue
            seen.add(source_id)
            results.append(
                {
                    "source_id": source_id,
                    "title": edition.get("title", "Sin título"),
                    "author": ", ".join(doc.get("author_name", []))
                    or "Autor desconocido",
                    "authors": doc.get("author_name", []),
                    "year": doc.get("first_publish_year"),
                    "cover_id": edition.get("cover_i"),
                    "publisher": ", ".join(edition.get("publisher", [])) or None,
                    "language": code,
                }
            )
    with connect() as db:
        prefs = author_preferences(db)
    return [present_authors(result, prefs) for result in results]


def author_preferences(db):
    return {
        row["key"]: dict(row) for row in db.execute("SELECT * FROM author_preferences")
    }


def book_record(row):
    record = dict(row)
    raw = record.pop("authors_json", None)
    record["authors"] = json.loads(raw) if raw else [record["author"]]
    with connect() as db:
        return present_authors(record, author_preferences(db))


@app.get("/api/books")
def books():
    with connect() as db:
        return [
            book_record(row)
            for row in db.execute("SELECT * FROM books ORDER BY id DESC")
        ]


class AuthorPreference(BaseModel):
    book_id: int
    catalog_name: str = Field(min_length=1, max_length=1000)
    display_name: str = Field(min_length=1, max_length=200)
    sort_name: str = Field(min_length=1, max_length=200)


@app.put("/api/authors/preference")
def save_author_preference(preference: AuthorPreference):
    if not preference.display_name.strip() or not preference.sort_name.strip():
        raise HTTPException(422, "Indica nombre y apellido de ordenación.")
    with connect() as db:
        row = db.execute(
            "SELECT * FROM books WHERE id=?", (preference.book_id,)
        ).fetchone()
        if not row or normal_name(preference.catalog_name) not in {
            normal_name(n) for n in book_record(row)["authors"]
        }:
            raise HTTPException(404, "Autor no vinculado a este libro.")
        db.execute(
            "INSERT OR REPLACE INTO author_preferences VALUES (?,?,?)",
            (
                identity_key(preference.catalog_name),
                preference.display_name.strip(),
                preference.sort_name.strip(),
            ),
        )
    return books()


@app.get("/api/authors/portrait")
async def portrait(book_id: int, name: str = Query(min_length=1, max_length=1000)):
    with connect() as db:
        row = db.execute("SELECT * FROM books WHERE id=?", (book_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Libro no encontrado.")
        book = book_record(row)
        if normal_name(name) not in {normal_name(n) for n in book["authors"]}:
            raise HTTPException(404, "Autor no vinculado a este libro.")
        cached = db.execute(
            "SELECT payload,checked_at FROM author_portraits WHERE book_id=? AND name=?",
            (book_id, normal_name(name)),
        ).fetchone()
        if cached and time.time() - cached["checked_at"] < 7 * 86400:
            return json.loads(cached["payload"])
    try:
        result = await resolve_portrait(book["source_id"], name)
    except (httpx.HTTPError, ValueError, TypeError, KeyError, AttributeError):
        raise HTTPException(502, "Retrato no disponible ahora.")
    with connect() as db:
        db.execute(
            "INSERT OR REPLACE INTO author_portraits VALUES (?,?,?,?)",
            (book_id, normal_name(name), json.dumps(result), time.time()),
        )
    return result


@app.post("/api/books", status_code=201)
async def add_book(book: BookInput):
    with connect() as db:
        if db.execute(
            "SELECT id FROM books WHERE source_id=?", (book.source_id,)
        ).fetchone():
            raise HTTPException(409, "Este libro ya está en tu biblioteca.")
    pages = (
        book.number_of_pages
        if book.number_of_pages is not None
        else await edition_pages(book.source_id)
    )
    with connect() as db:
        try:
            cursor = db.execute(
                "INSERT INTO books (source_id,title,author,year,cover_id,status,publisher,language,number_of_pages,spine_style,authors_json) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                (
                    book.source_id,
                    book.title,
                    book.author,
                    book.year,
                    book.cover_id,
                    book.status,
                    book.publisher,
                    book.language,
                    pages,
                    book.spine_style,
                    json.dumps(
                        [
                            name.strip()
                            for name in (book.authors or [book.author])
                            if name.strip()
                        ]
                        or [book.author],
                        ensure_ascii=False,
                    ),
                ),
            )
        except sqlite3.IntegrityError:
            raise HTTPException(409, "Este libro ya está en tu biblioteca.")
        return book_record(
            db.execute("SELECT * FROM books WHERE id=?", (cursor.lastrowid,)).fetchone()
        )


@app.patch("/api/books/{book_id}")
def change_status(book_id: int, update: BookUpdate):
    values = update.model_dump(exclude_unset=True)
    if not values or ("status" in values and values["status"] is None):
        raise HTTPException(422, "Indica un estado o un número de páginas válido.")
    assignments = ", ".join(f"{column}=?" for column in values)
    with connect() as db:
        if not db.execute(
            f"UPDATE books SET {assignments} WHERE id=?", (*values.values(), book_id)
        ).rowcount:
            raise HTTPException(404, "Libro no encontrado.")
        return book_record(
            db.execute("SELECT * FROM books WHERE id=?", (book_id,)).fetchone()
        )


@app.delete("/api/books/{book_id}", status_code=204)
def remove_book(book_id: int):
    with connect() as db:
        if not db.execute("DELETE FROM books WHERE id=?", (book_id,)).rowcount:
            raise HTTPException(404, "Libro no encontrado.")


if (ROOT / "web/dist").exists():
    app.mount("/", StaticFiles(directory=ROOT / "web/dist", html=True), name="web")
