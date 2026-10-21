---
title: "Sesión 2026-10-21 · Auditoría de las instrucciones para Claude"
type: informe
tags: [operacion, sesion]
estado: vigente
actualizado: 2026-10-21
---

# Sesión 2026-10-21 · Auditoría de las instrucciones para Claude

Se revisó lo que Claude lee como instrucción: el `CLAUDE.md` del proyecto, los hooks de
`.claude/hooks/`, la memoria del proyecto y el `CLAUDE.md` global de Joseph. La revisión
siguió la guía `prompt-audit` de la skill `claude-api`, con Claude Opus 5.5 como modelo
destino. El `CLAUDE.md` del proyecto tenía dos datos viejos y ya quedaron corregidos. Los
cambios a la memoria y al archivo global están propuestos y esperan el visto bueno de Joseph.

## Qué cambió

| PR o commit | Qué trae |
|---|---|
| PR de la rama `auditoria-prompts` | `CLAUDE.md`: la lista de módulos incluye `turnos` e `importacion`, y el CI construye las imágenes de la API y de la web. `vista-general.md` deja de decir que falta `importacion`. Nace [P-088](../../01-requerimientos/pendientes.md#p-088--la-fusión-automática-no-consulta-las-alertas-de-code-scanning). |

No hubo cambios fuera del repositorio.

## Pruebas

Las rutas, los scripts, los identificadores y las versiones que nombra el `CLAUDE.md` se
compararon con el repositorio: unas 45 rutas, 25 identificadores de código y los scripts de
los tres `package.json`. Solo fallaron los dos datos corregidos. El cambio toca únicamente
Markdown, así que la verificación de código la corre el CI del PR.

## Decisiones

- Se deja en el `CLAUDE.md` la fecha en que Joseph pidió la fusión automática
  («Flujo de trabajo»). Es la autorización para fusionar sin preguntar.
- La memoria que repite reglas del `CLAUDE.md` (humanizer, Joseph trabaja solo, un PR por
  fase, fusionar tras el PR, informe por sesión) se queda como está, porque dice lo mismo que
  el `CLAUDE.md`.

## Errores y correcciones

El primer intento de editar `vista-general.md` lo frenó el hook de humanizer porque la skill no
se había invocado en ese turno. Se invocó y se repitió la edición.

## Pendiente

- Consultar las alertas de code scanning antes de la fusión automática
  ([P-088](../../01-requerimientos/pendientes.md#p-088--la-fusión-automática-no-consulta-las-alertas-de-code-scanning)).

## Depende de Joseph

Estos cambios quedan fuera del repositorio y esperan su visto bueno en la sesión:

- Memoria `issues-como-plan-de-trabajo`: nombra como pendientes los issues #34, #35, #36, #38
  y #42, que ya están cerrados. La propuesta es quitar la lista y remitir al
  [plan de acción](../../05-planes/plan-de-accion.md) y a las etiquetas `bloque-N` y `deuda`.
- Memoria `stitch-modelo-rapido`: las entradas del 15, el 17 y el 18 de octubre se contradicen
  sobre `list_screens` y sobre pedir una o varias pantallas por llamada. La propuesta es dejar
  una sola versión con lo último que se comprobó, y corregir su línea en el índice `MEMORY.md`.
- `CLAUDE.md` global: no tiene hallazgos que pidan cambios. El bloque de graphify repite lo que
  ya hace la skill y puede quedarse.
