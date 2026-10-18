---
title: "Sesión 2026-10-18 · Bloque 5: interfaz de turnos"
type: informe
tags: [operacion, sesion, bloque-5, turnos]
estado: vigente
actualizado: 2026-10-18
---

# Sesión 2026-10-18 · Bloque 5: interfaz de turnos

La sesión construyó la interfaz de turnos según su
[plan](../../05-planes/2026-10-17-bloque-5-interfaz.md): las maquetas de P7, P8 y C14, que Joseph
aprobó, y las pantallas del portal y de la consola. Después pasó un revisor aparte por todo lo
hecho, se arreglaron sus hallazgos y, a pedido de Joseph, P8 empezó a avisar si la jornada
cambió. El Bloque 5 queda construido y desplegado; falta revisar con Joseph los criterios de
HU-03, y eso va en el [plan de cierre](../../05-planes/2026-10-18-cierre-bloque-5.md).

## Qué cambió

| PR | Rama | Qué trae |
|---|---|---|
| #123 | `bloque-5-interfaz` | Maquetas, las pantallas de turnos, los dos recorridos y el arreglo del 204 en `desenvolver` |
| #124 | `bloque-5-servidor` | El resultado de `portal-turnos.mjs` contra el servidor |
| #125 | `bloque-5-revision` | Los arreglos de la revisión final y los errores del plan anotados |
| #126 | `bloque-5-jornada-cambiada` | P8 avisa si la jornada cambió (migración nueva) |

Fuera del repositorio: siete pantallas pedidas a Stitch en el proyecto ACOPIO DISEÑO, de las
que se exportaron cuatro, y las tres maquetas publicadas como artifacts para que Joseph las
viera en el teléfono.

### Lo construido

**Diseño.** [P07-voluntariado](../../03-diseno/stitch/P07-voluntariado/README.md),
[P08-mi-reserva](../../03-diseno/stitch/P08-mi-reserva/README.md) y
[C14-turnos](../../03-diseno/stitch/C14-turnos/README.md), cada una con capturas de Stitch,
HTML, maqueta, diferencias y capturas de lo construido. Joseph las aprobó el 2026-10-17.

**Portal.**
- P7 `/voluntariado`: jornadas por día, con filtros de lugar, día y perfil que viven en la URL.
  Cada tarjeta dice los cupos reservados, las personas sin reserva del ajuste manual y su
  antigüedad, y marca las llenas y las cerradas.
- P7 `/voluntariado/:id`: detalle, requisitos y formulario de reserva con consentimiento y, si
  la jornada pide perfil, la declaración del perfil.
- P8 `/voluntariado/reserva/:codigo#secreto`: código, cómo llegar, `.ics`, copiar el enlace,
  cancelar y el aviso «La jornada cambió». El secreto va después del `#` y solo en el cuerpo
  de un `POST`.
- P6 lista las tres próximas jornadas del acopio, P5 lleva de la tarjeta del acopio elegido a
  sus jornadas y P12 explica el borrado de los datos a los 30 días.

**Consola, C14 `/consola/turnos`.** Lista con pestañas, formulario con calendario de varias
fechas (hasta 14, a 90 días como máximo), jornada de entidad solo para el Administrador, y
detalle con inscritos, copiar contacto, asistencia, ajuste de cupos, editar, cerrar, reabrir,
cancelar con motivo y borrar.

**API.** `jornada.movida_en` (migración `20261020120000_jornada_movida_en`) y
`jornadaCambiadaEn` en la consulta de la reserva. El resto de la API ya estaba desde #120.

**Piezas compartidas.** `api/turnos.ts`, `pruebas/datos-turnos.ts`, `hora`, `rangoHoras`,
`diaBogota` y `diaSemana` en `formato.ts`. `desenvolver` acepta un 204 sin cuerpo, `Hoja`
ya no roba el foco a un formulario y `responderSegun` puede responder 204.

## Pruebas

