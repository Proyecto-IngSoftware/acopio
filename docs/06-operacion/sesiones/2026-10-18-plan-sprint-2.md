---
title: "Sesión 2026-10-18 · Fechas del Sprint 2 y casillas de #45 y #47"
type: informe
tags: [operacion, sesion]
estado: vigente
actualizado: 2026-10-18
---

# Sesión 2026-10-18 · Fechas del Sprint 2 y casillas de #45 y #47

Joseph pidió revisar qué quedaba en el plan de trabajo. Aparecieron tres cosas desalineadas
con lo que ya estaba hecho o decidido, y esta sesión las corrige.

## Qué cambió

| PR o commit | Qué trae |
|---|---|
| Este PR | Plan de acción con el cierre del Sprint 2 el 25 de octubre, la Review y la retrospectiva en la fila 6 y los pendientes que no nombraba. Avance 4 con la captura del tablero marcada como hecha |

En GitHub:

- [#47](https://github.com/Proyecto-IngSoftware/acopio/issues/47): el cuerpo decía semanas 11
  a 13, hasta el 1 de noviembre, pero P-047 y el cronograma cierran el sprint el domingo 25 de
  octubre (semana 12). Quedan marcados el Planning y el seguimiento de la semana 11. La acción
  «cada integrante abre un PR que otro revisa» queda tachada porque hoy trabaja una sola
  persona.
- [#45](https://github.com/Proyecto-IngSoftware/acopio/issues/45): marcada la captura del
  tablero del Sprint 1. Está en `evidencia/avance-04/tablero.png` desde el 16 de octubre y ya
  sale en el Word.
- [#43](https://github.com/Proyecto-IngSoftware/acopio/issues/43): suma P-058, la imagen que
  falta en Garage.

## Pruebas

`node scripts/revisar-plan.mjs` termina sin avisos y `bun run lint` pasa. El cambio solo toca
documentación; las pruebas unitarias y de integración las corre el CI del PR.

## Decisiones

- P-043 (pantalla del simulador) y P-044 (estado automático de una zona) no tienen fecha y se
  revisan en el Planning del Sprint 3. Quedan en «Se vigila sin fecha» del plan de acción.
- P-034 y P-038 ya estaban dentro de #43; la fila 13 del plan ahora lo dice.

## Errores y correcciones

Ninguno en la sesión. El desfase de fechas venía de antes: #47 se escribió suponiendo sprints
de tres semanas y nadie lo corrigió cuando P-047 se resolvió el 9 de octubre.

## Pendiente

- Seguimiento del 9 de octubre, filas del resto del equipo, retrospectiva confirmada y Word
  del Avance 4 regenerado ([#45](https://github.com/Proyecto-IngSoftware/acopio/issues/45),
  fila 3 del [plan de acción](../../05-planes/plan-de-accion.md)).
- Captura del tablero del Sprint 2, la del seguimiento y el Word del Avance 5 en OneDrive
  ([#47](https://github.com/Proyecto-IngSoftware/acopio/issues/47), fila 2).
- Seguimiento de la semana 12, Review del 23 y retrospectiva
  ([#47](https://github.com/Proyecto-IngSoftware/acopio/issues/47), fila 6).

## Depende de Joseph

Las capturas del seguimiento y de los tableros, y la subida de los Word a OneDrive
([#45](https://github.com/Proyecto-IngSoftware/acopio/issues/45),
[#47](https://github.com/Proyecto-IngSoftware/acopio/issues/47)).
