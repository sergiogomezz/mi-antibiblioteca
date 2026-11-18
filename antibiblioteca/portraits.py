"""Resolve a portrait through the book's author references, not name search."""

import asyncio
import re
import time
import unicodedata

import httpx

_lock = asyncio.Lock()
_next_request = 0.0


def normal_name(name: str) -> str:
    return " ".join(unicodedata.normalize("NFKC", name).casefold().split())


async def resolve_portrait(source_id: str, name: str) -> dict | None:
    if not re.fullmatch(r"OL\d+[WM]", source_id):
        return None
    async with httpx.AsyncClient(timeout=10) as client:

        async def get(key):
            global _next_request
            async with _lock:
                await asyncio.sleep(max(0, _next_request - time.monotonic()))
                _next_request = time.monotonic() + 1.05
                response = await client.get(
                    f"https://openlibrary.org{key}.json",
                    headers={
                        "User-Agent": "MiAntibiblioteca/0.1 (personal local library)"
                    },
                )
                response.raise_for_status()
                return response.json()

        kind = "books" if source_id.endswith("M") else "works"
        record = await get(f"/{kind}/{source_id}")
        refs = record.get("authors", [])
        if not refs:
            works = record.get("works", [])
            if works and re.fullmatch(r"/works/OL\d+W", works[0].get("key", "")):
                record = await get(works[0]["key"])
                refs = record.get("authors", [])
        matches = []
        for ref in refs[:10]:
            key = ref.get("author", ref).get("key", "")
            if not re.fullmatch(r"/authors/OL\d+A", key):
                continue
            author = await get(key)
            names = [author.get("name", ""), *author.get("alternate_names", [])]
            if normal_name(name) not in {
                normal_name(n) for n in names if isinstance(n, str)
            }:
                continue
            photos = [p for p in author.get("photos", []) if type(p) is int and p > 0]
            if photos:
                matches.append(
                    {
                        "author_id": key.split("/")[-1],
                        "photo_url": f"https://covers.openlibrary.org/a/id/{photos[0]}-M.jpg?default=false",
                        "source_url": f"https://openlibrary.org{key}",
                    }
                )
        return matches[0] if len(matches) == 1 else None