**Verificación completa** al cerrar (#126), con código de salida 0: lint, tipos, depcruise,
`revisar-colores.sh`, unitarias de la web (928), de la API (70) y de shared (104), e
integración (439).

**Pruebas nuevas de esta sesión:**
- Web, cliente: `api/turnos.test.tsx` (filtros, secreto solo en el cuerpo, cuerpos de cada
  mutación) y la de `cliente.test.ts` sobre el 204.
- Web, portal: `Jornadas.test.tsx` (grupos por día, marcas, ajuste, filtros, hora de Bogotá
  con el navegador en Nueva York), `Reservar.test.tsx` (perfil, consentimiento, 409 que
  conserva lo escrito, límites, 500 que no dice «no existe»), `MiReserva.test.tsx` (secreto
  nunca en una URL, `.ics`, copiar, cancelar, 404, 429 y 500, aviso de jornada cambiada), y
  los cambios en P5, P6 y P12.
- Web, consola: `CalendarioFechas.test.tsx`, `FormularioJornada.test.tsx` (crear, jornada de
  entidad, 422, editar sin mover y moviendo), `DetalleJornada.test.tsx` y `Turnos.test.tsx`.
- Web, piezas: `Hoja.test.tsx` y la prueba del 204 en `utilidades.test.tsx`.
- API, integración: tres en `turnos-reservas.int.test.ts` sobre `jornadaCambiadaEn`.

**Recorridos** ([detalle](../recorridos.md)):

| Script | Local | Servidor |
|---|---|---|
| `portal-turnos.mjs` | 6 de 6 | 6 de 6, después de desplegar #123 |
| `consola-turnos.mjs` | 7 de 7, con el paso de mover una jornada | No se corrió: entra con `operador1` y la contraseña de la demo del servidor la tiene Joseph |

## Decisiones

Las decisiones de construcción están en «Cambios al construir», §11 de la
[especificación](../../superpowers/specs/2026-10-17-bloque-5-turnos-design.md). Las de esta
sesión:
- Joseph aprobó las maquetas, incluidas las dos vistas de C14 armadas sin Stitch.
- Joseph pidió una revisión completa con un revisor aparte, y después construir el aviso de
  jornada cambiada en P8 (P-070).
- Ante un 409 de cupo lleno o reservas cerradas, el formulario conserva lo escrito y ofrece
  «Ver otras jornadas», en vez de volver a pedir la jornada como sugirió el revisor. Así se
  cumple el punto 2 de «Review Focus» del plan.
- Se acepta que P8 oculte «Cancelar» y C14 habilite la asistencia con el reloj del navegador;
  la API valida igual. Queda abierto en P-070 si la API debe mandar esos permisos.

## Revisión final y mejoras

A pedido de Joseph, un revisor aparte leyó todo lo de #123 y #124 y anotó los errores del
plan. Esto encontró y esto se hizo (#125):

- **Crítico: mover una jornada desde C14 fallaba siempre.** El formulario mandaba solo la
  fecha o la hora que cambió y la API pide las tres juntas. Se arregló con dos pruebas del
  cuerpo del `PATCH` y un paso nuevo en `consola-turnos.mjs`, que habría detectado el error.
- **Cupos con ajuste manual.** El portal contradecía su propia marca y P6 no marcaba las
  jornadas llenas. Ahora los cupos dicen «· N sin reserva», la barra cuenta lo tomado y P6
  usa la misma marca que P7.
- **Errores tratados como «no existe».** P8 y la reserva de P7 lo decían ante sin red, 429 o
  500. Ahora solo con un 404, lo demás deja reintentar y un refetch fallido no borra lo
  cargado.
- **Validación.** El motivo de cancelar, el nombre, el teléfono y la edad mínima aplican los
  mismos límites que la API.
- **Menores arreglados.** `Hoja` ya no roba el foco; un fallo de los inscritos ya no dice
  «Nadie ha reservado»; «Copiar» lleva el nombre; el `.ics` libera su URL más tarde; P8 no
  ofrece cancelar después del inicio; el doble de pruebas responde 204; Vitest corre en
  procesos para que la prueba de zona horaria sirva.
- **Errores del plan:** once, en la sección «Errores del plan» del
  [plan de la interfaz](../../05-planes/2026-10-17-bloque-5-interfaz.md). El más caro: una regla
  de la API escrita en §11 que no pasó a las pruebas de la interfaz.

**P8 avisa si la jornada cambió (#126).** `jornada.movida_en` guarda cuándo cambiaron el
inicio, el fin o el lugar. La consulta devuelve `jornadaCambiadaEn` si el cambio fue al
reservar o después, y P8 muestra «La jornada cambió» con la fecha. La primera versión
comparaba con `>` y la prueba de integración la tumbó: con el reloj fijo de las pruebas, la
reserva y el cambio caen en el mismo instante. Quedó `>=`.

## Errores y correcciones

- Stitch no devolvió tres pantallas tras un timeout; el formulario y el detalle de C14 se
  armaron con los tokens. La memoria del proyecto sobre Stitch quedó actualizada.
- Borrar una jornada mostraba «Algo falló» aunque la API borraba: `desenvolver` tomaba el 204
  como error. Lo encontró `consola-turnos.mjs`; el mismo error afectaba a quitar un umbral y
  quitar «no recibir».
- Prettier sobre toda la carpeta `src` reformateó `esquema.d.ts`, que es generado; se
  devolvió antes del commit.
- Un commit de documentación quedó en `main` local porque el comando que creaba la rama fue
  rechazado por un hook. Se movió a su rama antes de subir; quedó en el task-observer.
- Dos pruebas largas del formulario pasaron de 5 s con la suite completa; llevan 15 s, como
  `cabeceras.test.tsx`.

## Pendiente

Todo está en el [plan de cierre](../../05-planes/2026-10-18-cierre-bloque-5.md):
- Los menores de la API ([P-068](../../01-requerimientos/pendientes.md)) y de la web
  ([P-069](../../01-requerimientos/pendientes.md)), tareas 3 y 4.
- Lo que falta de la pieza C ([P-066](../../01-requerimientos/pendientes.md)), tarea 2.
- Si la API debe mandar los permisos de cancelar y de asistencia
  ([P-070](../../01-requerimientos/pendientes.md)).

## Depende de Joseph

- Revisar HU-03 y los nueve pasos de §1 en el servidor (tarea 1 del
  [plan de cierre](../../05-planes/2026-10-18-cierre-bloque-5.md);
  [#36](https://github.com/Proyecto-IngSoftware/acopio/issues/36)).
- Correr `consola-causas.mjs` contra el servidor con la contraseña del administrador y
  revisar HU-02 y HU-15 (tarea 2; [#48](https://github.com/Proyecto-IngSoftware/acopio/issues/48)).
