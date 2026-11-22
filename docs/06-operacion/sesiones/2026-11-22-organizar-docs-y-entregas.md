---
title: "Sesión 2026-11-22 · Organizar docs y entregas"
type: informe
tags: [operacion, sesion]
estado: vigente
actualizado: 2026-11-22
---

# Sesión 2026-11-22 · Organizar docs y entregas

Joseph pidió organizar `docs/` y las entregas. Cada entrega quedó en su carpeta y los índices
de planes, especificaciones, arquitectura y diseño enlazan las notas que les faltaban.

## Qué cambió

| Antes | Ahora |
|---|---|
| Notas, Word, PDF y scripts sueltos en `docs/entregas/` | Una carpeta por entrega, descrita en el [índice](../../entregas/README.md) |
| `docs/entregas/evidencia/avance-04`, `avance-05` y `complemento` | `evidencia/` dentro de la carpeta de cada entrega |
| `docs/talleres/` | [docs/entregas/guias/](../../entregas/guias/) |
| `unificar-avances.py` y `render.Dockerfile` en la raíz | [herramientas/](../../entregas/herramientas/) |
| «Acopio - Presentación» en la raíz | [presentacion-final/](../../entregas/presentacion-final/) |
| `docs/superpowers/plans/2026-10-19-entrada-unica.md` | [docs/05-planes/](../../05-planes/2026-10-19-entrada-unica.md) |
| `evidencia/avance-04/backlog1.png` | Borrado: era una copia exacta de `tablero.png` y nada lo usaba |

Los generadores y los comentarios que nombraban rutas apuntan a las nuevas. Las dos notas del
proyecto integrador sin frontmatter ya lo tienen, y `generar-pics.py` se lo salta.

Entraron al repositorio el PDF y el PPTX de la sustentación de la Entrega 2, las directrices y
rúbricas, y el Word y el PDF del PICS en español con los nombres completos, junto con la
corrección de [su informe](2026-11-18-proyecto-integrador-ingles.md). Solo estaban en el equipo.

Los informes y planes anteriores conservan en su texto las rutas de su fecha. Sus enlaces sí se
corrigieron.

## Pruebas

Los 1.832 enlaces internos que había antes llevan al mismo archivo después de mover. El único que
no resuelve es el de la plantilla de informe, escrito para `sesiones/`. Los generadores se
corrieron en una copia, antes y después, y se compararon 55 archivos entre Word, HTML e imágenes:
cambian las rutas escritas en el texto del Avance 2, del Avance 4 y del unificado, y el PICS en
español, que es la versión corregida. Las salidas de esas corridas no se versionaron. El lint, los
tipos y las pruebas los corre el CI del PR; en local no se corrieron.

## Decisiones

Joseph aprobó la estructura, corregir las rutas en los issues y subir los tres grupos de archivos
que no estaban versionados.

Claude dejó «Acopio - Avances IS1.docx» en la raíz de `entregas/`, aunque la estructura aprobada lo
ponía en `unificado/`. La carpeta de OneDrive es un clon de este repositorio y mover ese archivo
puede dañar un enlace compartido. La ayuda interna de la sustentación sigue fuera de Git.

## Errores y correcciones

Ninguno en los archivos. Al revisar los generadores apareció que los Word de los avances 4 y 5
tienen texto que no está en las notas.

## Pendiente

- Pasar ese texto a las notas y rehacer el unificado
  ([P-092](../../01-requerimientos/pendientes.md#p-092--pasar-a-las-notas-lo-escrito-a-mano-en-los-word-de-los-avances-4-y-5)).

## Depende de Joseph

Cuando el clon de OneDrive baje este cambio, los Word de cada avance cambian de carpeta allá. Si
alguno se compartió con un enlace propio, hay que volver a compartirlo
([índice de entregas](../../entregas/README.md)).
