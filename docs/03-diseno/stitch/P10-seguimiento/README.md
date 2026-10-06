---
title: "P10 · Seguir mi donación · diseño en Stitch"
type: diseno
tags: [diseno, stitch, portal, donador]
estado: vigente
actualizado: 2026-10-06
---

# P10 · Seguir mi donación · diseño en Stitch

| | |
|---|---|
| Proyecto | ACOPIO DISEÑO (`10306891818878200068`) |
| Pantalla | `249e805e59384b5ba89072975bce118f` |
| Exportada | 2026-10-06 |
| Archivos | [captura.png](captura.png) · [pantalla.html](pantalla.html) |
| Maqueta | En la [maqueta del ciclo 1](../P13-mi-cuenta/maqueta.html) |
| Aprobación | Joseph la aprobó el 2026-10-06 |
| Construida | [construida.png](construida.png), en Chromium a 360 × 640 |

## Qué muestra

Pública, en `/seguimiento/:folio`. Un campo para buscar otro folio, el estado, la línea de
tiempo (preparada, recibida en el acopio, conciliada) y lo que entró al acopio por categoría,
en unidad base. Un folio mal escrito y uno que no existe muestran el mismo mensaje.

## Diferencias

- Los pasos pendientes no se atenúan con opacidad: el texto no llegaba al contraste mínimo.
- El estado va en neutro; Stitch lo puso en morado.
- Sin «Trazabilidad ciudadana» encima del título, sin el paso de despacho y sin los
  subtítulos de categoría: la API no los tiene.
- Sin «Escanear código desde la cámara» ni los consejos de formato. El error da un ejemplo
  de folio.
- La nota de privacidad queda en una línea: «No mostramos quién donó».
