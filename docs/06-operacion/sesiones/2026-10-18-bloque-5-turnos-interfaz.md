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
de la consola. Quedaron construidas, se fusionaron en #123 y pasaron sus recorridos en local y en el servidor. Falta
revisar HU-03 con Joseph.

## Qué cambió

Todo fue en la rama `bloque-5-interfaz`, fusionada en #123. El resultado contra el servidor quedó anotado en la rama `bloque-5-servidor`.

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
- Contra el servidor de pruebas, después de que Dokploy desplegó #123: `portal-turnos.mjs` 6 de 6. `consola-turnos.mjs` no se corrió allá porque entra con `operador1`, y la contraseña de la demo del servidor la tiene Joseph.

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

## Revisión final y arreglos (#125)

A pedido de Joseph, un revisor aparte leyó todo lo de #123 y #124 y anotó también los errores
del plan. Sus hallazgos y lo que se hizo con cada uno:

- **Crítico.** Mover una jornada desde C14 fallaba siempre. El formulario mandaba solo la
  fecha o la hora que cambió, y la API pide las tres juntas. Ninguna prueba ni recorrido
  editaba una jornada. Arreglado, con dos pruebas del cuerpo del `PATCH` y un paso nuevo en
  `consola-turnos.mjs`.
- **Importante.** Con ajuste manual, los cupos del portal contradecían la marca, y P6 no
  marcaba las jornadas llenas ni las cerradas. Ahora los cupos dicen «· N sin reserva», la
  barra cuenta lo tomado y P6 usa la misma marca que P7.
- **Importante.** P8 y la reserva de P7 decían «no existe» ante cualquier error, incluidos sin
  red, 429 y 500. Ahora eso sale solo con un 404; lo demás deja reintentar, y un refetch
  fallido no borra lo cargado.
- **Importante.** El motivo de cancelar, el nombre y el teléfono aceptaban valores que la API
  rechaza con un mensaje genérico. Ahora la web aplica los mismos límites.
- **Menores arreglados.** `Hoja` ya no depende de recibir una función estable (el arreglo
  de fondo que estaba en P-069). Un fallo al cargar los inscritos ya no se muestra como
  «Nadie ha reservado todavía». «Copiar» lleva el nombre de la persona. La edad mínima
  empieza en 12, como en la API. El `.ics` libera su URL más tarde. P8 no ofrece cancelar
  después del inicio. Los 409 de cupo o de plazo ofrecen «Ver otras jornadas». El doble de
  pruebas ya responde 204 sin cuerpo. Vitest corre en procesos para que la prueba de zona
  horaria pruebe algo.
- **Menores pendientes** en [P-069](../../01-requerimientos/pendientes.md), y lo que necesita
  decisión en [P-070](../../01-requerimientos/pendientes.md).
- **Errores del plan:** once, anotados en la sección «Errores del plan» del
  [plan](../../05-planes/2026-10-17-bloque-5-interfaz.md).

El error crítico venía de una regla de la API que estaba escrita en §11 de la especificación y
no pasó al plan de la interfaz ni a sus pruebas.

## P8 avisa si la jornada cambió (#126)

Joseph pidió construir la primera parte de [P-070](../../01-requerimientos/pendientes.md). La
migración `20261020120000_jornada_movida_en` agrega `jornada.movida_en`, que la API llena al
cambiar el inicio, el fin o el lugar. La consulta de la reserva devuelve `jornadaCambiadaEn`
cuando el cambio fue en el momento de reservar o después, y P8 muestra «La jornada cambió» con
la fecha del cambio. Lo cubren tres pruebas de integración (mover la hora, cambiar solo el
título, moverla antes de reservar) y dos de P8. El contrato OpenAPI y los tipos de la web se
regeneraron.

La primera versión comparaba con `>` y la prueba de integración la tumbó: con el reloj fijo de
las pruebas, la reserva y el cambio caen en el mismo instante. Quedó `>=`.

No se agregó un paso al recorrido: comprobar P8 de punta a punta exige reservar en una jornada
que luego se mueve, y esa jornada ya no se puede borrar, así que cada corrida dejaría una
jornada en la demo.

## Pendiente

- Los menores de esta interfaz ([P-069](../../01-requerimientos/pendientes.md)) y los de la API
  ([P-068](../../01-requerimientos/pendientes.md)).
- Decidir si la API manda los permisos de cancelar y de asistencia
  ([P-070](../../01-requerimientos/pendientes.md)).
- Lo que falta de la pieza C ([P-066](../../01-requerimientos/pendientes.md)).

## Depende de Joseph

- Revisar los tres criterios de HU-03 y los nueve pasos de §1 de la
  [especificación](../../superpowers/specs/2026-10-17-bloque-5-turnos-design.md) con la interfaz
  construida (tarea 9, paso 6 del [plan](../../05-planes/2026-10-17-bloque-5-interfaz.md);
  [#36](https://github.com/Proyecto-IngSoftware/acopio/issues/36)).
