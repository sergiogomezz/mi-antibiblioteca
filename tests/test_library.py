import httpx
import pytest
from fastapi.testclient import TestClient
from antibiblioteca import app as module


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(module, "DB_PATH", tmp_path / "library.sqlite3")

    async def no_pages(source_id):
        return None

    monkeypatch.setattr(module, "edition_pages", no_pages)
    with TestClient(module.app) as client:
        yield client


BOOK = {
    "source_id": "OL123M",
    "title": "Un libro",
    "author": "Una autora",
    "cover_id": 123,
}


def test_library_survives_reopening_and_rejects_duplicates(client):
    created = client.post("/api/books", json=BOOK)
    assert created.status_code == 201
    book = created.json()
    assert book["status"] == "pending"
    assert book["number_of_pages"] is None
    assert client.post("/api/books", json=BOOK).status_code == 409
    assert (
        client.patch(f"/api/books/{book['id']}", json={"status": "read"}).json()[
            "status"
        ]
        == "read"
    )
    with TestClient(module.app) as reopened:
        assert reopened.get("/api/books").json()[0]["status"] == "read"
    assert client.delete(f"/api/books/{book['id']}").status_code == 204
    assert client.get("/api/books").json() == []


def test_validation_and_foreign_origin(client):
    assert (
        client.post("/api/books", json={**BOOK, "source_id": "../evil"}).status_code
        == 422
    )
    assert (
        client.post(
            "/api/books", json=BOOK, headers={"Origin": "https://foreign.example"}
        ).status_code
        == 403
    )
    assert client.patch("/api/books/999", json={"status": "invalid"}).status_code == 422
    assert client.patch("/api/books/999", json={"status": "read"}).status_code == 404


def test_search_maps_metadata_and_isbn(client, monkeypatch):
    async def get(self, url, **kwargs):
        assert kwargs["params"]["q"] == "isbn:9780141182803 AND language:eng"
        return httpx.Response(
            200,
            json={
                "docs": [
                    {
                        "key": "/works/OL1W",
                        "title": "Unrelated German work title",
                        "author_name": ["Albert Camus"],
                        "cover_i": 999,
                        "editions": {
                            "docs": [
                                {
                                    "key": "/books/OL2M",
                                    "title": "Ulysses",
                                    "language": ["eng"],
                                    "publisher": ["Penguin"],
                                    "cover_i": 45,
                                },
                                {
                                    "key": "/books/OL3M",
                                    "title": "German edition",
                                    "language": ["ger"],
                                },
                                {"key": "/books/OL4M", "title": "Unknown language"},
                            ]
                        },
                    }
                ]
            },
            request=httpx.Request("GET", url),
        )

    monkeypatch.setattr(httpx.AsyncClient, "get", get)
    result = client.get(
        "/api/search", params={"q": "978-0-14-118280-3", "language": "en"}
    )
    assert result.status_code == 200
    assert result.json()[0]["source_id"] == "OL2M"
    assert result.json()[0]["author"] == "Albert Camus"
    assert len(result.json()) == 1
    assert result.json()[0]["cover_id"] == 45
    assert result.json()[0]["title"] == "Ulysses"
    assert result.json()[0]["publisher"] == "Penguin"
    assert result.json()[0]["language"] == "eng"


def test_search_failure_is_actionable(client, monkeypatch):
    async def get(self, url, **kwargs):
        raise httpx.ConnectError("offline")

    monkeypatch.setattr(httpx.AsyncClient, "get", get)
    assert client.get("/api/search", params={"q": "Camus"}).status_code == 502


def test_spanish_default_and_publisher_filter(client, monkeypatch):
    async def get(self, url, **kwargs):
        assert kwargs["params"]["q"].endswith('AND language:spa AND publisher:"Herder"')
        return httpx.Response(200, json={"docs": []}, request=httpx.Request("GET", url))

    monkeypatch.setattr(httpx.AsyncClient, "get", get)
    assert (
        client.get("/api/search", params={"q": "Frankl", "publisher": "Herder"}).json()
        == []
    )
    assert (
        client.get("/api/search", params={"q": "Frankl", "language": "de"}).status_code
        == 422
    )


