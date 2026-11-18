---
name: mi-antibiblioteca
description: Mantener el contexto y desarrollar la biblioteca personal mi-antibiblioteca, su estantería, catálogo y acceso desde agentes. Usar en este repositorio o al invocar su idea; no aplicar a otras bibliotecas.
---

# Mi antibiblioteca

Trabaja desde la raíz del repositorio que contiene esta skill. Lee `AGENTS.md` y
`docs/vision.md` antes de proponer o implementar cambios. Para los lomos, consulta
además `docs/spines.md`. La visión es la fuente del estado y las decisiones;
no dupliques su contenido completo aquí.

## Mantener esta skill al día

Cuando cambien requisitos confirmados, comportamiento, arquitectura, comandos,
fuentes de datos o formas de trabajar, revisa y actualiza esta misma skill y sus
referencias antes de dar la tarea por terminada. Actualiza `docs/vision.md` con
el resultado real y el README si cambian el uso o la instalación. Sustituye las
instrucciones obsoletas; no acumules reglas contradictorias ni presentes propuestas
como decisiones aprobadas. Conserva el contexto en español.

Esta copia versionada es la fuente de la skill. Si existe una instalación personal,
usa un enlace a esta copia o sincronízala al cambiarla; no dejes dos versiones
divergentes. Los cambios de documentación/skill acompañan al código en el commit
cuando se haya solicitado commit.

## Criterios que deben conservarse

- Biblioteca personal local y autoalojable. Datos SQLite, copias y secretos fuera
  de Git. El deseo de abrir el código no autoriza publicar datos ni desplegar.
- La página principal es una estantería literal con lomos, no una cuadrícula ni
  una portada promocional. Conservar el acabado Nogal original y la textura de
  madera; el desplegable de acabados muestra muestras circulares de color.
- Estantería, Lista y Autores comparten libros y fichas. Orden predeterminado por
  apellido; nombre habitual separado de la identidad original del catálogo.
- Portadas y metadatos corresponden a la edición en español o inglés elegida.
  No sustituirlos por datos generales de la obra en otro idioma.
- Los estilos editoriales y grosores son aproximaciones. No afirmar que un lomo
  es exacto ni inventar páginas, retratos, opiniones o contenido de un libro.
- Mantener eliminados los pies de página generales. Los créditos específicos
  de una imagen pueden permanecer junto a ella.
- MCP, notas, resúmenes y recomendaciones siguen según el alcance de la visión;
  una conversación exploratoria no autoriza implementarlos todos.

## Implementación y comprobaciones

Backend Python/FastAPI/SQLite con uv; frontend React/TypeScript/Vite en `web/`.
Comandos desde la raíz:

```sh
uv sync
npm ci --prefix web
npm run --prefix web build
uv run main.py
```

La aplicación local se abre en `http://127.0.0.1:8000`.
Verifica los cambios con las comprobaciones pertinentes:

```sh
uv run pytest
npm test --prefix web
npm run --prefix web build
```

Para cambios visuales, usa la skill `orca-cli` y su guía vigente para comprobar
la app en navegador, incluyendo móvil si cambia el diseño responsive. Prueba con
los datos existentes sin añadir ejemplos permanentes a la biblioteca del usuario.
Si no puedes verificar algo, describe el límite sin darlo por comprobado.
