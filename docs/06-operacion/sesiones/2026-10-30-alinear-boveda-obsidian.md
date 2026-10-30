---
title: "Sesión 2026-10-30 · Bóveda alineada con su guía"
type: informe
tags: [operacion, sesion, obsidian]
estado: vigente
actualizado: 2026-10-30
---

# Sesión 2026-10-30 · Bóveda alineada con su guía

Se revisaron las 202 notas de la bóveda contra la [guía](../../GUIA-OBSIDIAN.md). La
estructura estaba bien (sin wikilinks, índices por carpeta, frontmatter casi completo),
pero la guía ya no describía los tipos, estados y etiquetas que la bóveda usa, y había
seis errores puntuales. La guía quedó al día con la bóveda y los seis errores corregidos.

## Qué cambió

| PR o commit | Qué trae |
|---|---|
| Rama `docs/alinear-boveda-obsidian` | Guía alineada, seis errores corregidos y este informe |

En la guía:

- `type` admite `plan`, `informe` y `guia`, que ya usaban 64 notas. Las tres notas con
  `especificacion` pasaron a `spec`.
- Los planes tienen sus estados propios (`aprobado`, `ejecutado`, `cerrado`), con lo que
  significa cada uno. Las dos notas con `reemplazada` pasaron a `reemplazado`.
- El vocabulario de etiquetas pasó de una lista cerrada de 19, que nadie seguía, a una
  tabla con las que están en uso, agrupadas. Se fusionaron `planes` en `plan`, `frontend`
  en `web` y `rf-mot-010` en `rf`.
- Dice la verdad sobre el plugin de comunidad: Mehrmaid está instalado y versionado.

Los seis errores:

1. Cuatro fichas de Stitch (C04 escáner, entrada rápida y recibir folio, y C18) enlazaban
   a la especificación de presentaciones y códigos con un nivel de menos.
2. La primera versión de la especificación general (2026-08-17) no tenía frontmatter ni
   enlace. Ahora es `spec` reemplazada y aparece en el
   [índice de especificaciones](../../superpowers/specs/README.md).
3. Las notas de C16 (detalle, invitar, matriz) y P14 no las enlazaba nadie. El
   [índice de Stitch](../../03-diseno/stitch/README.md) las enlaza una por una.
4. `99-futuro/` y `plantillas/` no tenían índice. Ahora tienen su `README.md` y la portada
   los enlaza.
5. Los ajustes que la guía recomendaba (enlaces relativos, sin wikilinks, adjuntos en
   `assets`, vista de lectura, carpeta de plantillas) no estaban guardados. Quedaron en
   `.obsidian/app.json` y `.obsidian/templates.json`.
6. La guía decía que no había plugins de comunidad.

Fuera del repositorio, en la configuración global de Claude Code de esta máquina: un hook
que exige `karpathy-guidelines` antes de escribir código, el hook de humanizer ampliado a
comentarios de GitHub, cierres de issue y descripciones de PR, y el plugin
`claude-obsidian` instalado.

## Pruebas

Un script de revisión recorrió la bóveda antes y después. Antes encontró 366 etiquetas
fuera del vocabulario, 67 `type` y 17 `estado` fuera de la lista, 5 enlaces rotos, 5 notas
huérfanas, 2 carpetas sin índice y 1 nota sin frontmatter. Después queda solo lo de la
plantilla de informe, cuyo `AAAA-MM-DD` y cuyo enlace `../../` son correctos una vez que
la plantilla se copia a `06-operacion/sesiones/`.

El cambio solo toca `docs/`; el resto de la verificación la corre el CI del PR.

## Decisiones

- Alinear la guía con la bóveda y no al revés. Lo decidió Joseph en la sesión.
- El significado de `aprobado`, `ejecutado` y `cerrado` en los planes no estaba escrito
  en ninguna parte. Claude lo dejó en la guía según cómo se venían usando.
- La etiqueta `ui` de la lista vieja salió del vocabulario porque ninguna nota la usaba;
  `interfaz` cubre lo mismo.
- Una etiqueta nueva se agrega a la tabla de la guía en el mismo cambio que la estrena,
  en vez de esperar la reunión semanal.

## Errores y correcciones

No hubo.

## Pendiente

Nada abierto de esta sesión.

## Depende de Joseph

Nada.
