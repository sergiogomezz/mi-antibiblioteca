# Mi antibiblioteca

Documento vivo del producto. Distingue decisiones confirmadas, funcionamiento
implementado y posibilidades pendientes. Mantener en español y sustituir el
contexto obsoleto al cambiar el proyecto.

## Visión y decisiones confirmadas

Una biblioteca personal a la que volver como cuando sacas un libro de la estantería:
recordar ideas, hojear apuntes, escribir a partir de lecturas y descubrir conexiones.
El usuario quiere las distintas formas de recorrerla; no reducirla a registrar
lecturas ni a una única actividad.

- Primero para uso propio. Después se valorará distribuirla para terceros.
- Open source y autoalojable: cada instalación tiene sus datos independientes.
  Publicar el código no publica la biblioteca. Licencia concreta aún sin elegir.
- La web y el agente de confianza del usuario deben acceder al mismo espacio.
  El agente debe poder consultar y mantener la biblioteca, no solo añadir libros.
  El acceso mediante MCP y el flujo de voz todavía no están implementados.
- La entrada principal debe ser literalmente una estantería con baldas y lomos.
  El usuario rechazó una cuadrícula de portadas como página principal y las
  cabeceras promocionales con frases decorativas.
- La lista de libros y la sección Autores ofrecen otras formas de consultar la
  misma biblioteca. El orden predeterminado es alfabético por apellido del autor,
  con título como desempate para los libros.
- Mostrar nombres habituales de publicación, como Viktor Frankl, conservando la
  identidad original del catálogo. No eliminar segundos nombres a ciegas.
- Preferencia por ediciones en español o inglés y editoriales reconocibles.
  Añadir libros debe recuperar metadatos y portadas automáticamente.
- Compartir bibliotecas y visitar las de otras personas es una aspiración futura;
  no hace falta una plataforma central multiusuario para el primer uso personal.

## Aplicación implementada

Backend Python >=3.12 con FastAPI, httpx y SQLite; dependencias con uv.
Frontend React, TypeScript y Vite en `web/`. Arranque y desarrollo en README.
`uv run main.py` escucha solo en `127.0.0.1:8000`; no hay autenticación ni despliegue
público. Se necesita compilar el frontend antes de usarlo en ese puerto.

### Biblioteca y catálogo

- Buscar por título, autor o ISBN en Open Library. Español por defecto; selector
  de inglés y filtro de editorial con sugerencias, sin lista cerrada de sellos.
- Usar título, portada, editorial e idioma de la edición coincidente, no los datos
  generales de la obra que pueden corresponder a otro idioma. Se exige idioma
  confirmado. El año mostrado sigue siendo la primera publicación de la obra.
- Añadir libros, evitar duplicados por identificador de edición, cambiar estado
  (pendiente/leyendo/leído) y quitar libros con confirmación.
- Los libros y sus datos sobreviven al cierre de la aplicación. La biblioteca,
  cachés y preferencias de autores están en `data/library.sqlite3`, fuera de Git.
  Las migraciones conservan los datos existentes. Las copias locales quedan
  igualmente excluidas de Git.

### Estantería y apariencia

- Baldas con libros de lomo interactivos; pulsarlos abre la ficha con portada,
  editorial, estado, páginas y selección de estilo de lomo.
- Ancho por páginas: `6 + 0,06 × páginas` px, limitado a 12–110 px por legibilidad.
  Si no se conoce, 24 px provisionales. Al añadir, se consultan páginas de la
  edición; la ficha permite corregirlas o borrarlas. No inventar el dato.
- Catálogo de estilos en `web/src/spines.ts`: Herder blanco/verde, Anagrama crema,
  Compactos, Alianza bolsillo, Acantilado rojo, Penguin Classics negro, Penguin
  clásico naranja y neutro. Referencias y límites en `docs/spines.md`.
- La editorial normalizada determina el estilo automático; no se deduce una
  colección de un grupo editorial (PRH no implica Penguin Classics). Hay una regla
  específica para una edición Herder con cubierta verde conocida. La elección
  manual se guarda como `spine_style`; null restablece el automático.
- Los lomos son aproximaciones, no fotografías verificadas del ejemplar. Alturas
  y algunos colores siguen siendo ilustrativos.
- Acabados: Nogal (el marrón oscuro original, preferido y predeterminado), Cerezo,
  Roble natural, Fresno blanco y Ébano. Veta SVG local irregular con poros/nudo
  sutil y distinta orientación para marco y baldas. Conservar sensación de madera.
- Desplegable junto al título: muestra circular de madera tanto en el botón como
  en cada opción, marca de selección y navegación por teclado/cierre con Escape
  o al pulsar fuera. Elección guardada por navegador en `antibiblioteca.shelf-finish`.
- Favicon: libro con monograma UE manuscrito original, homenaje a Umberto Eco;
  no se presenta como su firma auténtica.
- Sin pie general de página: se eliminaron mensajes de ayuda y enlace general a
  Open Library del footer. El crédito específico del retrato permanece en la ficha.

### Lista y Autores

