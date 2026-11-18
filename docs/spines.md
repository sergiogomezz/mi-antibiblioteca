# Diseños de lomo

El catálogo está en `web/src/spines.ts` y su composición visual en `web/src/style.css`.
Son aproximaciones inspiradas en las líneas editoriales, no reproducciones
verificadas del ejemplar del usuario. No se incluyen fotografías ni logotipos ajenos.

## Referencias visuales

- [Compactos, Anagrama](https://www.anagrama-ed.es/coleccion/compactos):
  [fotografía oficial de los lomos](https://cms.anagrama-ed.es/uploads/media/colecciones/0001/30/thumb_29088_colecciones_big.jpeg).
  Colores variados y recuadro oscuro para el texto. El color individual aún es
  ilustrativo; no se deduce automáticamente de la portada.
- [Colecciones de Anagrama](https://www.anagrama-ed.es/colecciones): el estilo
  crema es una aproximación de familia; no identifica una colección por sí solo.
- [Penguin Classics](https://www.penguin.co.uk/about/publishing-houses/penguin-press/penguin-classics):
  línea de lomos negros; se ofrece también una interpretación del clásico naranja.
- [Alianza](https://www.alianzaeditorial.es/ver-todas-colecciones/) y
  [Acantilado](https://www.acantilado.es/catalogo/): estilos de familia simplificados.
- Herder: se consultó la portada de la edición guardada
  [OL26482265M](https://openlibrary.org/books/OL26482265M), verde con zona blanca,
  y se ofrece además una variante blanca con texto azul. El lomo no está fotografiado.

## Selección

1. Una elección manual `spine_style` prevalece sobre la automática.
2. El automático normaliza la editorial y reconoce las familias disponibles.
3. No equipara un grupo editorial con una colección (PRH no implica Classics).
4. Si no reconoce el sello, usa un lomo neutro.

El selector cambia la representación visual; no cambia la editorial ni la edición
catalogada. Una elección nula restablece el automático. Los libros antiguos se
migran conservando sus datos.

La anchura conserva la fórmula basada en páginas. Las alturas son ilustrativas
por familia; aún no se usan las dimensiones físicas del ejemplar.
