---
title: "P5 · Mapa de acopios · diseño en Stitch"
type: diseno
tags: [diseno, stitch, portal]
estado: vigente
actualizado: 2026-10-19
---

# P5 · Mapa de acopios · diseño en Stitch

| | |
|---|---|
| Proyecto | ACOPIO DISEÑO (`10306891818878200068`), tema «Acopio Field Command» |
| Pantalla | `52a7223330044a7291ac89f30d0bb5d2` |
| Exportada | 2026-09-30 |
| Archivos | [captura.png](captura.png) · [pantalla.html](pantalla.html) |
| Aprobación | Joseph la aprobó en Stitch el 2026-09-30, con las diferencias de abajo |
| Construida | [construida.png](construida.png), en Chromium a 360 × 640 |
| Capa de zonas | [maqueta-zonas.html](maqueta-zonas.html) (<https://claude.ai/artifact/LL5E9aWJDeJfQ2f51sAwXu>), aprobada por Joseph el 2026-10-17. Construida: [construida-zona.png](construida-zona.png) · [construida-zonas-lista.png](construida-zonas-lista.png) (`consola-recepciones.mjs`) |

## Capa de zonas con necesidad (HU-13.1)

Lo que el Receptor reporta en C20 aparece en el mapa como un círculo con el radio de la zona,
en el verde claro de la marca y con borde punteado. Un pin abre debajo del mapa una tarjeta
con cada categoría, la nota pública entre comillas y su antigüedad. No lleva nombre ni
dirección, porque la API pública no los entrega. En la vista de lista las zonas van antes de
los acopios. Solo se dibujan las zonas con algo que falta.

El encuadre abarca acopios y zonas. Con la demo, que junta Bogotá y Mocoa, el mapa abre muy
alejado: se ve el pin, y el círculo aparece al acercarse.

## Grupos por tipo y pines de Stitch (2026-10-19)

Maqueta en [P03-causas/maqueta-plataformas-y-mapa.html](../P03-causas/maqueta-plataformas-y-mapa.html),
aprobada por Joseph el 2026-10-19.

- Los grupos se separan por tipo y nunca mezclan: círculos verdes llenos para los acopios de
  Acopio (pausados incluidos) y blancos con borde para los puntos de RedAcopio, cada uno con su
  número. Antes un solo grupo juntaba todo lo cercano y no se distinguía nada.
- De cerca, cada punto es la píldora de Stitch con ícono y nombre corto (hasta 14 letras, sin el
  «Acopio» del comienzo): `warehouse` para el acopio, `pause` para el pausado y `link` con borde
  para RedAcopio.
- La zona con necesidad es una píldora con borde punteado y el ícono `campaign`. La maqueta le
  ponía el nombre de la zona, pero la API pública no lo trae, así que dice cuántas cosas faltan
  («2 faltantes»).
- `rounded-full` del tema vale 0.75rem, así que los grupos y las píldoras usan `rounded-[999px]`
  para quedar redondos.

## Diferencias

Aprobadas por Joseph el 2026-09-30:

- La tarjeta del acopio elegido no lleva «Saturación crítica» ni «Excedente»; solo «No traigan: ropa».
- El nombre del acopio y la entidad van en dos líneas.

Aprobada por Joseph el 2026-10-01, después de construida:

- El filtro de categorías es «¿Qué vas a llevar?». Oculta los acopios que no reciben esa categoría y dice cuántos ocultó. La pantalla de Stitch tenía «No recibe: Ropa» como filtro activo, que muestra lo contrario de lo que pide RF-RED-002. Stitch todavía no se ha corregido (P-035).
