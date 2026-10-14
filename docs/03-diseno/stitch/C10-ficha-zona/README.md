---
title: "Ficha de zona · diseño en Stitch"
type: diseno
tags: [diseno, stitch, consola, motor]
estado: vigente
actualizado: 2026-10-14
---

# Ficha de zona · diseño en Stitch

| | |
|---|---|
| Proyecto | ACOPIO DISEÑO (`10306891818878200068`) |
| Pantalla | `f6a5105ca8e5436d8abe8bf6812f0288` («C10 Ficha de zona - Consola Acopio»), con el tema «Acopio · sistema de diseño» (`assets/3694704229522762996`) |
| Exportada | 2026-10-14 |
| Archivos | [captura.png](captura.png) · [pantalla.html](pantalla.html) |
| Maqueta | [Maqueta del ciclo 1](maqueta.html) (<https://claude.ai/artifact/WWwc7dGhbvLUxgKj3AycUb>), con C11, los pesos, el informe de descartes y el ajuste de población de C9 |
| Aprobación | Joseph la aprobó el 2026-10-14 |
| Construida | Pendiente, ciclo 1 de la interfaz del Bloque 4 |

## Qué muestra

`/consola/zonas/:id`, a la que se llega desde la lista de C9. La ven el Administrador y el Receptor asignado a la zona, y solo el Administrador corrige.

- La zona, el municipio y la emergencia con su estado. La población va con su fuente y su fecha (RF-MOT-012), seguida del horizonte en días y del enlace «Ajustar población».
- La cobertura global en grande y la categoría más baja.
- Una fila por categoría, de menor a mayor cobertura. Cada fila tiene una barra y la línea «Necesita · Recibido · En camino · Faltan», y dice si la necesidad sale de la canasta o de una corrección manual. La corrección muestra su motivo, quién la puso y cuándo.
- Al tocar una categoría se abre una hoja con el cálculo (canasta × población × horizonte, con la fuente de la canasta) y «Corregir la necesidad», que pide cantidad y motivo. Una categoría ya corregida ofrece «Volver a la canasta».
- Los reportes vigentes del Receptor, con su nota y su antigüedad.
- Si la emergencia está cerrada, la ficha queda en solo lectura.

## Diferencias

- Quité de lo que dibujó Stitch el botón «Actualizar entrada de suministros», el id «ZON-86001-A», «Meta: 100 %» y «balance global ponderado», porque la API no tiene nada de eso.
- Los reportes del Receptor van sin el lugar («Punto de acopio Coliseo Municipal»), que la API no guarda.
- La fuente y la fecha de la población tienen su propia línea junto al número.
- La cabecera y la barra inferior son las de la consola.
- La hoja de cálculo y corrección y la de ajustar población no salieron de Stitch. Las armé con los tokens.
