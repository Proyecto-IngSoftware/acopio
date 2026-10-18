---
title: "Sesión 2026-10-18 · Bloque 5: interfaz de turnos"
type: informe
tags: [operacion, sesion, bloque-5, turnos]
estado: vigente
actualizado: 2026-10-18
---

# Sesión 2026-10-18 · Bloque 5: interfaz de turnos

La sesión siguió el [plan de la interfaz](../../05-planes/2026-10-17-bloque-5-interfaz.md):
maquetas de P7, P8 y C14, que Joseph aprobó, y después las pantallas de turnos del portal y
de la consola. Quedaron construidas y probadas en local. Falta el recorrido contra el servidor
y revisar HU-03 con Joseph.

## Qué cambió

Todo va en la rama `bloque-5-interfaz` y en un solo PR.

| Commit | Qué trae |
|---|---|
| Diseño: maquetas de P7, P8 y C14 | Carpetas [P07-voluntariado](../../03-diseno/stitch/P07-voluntariado/README.md), [P08-mi-reserva](../../03-diseno/stitch/P08-mi-reserva/README.md) y [C14-turnos](../../03-diseno/stitch/C14-turnos/README.md) con las capturas de Stitch, las maquetas y sus diferencias |
| Bloque 5: pantallas de turnos | Cliente `api/turnos.ts`. En el portal: P7 listado y reserva, P8 mi reserva, el bloque de voluntariado de P6, «Ver jornadas» en el mapa (P5) y la sección de turnos de P12. En la consola, C14: lista con pestañas, formulario con calendario de varias fechas y detalle con inscritos, asistencia, ajuste y acciones |
| Bloque 5: recorridos y cierre | `portal-turnos.mjs`, `consola-turnos.mjs`, el arreglo del 204 en `desenvolver`, este informe y la documentación |

Fuera del repositorio: siete pantallas pedidas a Stitch en el proyecto ACOPIO DISEÑO. Cuatro
se exportaron. Las tres maquetas se publicaron como artifacts para que Joseph las viera en el
teléfono.

## Pruebas

- Verificación completa con código de salida 0: lint, tipos, depcruise, unitarias (web 913,
  API 70, shared 104), integración 436 y `revisar-colores.sh`.
- Recorridos en local contra el Compose reconstruido: `portal-turnos.mjs` 6 de 6 y
  `consola-turnos.mjs` 6 de 6 ([detalle](../recorridos.md)).
- No se corrió nada contra el servidor de pruebas, porque la interfaz aún no está desplegada.

## Decisiones

Las decisiones tomadas al construir quedaron en «Cambios al construir» de la
[especificación](../../superpowers/specs/2026-10-17-bloque-5-turnos-design.md), §11. Joseph
aprobó las tres maquetas el 2026-10-17, incluidas las dos vistas de C14 armadas sin Stitch.

## Errores y correcciones

- Stitch se quedó sin responder (timeout) en tres pedidos. Al reintentar dijo que las pantallas
  ya existían, pero sin devolver su id, y no aparecen en el proyecto. El formulario y el detalle
  de C14 se armaron con los tokens. La memoria del proyecto sobre Stitch quedó actualizada:
  pedir una pantalla a la vez.
- Borrar una jornada mostraba «Algo falló al consultar Acopio» aunque la API la borraba. La
  causa era `desenvolver`, que tomaba el 204 sin cuerpo como error. Las pruebas unitarias no lo
  vieron porque el doble responde `{}` con 200; lo encontró `consola-turnos.mjs`. Se corrigió
  con una prueba que reproduce el 204. El mismo error afectaba a quitar un umbral y a quitar
  «no recibir».
- Al escribir el motivo de cancelar una jornada, la hoja se cerraba con el primer espacio. La
  causa está en `Hoja`, que vuelve a enfocar su botón de cerrar con cada función `alCerrar`
  nueva. En C14 se arregló con `useCallback`; el arreglo de fondo quedó en
  [P-069](../../01-requerimientos/pendientes.md).
- Al formatear con Prettier toda la carpeta `src`, se reformateó `esquema.d.ts`, que es
  generado. Se devolvió a su versión antes del commit.

## Pendiente

- Correr `portal-turnos.mjs` contra el servidor después del despliegue
  ([P-069](../../01-requerimientos/pendientes.md), tarea 9 del
  [plan](../../05-planes/2026-10-17-bloque-5-interfaz.md)).
- Los menores de esta interfaz ([P-069](../../01-requerimientos/pendientes.md)) y los de la API
  ([P-068](../../01-requerimientos/pendientes.md)).
- Lo que falta de la pieza C ([P-066](../../01-requerimientos/pendientes.md)).

## Depende de Joseph

- Revisar los tres criterios de HU-03 y los nueve pasos de §1 de la
  [especificación](../../superpowers/specs/2026-10-17-bloque-5-turnos-design.md) con la interfaz
  construida (tarea 9, paso 6 del [plan](../../05-planes/2026-10-17-bloque-5-interfaz.md);
  [#36](https://github.com/Proyecto-IngSoftware/acopio/issues/36)).