def test_existing_database_migrates_without_losing_books(tmp_path, monkeypatch):
    import sqlite3

    path = tmp_path / "old.sqlite3"
    with sqlite3.connect(path) as db:
        db.execute(
            "CREATE TABLE books (id INTEGER PRIMARY KEY, source_id TEXT UNIQUE, title TEXT, author TEXT, year INTEGER, cover_id INTEGER, status TEXT, created_at TEXT)"
        )
        db.execute(
            "INSERT INTO books VALUES (1,'OL1M','Mi libro','Autor',2000,NULL,'read','2026-01-01')"
        )
    monkeypatch.setattr(module, "DB_PATH", path)

    async def no_pages(source_id):
        return None

    monkeypatch.setattr(module, "edition_pages", no_pages)
    with TestClient(module.app) as migrated:
        book = migrated.get("/api/books").json()[0]
        assert book["title"] == "Mi libro" and book["status"] == "read"
        assert book["publisher"] is None
        assert (
            migrated.post(
                "/api/books",
                json={
                    **BOOK,
                    "publisher": "Herder",
                    "language": "spa",
                    "number_of_pages": 200,
                },
            ).json()["publisher"]
            == "Herder"
        )


def test_pages_are_fetched_saved_and_can_be_corrected(client, monkeypatch):
    async def pages(source_id):
        assert source_id == BOOK["source_id"]
        return 176

    monkeypatch.setattr(module, "edition_pages", pages)
    created = client.post("/api/books", json=BOOK).json()
    assert created["number_of_pages"] == 176
    path = f"/api/books/{created['id']}"
    assert (
        client.patch(path, json={"number_of_pages": 240}).json()["number_of_pages"]
        == 240
    )
    assert client.patch(path, json={"status": "read"}).json()["number_of_pages"] == 240
    assert client.patch(path, json={"number_of_pages": 0}).status_code == 422
    assert client.patch(path, json={"status": None}).status_code == 422
    assert (
        client.patch(path, json={"number_of_pages": None}).json()["number_of_pages"]
        is None
    )


@pytest.mark.parametrize(
    "value, expected",
    [(176, 176), (None, None), (0, None), (-1, None), ("176", None), (True, None)],
)
def test_edition_page_metadata_validation(monkeypatch, value, expected):
    import asyncio
    from antibiblioteca.pages import edition_pages

    async def get(self, url, **kwargs):
        assert url == "https://openlibrary.org/books/OL123M.json"
        return httpx.Response(
            200, json={"number_of_pages": value}, request=httpx.Request("GET", url)
        )

    monkeypatch.setattr(httpx.AsyncClient, "get", get)
    assert asyncio.run(edition_pages("OL123M")) == expected


def test_spine_choice_survives_reload_and_can_return_to_automatic(client):
    created = client.post("/api/books", json={**BOOK, "number_of_pages": 200}).json()
    path = f"/api/books/{created['id']}"
    assert created["spine_style"] is None
    assert (
        client.patch(path, json={"spine_style": "anagrama-compactos"}).json()[
            "spine_style"
        ]
        == "anagrama-compactos"
    )
    assert client.get("/api/books").json()[0]["spine_style"] == "anagrama-compactos"
    assert client.patch(path, json={"spine_style": "unknown"}).status_code == 422
    assert client.patch(path, json={"spine_style": None}).json()["spine_style"] is None
    assert client.get("/api/books").json()[0]["number_of_pages"] == 200


def test_coauthors_are_preserved_in_all_book_responses(client):
    created = client.post(
        "/api/books",
        json={**BOOK, "number_of_pages": 100, "authors": ["Autora Uno", "Autor Dos"]},
    ).json()
    assert created["authors"] == ["Autora Uno", "Autor Dos"]
    assert "authors_json" not in created
    assert client.get("/api/books").json()[0]["authors"] == created["authors"]
    updated = client.patch(
        f"/api/books/{created['id']}", json={"status": "read"}
    ).json()
    assert updated["authors"] == created["authors"]


