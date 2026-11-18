"""Page counts come from the selected edition, never the work average."""

import re

import httpx


async def edition_pages(source_id: str) -> int | None:
    if not re.fullmatch(r"OL\d+M", source_id):
        return None
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            response = await client.get(
                f"https://openlibrary.org/books/{source_id}.json",
                headers={"User-Agent": "MiAntibiblioteca/0.1 (personal local library)"},
            )
            response.raise_for_status()
            pages = response.json().get("number_of_pages")
            if type(pages) is int and 0 < pages <= 20000:
                return pages
    except (httpx.HTTPError, ValueError, AttributeError):
        pass
    return None
