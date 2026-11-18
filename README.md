# Mi antibiblioteca

Base de proyecto Python con [uv](https://docs.astral.sh/uv/).

## Empezar

Con `uv` instalado:

```sh
uv sync
uv run main.py
```

`uv sync` crea el entorno virtual `.venv` e instala las dependencias.
`uv run` utiliza ese entorno sin tener que activarlo manualmente.

## Dependencias

```sh
uv add nombre-del-paquete
uv add --dev nombre-del-paquete
uv remove nombre-del-paquete
```

Guarda `pyproject.toml` y `uv.lock` en Git para mantener las dependencias
reproducibles. El entorno `.venv` y los archivos `.env` se ignoran.

Para activar el entorno manualmente en macOS/Linux, si lo necesitas:

```sh
source .venv/bin/activate
```
