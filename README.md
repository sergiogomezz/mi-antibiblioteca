# Mi antibiblioteca

Tu biblioteca personal, en tu ordenador. Primera versión local: busca libros por
título, autor o ISBN, añádelos con su portada y organiza tus lecturas.

## Arrancar

Necesitas [uv](https://docs.astral.sh/uv/), Python 3.12 o superior y Node.js 22.12+
(recomendado: una versión LTS compatible con Vite).

Desde la raíz del repositorio:

```sh
uv sync
npm ci --prefix web
npm run --prefix web build
uv run main.py
```

Abre **http://127.0.0.1:8000**. Para detener la app, pulsa Ctrl+C.
El servidor escucha únicamente en tu ordenador. Esta versión no incluye login
ni está preparada para exponerse directamente a Internet.

## Qué puedes hacer

- Buscar en Open Library y añadir resultados con portada y autor.
- Marcar un libro como pendiente, leyendo o leído y filtrar la biblioteca.
- Quitar libros; la misma edición no se añade dos veces.
- Conservar la biblioteca al cerrar y volver a abrir la aplicación.
- Consultar Lista con vistas de tabla, portadas o lista compacta; buscar por
  título/autor/editorial, filtrar por estado y ordenar los libros.
- Ordenar por apellido del autor por defecto. En la ficha del autor, «Nombre y
  ordenación» permite corregir su nombre habitual y la clave de apellido, conservando
  la identificación original del catálogo.
- Explorar Autores: una tarjeta por autor y una pestaña Libros con los ejemplares
  que tienes guardados; desde ella puedes abrir y editar sus fichas.
- Ver retratos de Open Library cuando se identifica al autor vinculado al libro.
  Si no hay una foto disponible, se muestran sus iniciales.
- Ver lomos cuyo grosor depende de las páginas de la edición. Se recuperan al
  añadir el libro y puedes corregirlas desde su ficha. Si no hay dato disponible,
  el grosor es provisional. Es una aproximación visual, no una medida del papel.

Los resultados proceden del catálogo de Open Library y pueden tener datos
incompletos. Se buscan ediciones en español por defecto; puedes elegir inglés
y filtrar por editorial. Solo aparecen ediciones con el idioma confirmado.
Se guarda la portada de esa edición, que puede diferir de tu ejemplar físico.
El año es el de primera publicación de la obra.
Buscar y cargar portadas requiere Internet; consultar los datos ya guardados no.

## Tus datos

La base SQLite se crea en `data/library.sqlite3`, fuera de Git. Cada instalación
tiene su propia biblioteca. Para hacer una copia, detén la aplicación y copia
la carpeta `data/`. No publiques esa carpeta al compartir el código.
Puedes cambiar la ruta con la variable `ANTIBIBLIOTECA_DB`.

## Desarrollo

Arranca el backend con `uv run main.py` y, en otra terminal:

```sh
npm run --prefix web dev
```

Abre la URL de Vite, normalmente http://127.0.0.1:5173. Sus llamadas `/api`
se redirigen al backend local. La API se documenta en http://127.0.0.1:8000/docs.
Después de cambiar el frontend, vuelve a ejecutar el build para verlo en el puerto 8000.

```sh
uv run pytest
npm test --prefix web
npm run --prefix web build
```

Backend: FastAPI y SQLite. Frontend: React, TypeScript y Vite.
Los datos y portadas proceden de [Open Library](https://openlibrary.org).

Estado de dependencias: la auditoría de producción no detecta vulnerabilidades.
La auditoría completa señala un aviso de ReDoS en `picomatch`, dependencia de las
herramientas de desarrollo de Vite, incluso con las versiones más recientes
consultadas. Revisar su actualización antes de distribuir el proyecto.

## Contexto para agentes

Lee [AGENTS.md](AGENTS.md) y la [skill del proyecto](.agents/skills/mi-antibiblioteca/SKILL.md).
La skill y [la visión](docs/vision.md) se mantienen con los cambios del proyecto.

## Próximos pasos

Notas y opiniones por libro, MCP para asistentes, y evolución de la estantería.
Los resúmenes, recomendaciones y funciones de compartir siguen en definición.
La intención es publicar el proyecto como open source; la licencia está pendiente
de elegir. Consulta [la visión del proyecto](docs/vision.md).
