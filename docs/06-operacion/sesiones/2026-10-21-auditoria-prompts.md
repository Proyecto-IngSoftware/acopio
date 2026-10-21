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
| PR de la rama `auditoria-prompts` | `CLAUDE.md`: la lista de módulos incluye `turnos` e `importacion`, y el CI construye las imágenes de la API y de la web. `vista-general.md` deja de decir que falta `importacion`. Nace [P-088](../../01-requerimientos/pendientes.md#p-088--la-fusión-automática-no-consulta-las-alertas-de-code-scanning). La prueba de Jornadas fija la fecha y ya no depende del día en que corre. |
| PR de la rama `revisar-plan-fecha` | `scripts/revisar-plan.mjs` lee la fecha de una fila solo en su columna «Fecha». Antes tomaba cualquier fecha del texto, y la fila 20 del plan de acción salía vencida por el nombre del plan que enlaza (`2026-10-20-presentaciones.md`), cuando su fecha es el 15 de noviembre. |
| PR de la rama `fusion-con-code-scanning` | Resuelve [P-088](../../01-requerimientos/pendientes.md#p-088--la-fusión-automática-no-consulta-las-alertas-de-code-scanning): el comando de fusión del `CLAUDE.md` y el de `.claude/hooks/fusionar-tras-pr.mjs` exigen cero alertas abiertas de code scanning antes de `gh pr review`. |

Fuera del repositorio, con el visto bueno de Joseph, se corrigió la memoria del proyecto:
`issues-como-plan-de-trabajo` ya no nombra issues cerrados y remite al plan de acción,
`stitch-modelo-rapido` quedó en una sola versión sin contradicciones (con su línea del índice) y
`fusionar-tras-pr` describe el comando nuevo.

## Pruebas

Las rutas, los scripts, los identificadores y las versiones que nombra el `CLAUDE.md` se
compararon con el repositorio: unas 45 rutas, 25 identificadores de código y los scripts de
los tres `package.json`. Solo fallaron los dos datos corregidos. Lint, tipos, depcruise y las
pruebas unitarias y de integración las corre el CI del PR.

## Decisiones

- Se deja en el `CLAUDE.md` la fecha en que Joseph pidió la fusión automática
  («Flujo de trabajo»). Es la autorización para fusionar sin preguntar.
- La memoria que repite reglas del `CLAUDE.md` (humanizer, Joseph trabaja solo, un PR por
  fase, fusionar tras el PR, informe por sesión) se queda como está, porque dice lo mismo que
  el `CLAUDE.md`.

## Errores y correcciones

El primer intento de editar `vista-general.md` lo frenó el hook de humanizer porque la skill no
se había invocado en ese turno. Se invocó y se repitió la edición.

El CI del PR falló en `apps/web/src/portal/turnos/Jornadas.test.tsx`, que no tenía que ver con
el cambio. La prueba busca la sección «Miércoles 21 de octubre», y el 21 de octubre la pantalla
la titula «Hoy, miércoles 21 de octubre». Se reprodujo en local: falla sin el arreglo y pasa con
él. La prueba ahora fija el reloj en el 20 de octubre, como ya hacen las de Causas. Pasaron lint,
tipos y la suite completa de la web.

## Pendiente

Nada. P-088 y los dos cambios de memoria quedaron hechos en la misma sesión. El `CLAUDE.md`
global no tuvo hallazgos que pidieran cambios.

## Depende de Joseph

Nada.
