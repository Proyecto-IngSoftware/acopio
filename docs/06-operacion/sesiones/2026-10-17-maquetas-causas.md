---
title: "Sesión 2026-10-17 · Maquetas de causas (P3 y P4)"
type: informe
tags: [operacion, sesion]
estado: vigente
actualizado: 2026-10-17
---

# Sesión 2026-10-17 · Maquetas de causas (P3 y P4)

De los dos frentes que dejó la sesión anterior, Joseph eligió las maquetas de causas
([#57](https://github.com/Proyecto-IngSoftware/acopio/issues/57)), que vencen el 25 de
octubre. Las pantallas se generaron en Stitch, se armó la maqueta con los tokens y Joseph la
aprobó en la misma sesión.

## Qué cambió

| PR o commit | Qué trae |
|---|---|
| Rama `p57-maquetas-causas` | Exportaciones de Stitch y notas de P3 y P4, la maqueta, P-064, el índice de diseños, el índice de planes y este informe |

Fuera del repositorio:

- En Stitch (proyecto ACOPIO DISEÑO) quedaron tres pantallas nuevas: P3
  `fc223c5e88554eb584160f20c2e1eaf4`, P4 `b4201a1c526c4ea689fcdbd6eba4b46f` y P4 con la hoja
  de salida `a050a3861f9c4995a5bb1c40563d424c`.
- La maqueta está publicada en <https://claude.ai/artifact/RGCjCvMDq98rsddGa1iH6d>.

## Pruebas

Es un cambio de documentación. Corrieron `bun run lint` y `scripts/revisar-colores.sh`; el
resto de la verificación lo corre el CI del PR. Las pantallas de Stitch se revisaron
renderizando su HTML en Chromium a 360 px, porque la captura que entrega Stitch corta la
ficha a la altura de la pantalla.

## Decisiones

Joseph las tomó al aprobar la maqueta y quedaron en
[P-064](../../01-requerimientos/pendientes.md), para la especificación de la pieza C:

- «Causas atendidas» es una pantalla aparte de P3, para separar las secciones.
- La ficha de una causa atendida mantiene el enlace al sitio oficial.

## Errores y correcciones

- La primera generación de P3 en Stitch terminó en timeout, aun con `GEMINI_3_5_FLASH_LITE`.
  `list_screens` devolvió la misma lista antes y después (tampoco mostraba P4, que sí se
  generó), así que no sirvió para saber si la pantalla existía. Con un prompt más corto, el
  segundo intento salió.
- Stitch dibujó P4 con la hoja de salida encima, y la hoja tapaba los pasos. Se editó la
  pantalla para sacar la ficha sola, y se guardaron las dos.
- Las fotos que generó Stitch traen logotipos de la Defensa Civil. En la maqueta, la imagen es
  un espacio reservado.

## Pendiente

- Especificación de la pieza C, con las pantallas de la consola para verificar entidades y
  gestionar causas, y con las decisiones de P-064
  ([#48](https://github.com/Proyecto-IngSoftware/acopio/issues/48),
  [P-064](../../01-requerimientos/pendientes.md)).
- Especificación del Bloque 5
  ([#36](https://github.com/Proyecto-IngSoftware/acopio/issues/36)). El orden entre las dos
  está en «Lo que sigue» del [índice de planes](../../05-planes/README.md).
- La ronda de pruebas del equipo en el servidor
  ([#58](https://github.com/Proyecto-IngSoftware/acopio/issues/58)).

## Depende de Joseph

Elegir con cuál especificación sigue la próxima sesión, la de la pieza C o la del Bloque 5
([índice de planes](../../05-planes/README.md)).
