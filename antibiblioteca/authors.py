"""Display conventions are separate from catalogued identity."""

from antibiblioteca.portraits import normal_name

# Confirmed by the user and Herder's author credit. Keep a stable identity key
# matching previously shared author links.
FRANKL_NAMES = {
    "viktor emil frankl",
    "viktor frankl",
    "viktor e. frankl",
    "viktor e frankl",
}


def identity_key(name: str) -> str:
    key = normal_name(name)
    return "viktor emil frankl" if key in FRANKL_NAMES else key


def author_profile(name: str, preferences: dict) -> dict:
    key = identity_key(name)
    known = key == "viktor emil frankl"
    preference = preferences.get(key, {})
    return {
        "key": key,
        "catalog_name": name,
        "display_name": preference.get("display_name")
        or ("Viktor Frankl" if known else name),
        "sort_name": preference.get("sort_name")
        or ("Frankl, Viktor" if known else None),
    }


def present_authors(record: dict, preferences: dict) -> dict:
    names = record.get("authors") or [record["author"]]
    return {
        **record,
        "author_profiles": [author_profile(name, preferences) for name in names],
    }
