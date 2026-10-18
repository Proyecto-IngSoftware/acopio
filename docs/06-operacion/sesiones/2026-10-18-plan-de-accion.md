---
title: "Sesión 2026-10-18 · Plan de acción y orden de los issues"
type: informe
tags: [operacion, sesion, plan, seguimiento]
estado: vigente
actualizado: 2026-10-18
---

# Sesión 2026-10-18 · Plan de acción y orden de los issues

Joseph pidió anotar todo lo que falta en un plan de acción que se corrija cuando algo cambie,
y poner al día los issues. Quedó el [plan de acción](../../05-planes/plan-de-accion.md), con un
script que lo compara con GitHub y un hook que recuerda actualizarlo.

## Qué cambió

| PR o commit | Qué trae |
|---|---|
| Rama `plan-de-accion` | El plan de acción; `scripts/revisar-plan.mjs`; el hook `.claude/hooks/plan-de-accion.mjs` registrado en `.claude/settings.json`; CLAUDE.md lee el plan al retomar y lo actualiza al cerrar; P-052 resuelto, P-057 con el caso de hoy y P-072 nuevo; el índice de planes con los bloques 4 y 5 y la pieza C cerrados |

Cambios en GitHub:

- Nuevo [#129](https://github.com/Proyecto-IngSoftware/acopio/issues/129): deuda de turnos
  (P-070 y P-071), semana 16.
- Cerrados [#55](https://github.com/Proyecto-IngSoftware/acopio/issues/55), cuyos escenarios
  ya estaban en `escenarios-por-rol.md` desde el PR #97, y
  [#35](https://github.com/Proyecto-IngSoftware/acopio/issues/35), el Bloque 4, que estaba en
  `main` desde #111.
- [#45](https://github.com/Proyecto-IngSoftware/acopio/issues/45),
  [#23](https://github.com/Proyecto-IngSoftware/acopio/issues/23) y
  [#21](https://github.com/Proyecto-IngSoftware/acopio/issues/21) pasan de la semana 10, ya
  vencida, a la 12. [#26](https://github.com/Proyecto-IngSoftware/acopio/issues/26) pasa de
  la 11 a la 17. Cada uno tiene un comentario con la razón.
- [#47](https://github.com/Proyecto-IngSoftware/acopio/issues/47) suma tres casillas: el
  Avance 5, la sustentación del 23 y confirmar la fecha de la Review.

## Pruebas

- `node scripts/revisar-plan.mjs` dice que el plan coincide con GitHub. Para ver que detecta
  lo contrario se alteró una copia del plan: una fila hecha marcada como pendiente, una
  pendiente marcada como hecha, una fecha vencida y una fila borrada. Avisó los cuatro casos y
  salió con 1.
- El hook se probó con cuatro comandos. Avisa tras `gh issue close` y tras `gh pr merge`
  encadenado con `&&`, y calla con `gh issue list` y con un texto que solo cita
  «`gh pr merge`».
- Verificación completa (`lint`, `typecheck`, `depcruise`, `test`, `test:int` y
  `revisar-colores.sh`) antes del commit.

## Decisiones

- Las fechas objetivo anteriores al 23 de octubre las propuso Claude; Joseph las puede mover.
  Las demás salen del cronograma.
- El orden de recorte es el Bloque 6, la pieza D y la deuda menor. La pieza E no se recorta
  porque completa HU-01, que es Must.

## Errores y correcciones

- La primera versión del hook avisaba cuando el texto de un comando solo citaba
  `gh pr merge`. Ahora solo cuenta cuando `gh` es el comando que corre.

## Pendiente

- Confirmar la fecha de la Review del Sprint 2
  ([P-072](../../01-requerimientos/pendientes.md),
  [#47](https://github.com/Proyecto-IngSoftware/acopio/issues/47)).
- Todo lo demás está ordenado en el [plan de acción](../../05-planes/plan-de-accion.md).

## Depende de Joseph

Confirmar la fecha de la Review (P-072) y el material del Word en OneDrive: el Avance 5 y lo
que falta de los anteriores ([#47](https://github.com/Proyecto-IngSoftware/acopio/issues/47),
[#45](https://github.com/Proyecto-IngSoftware/acopio/issues/45),
[#23](https://github.com/Proyecto-IngSoftware/acopio/issues/23),
[#21](https://github.com/Proyecto-IngSoftware/acopio/issues/21)).