def test_portrait_is_linked_to_book_and_cached(client, monkeypatch):
    calls = []

    async def resolve(source_id, name):
        calls.append(source_id)
        return {
            "author_id": "OL1A",
            "photo_url": "https://covers.openlibrary.org/a/id/1-M.jpg",
            "source_url": "https://openlibrary.org/authors/OL1A",
        }

    monkeypatch.setattr(module, "resolve_portrait", resolve)
    book = client.post("/api/books", json={**BOOK, "number_of_pages": 100}).json()
    params = {"book_id": book["id"], "name": BOOK["author"]}
    assert (
        client.get("/api/authors/portrait", params=params).json()["author_id"] == "OL1A"
    )
    assert client.get("/api/authors/portrait", params=params).status_code == 200
    assert calls == [BOOK["source_id"]]
    assert (
        client.get(
            "/api/authors/portrait", params={**params, "name": "Someone else"}
        ).status_code
        == 404
    )


@pytest.mark.parametrize(
    "name, photos, found",
    [
        ("Una autora", [123], True),
        ("Otra persona", [123], False),
        ("Una autora", [-1], False),
    ],
)
def test_portrait_uses_book_references_and_valid_photos(
    monkeypatch, name, photos, found
):
    import asyncio
    from antibiblioteca import portraits

    async def no_wait(delay):
        pass

    monkeypatch.setattr(portraits.asyncio, "sleep", no_wait)

    async def get(self, url, **kwargs):
        data = {
            "https://openlibrary.org/books/OL1M.json": {
                "works": [{"key": "/works/OL2W"}]
            },
            "https://openlibrary.org/works/OL2W.json": {
                "authors": [{"author": {"key": "/authors/OL3A"}}]
            },
            "https://openlibrary.org/authors/OL3A.json": {
                "name": "Una autora",
                "photos": photos,
            },
        }[url]
        return httpx.Response(200, json=data, request=httpx.Request("GET", url))

    monkeypatch.setattr(httpx.AsyncClient, "get", get)
    result = asyncio.run(portraits.resolve_portrait("OL1M", name))
    assert bool(result) == found
    if found:
        assert (
            result["photo_url"]
            == "https://covers.openlibrary.org/a/id/123-M.jpg?default=false"
        )


def test_preferred_author_name_keeps_catalog_and_portraits_intact(client, monkeypatch):
    created = client.post(
        "/api/books",
        json={
            **BOOK,
            "author": "Viktor Emil Frankl",
            "authors": ["Viktor Emil Frankl"],
            "number_of_pages": 157,
        },
    ).json()
    profile = created["author_profiles"][0]
    assert profile["display_name"] == "Viktor Frankl"
    assert profile["sort_name"] == "Frankl, Viktor"
    assert created["author"] == "Viktor Emil Frankl"
    edited = client.put(
        "/api/authors/preference",
        json={
            "book_id": created["id"],
            "catalog_name": "Viktor Emil Frankl",
            "display_name": "Viktor E. Frankl",
            "sort_name": "Frankl, Viktor E.",
        },
    )
    assert edited.status_code == 200
    assert edited.json()[0]["author_profiles"][0]["display_name"] == "Viktor E. Frankl"
    assert (
        client.get("/api/books").json()[0]["author_profiles"][0]["sort_name"]
        == "Frankl, Viktor E."
    )
    assert (
        client.put(
            "/api/authors/preference",
            json={
                "book_id": created["id"],
                "catalog_name": "Otra persona",
                "display_name": "X",
                "sort_name": "X",
            },
        ).status_code
        == 404
    )
    assert (
        client.put(
            "/api/authors/preference",
            json={
                "book_id": created["id"],
                "catalog_name": "Viktor Emil Frankl",
                "display_name": "  ",
                "sort_name": "X",
            },
        ).status_code
        == 422
    )