- `#lista`: Tabla, Portadas y Compacta. Búsqueda por título/autor/editorial sin
  distinguir tildes, filtro de estado y orden por apellido (predeterminado), título,
  últimos añadidos o páginas, dejando páginas desconocidas al final.
- La vista se conserva por navegador en `antibiblioteca.list-view`. Los filtros
  no alteran datos; hay estados vacíos y limpieza de filtros.
- `#autores`: tarjeta por autor con nombre, retrato o iniciales y cantidad de libros.
  Página individual con pestaña Libros y apertura de sus fichas existentes.
- Coautores estructurados en `authors_json`; cada uno recibe el libro. Los registros
  antiguos conservan el campo completo sin separar comas que pueden formar parte
  de un apellido catalogado. No se inventan equivalencias biográficas.
- `author_profiles` separa nombre original, nombre visible y clave de ordenación.
  La equivalencia Viktor Emil Frankl → Viktor Frankl es explícita, confirmada por
  el usuario y [el crédito de Herder](https://herdereditorial.com/el-hombre-en-busca-de-sentido-9788425451096).
- «Nombre y ordenación» en la ficha permite guardar correcciones en
  `author_preferences`. Se aplican también a búsquedas y futuros libros. Sin clave
  explícita se sugiere apellido con partículas y algunos compuestos conocidos;
  puede requerir corrección. Identidad, enlaces existentes y retratos se conservan.
- Retratos: referencias de autores de la edición/obra en Open Library, comprobando
  nombre o alias; nunca el primer resultado de una búsqueda por nombre. Se pueden
  probar hasta tres libros vinculados. Caché SQLite de siete días y peticiones
  espaciadas. Sin foto, coincidencia clara o conexión, se muestran iniciales.
- Rutas hash para enlaces directos, recarga y navegación atrás/adelante.

## Confianza y fuentes

Distinguir contenido del autor, apuntes personales, citas y propuestas de IA.
La IA no debe asumir que conoce cualquier libro ni inventar opiniones del usuario.
Un resumen del libro y uno de las notas son contenidos diferentes y necesitan
identificar su base. No se requieren libros completos en PDF para esta experiencia.
Las condiciones concretas de textos, portadas y proveedores no se han revisado
legalmente; no presentar su uso como una autorización general.

Fuentes integradas:

- [Búsqueda de Open Library](https://openlibrary.org/dev/docs/api/search).
- [Ediciones y obras](https://openlibrary.org/dev/docs/api/books).
- [Autores](https://openlibrary.org/dev/docs/api/authors).
- [Portadas y retratos](https://openlibrary.org/dev/docs/api/covers).

Google Books se ha propuesto como alternativa, pero no está integrado. La IA para
nombres podría sugerir equivalencias verificables; no está implementada y no debe
sustituir identidades automáticamente por conjeturas.

## Pendiente, sin cerrar ni implementar

- Notas, opiniones, citas y reflexiones por libro; posible historial de relecturas.
- Próximas lecturas con orden propio y espacio de recomendaciones.
- MCP: lectura y escritura de los mismos datos que usa la web. La voz podría
  transcribirse en el asistente; no se ha elegido asistente ni transporte.
- Resúmenes fiables, búsqueda por significado y conexiones entre lecturas.
- Separar posesión y estado de lectura; privacidad/publicación selectiva y exportación.
  Son propuestas discutidas, no requisitos cerrados.
- Alojamiento, autenticación, compartir bibliotecas y licencia open source concreta.
- PostgreSQL/Docker si un despliegue posterior los necesita; no son requisitos
  del uso personal inicial.

## Mantenimiento y verificación

La skill versionada vive en `.agents/skills/mi-antibiblioteca/SKILL.md`; la instalación
personal enlaza a esa copia. El usuario pidió que las propias skills se actualicen
cuando cambie el proyecto, junto con visión y documentación, sin versiones divergentes.

Comprobaciones: `uv run pytest`, `npm test --prefix web` y
`npm run --prefix web build`. Última comprobación funcional: 20 pruebas Python y
9 de frontend, build correcto; comprobadas las vistas en navegador y móvil según
los cambios. Auditoría npm: aviso conocido en `picomatch` de herramientas de
Vite, documentado en README; auditoría de producción sin avisos en la revisión previa.

El usuario autorizó versionar la implementación y la documentación y subirlas a
`main`. Mantener los datos personales fuera del repositorio; consultar Git para
comprobar el estado de sincronización.

## Referentes investigados

Búsqueda exploratoria, sin pruebas exhaustivas de los productos:
[Jelu](https://github.com/bayang/jelu),
[BookWyrm](https://github.com/bookwyrm-social/bookwyrm),
[BookLore](https://github.com/booklore-app/booklore) y
[co-reading-mcp](https://github.com/idleprocesscc/co-reading-mcp).
Existen piezas similares e integraciones MCP. La combinación de estantería visual,
memoria de lectura y acceso desde agentes es una hipótesis de identidad propia,
no una afirmación de exclusividad ni de demanda validada.
