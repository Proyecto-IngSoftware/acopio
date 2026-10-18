---
title: "Sesión 2026-10-18 · Cierre del Bloque 5 y de la pieza C"
type: informe
tags: [operacion, sesion, bloque-5, turnos, pieza-c]
estado: vigente
actualizado: 2026-10-18
---

# Sesión 2026-10-18 · Cierre del Bloque 5 y de la pieza C

Se ejecutó completo el [plan de cierre](../../05-planes/2026-10-18-cierre-bloque-5.md): la
revisión de HU-03, HU-02 y HU-15 en el servidor, los menores de P-066, P-068 y P-069, y la
verificación. Todo va en la rama `bloque-5-cierre`, en un solo PR.

## Qué cambió

| Commit | Qué trae |
|---|---|
| `Turnos: menores de la API (P-068)` | Asistencia rechazada en una jornada cancelada (409 `JORNADA_CANCELADA`); el lugar de una jornada de entidad ya no cambia a 12 horas o menos del inicio (422); cupo y ajuste leídos después del bloqueo; prueba de nombres de DTO repetidos; diagramas regenerados |
| `Turnos: menores de la web (P-069)` | P7 ignora parámetros mal escritos, nombra el acopio del filtro aunque no tenga jornadas y marca los chips con `aria-haspopup`; sin «Ajustado» con ajuste 0; P6 enlaza a todas las jornadas y avisa si fallan; el contador de C14 toma el ajuste nuevo |
| `Turnos: tipos de la prueba de nombres de DTO` | Arreglo de tipos que encontró la verificación completa |
| `Recorridos: consola-turnos deja la demo como estaba aunque falle un paso` | Limpieza en el camino de falla |
| `Pieza C: menores de P-066` | C15 lee la entidad de la lista y el texto del logotipo cambia al subirlo; el logotipo de una entidad sin verificar no se sirve ni se anuncia; C22 abre cada causa en `/consola/causas/:id` |
| `Turnos: dos ediciones a la vez comparan contra la fila bloqueada` | Arreglo del hallazgo importante de la revisión final |
| `Bloque 5: cierre` | Plan, pendientes, especificaciones, recorridos y este informe |

Fuera del repositorio, en el servidor de pruebas, quedó una «Fundación Recorrido …» con su
causa, que deja `consola-causas.mjs`. La demo de turnos se restauró a mano después de la
primera corrida de `consola-turnos.mjs` (ver «Errores y correcciones»).

## Pruebas

La verificación completa (`lint`, `typecheck`, `depcruise`, `test`, `test:int` y
`revisar-colores.sh`) dio código 0 después del último arreglo: web 938, API 71, shared 104 e
integración 442.

Pruebas nuevas en la API: asistencia en jornada cancelada; cambio de dirección a 11 y a 14
horas; dos ediciones a la vez, donde la bitácora de cada una compara contra la fila bloqueada;
nombres de DTO repetidos; logotipo de una entidad sin verificar. La prueba de la bitácora sin
datos personales ya existía y se le sumó el teléfono.

Pruebas nuevas en la web: P7 con parámetros mal escritos, el nombre del acopio en el chip,
`aria-haspopup` y el ajuste en 0; P6 con cinco jornadas y con error; el contador de C14; el
texto del logotipo en C15; la ruta por causa de C22 y una ruta que no existe.

Cada prueba nueva se vio fallar antes del arreglo. La de DTO se probó con un nombre duplicado
a propósito; al quitarlo siguió fallando, porque había uno real (`FiltroCategoriaDto`).

Recorridos, con el detalle en [recorridos.md](../recorridos.md#últimos-resultados): en el
servidor, `portal-turnos` 6 de 6, `consola-causas` 6 de 6, `portal-causas` 4 de 4 y
`consola-turnos` 7 de 7 en la segunda corrida. En local, con la API reconstruida, los cuatro
en verde.

Revisión de HU-03 y de §1 del Bloque 5 en el servidor, con las credenciales que dio Joseph:

- HU-03.2: la segunda reserva con el mismo correo, escrito en mayúsculas, dio 409
  `RESERVA_REPETIDA`. La primera se canceló y los ocupados volvieron a 2.
- HU-03.3: P7, el detalle, P6 y C14 dicen «cupos reservados». La única mención de «personas
  presentes» es el aviso de que los cupos no las cuentan.
- §1.1 y §1.6 con `consola-turnos`; §1.3 y §1.7 con `portal-turnos`. En §1.5, «Descargar el
  camión de agua (demo)» viene con `motivoSinReserva: PLAZO`. En §1.2, la demo tiene la jornada
  de entidad con Conductor C2, y el formulario lo respalda `FormularioJornada.test.tsx`.
- HU-03.1, §1.8 y §1.9 se respaldan solo con pruebas de integración, porque no se pueden ver a
  mano.

HU-02 y HU-15 (§9 de la [especificación de la pieza C](../../superpowers/specs/2026-10-17-pieza-c-causas-design.md)):
HU-02.2, HU-02.3, HU-15.1 y HU-15.3 pasaron en el servidor con los dos recorridos de causas.
HU-02.1 tiene además la prueba «una entidad sin verificar no publica causas», y HU-15.2 la
prueba que llama a `archivarVencidas`.

## Decisiones

- Joseph pidió arreglar en este PR los tres menores de P-066 en vez de mandarlos a la deuda.
- C22 encuentra la causa de un enlace directo en las listas de activas y atendidas, sin un
  endpoint nuevo. Cuesta dos consultas al abrir el enlace. Quedó en la §11 de la
  especificación de la pieza C.
- El logotipo de una entidad sin verificar responde 404, así que una causa atendida de una
  entidad que perdió la verificación sale sin logotipo. Quedó en la misma §11.
- El chip de lugar de P7 solo busca el nombre de un acopio. Una entidad sin jornadas sigue
  diciendo «Lugar» porque no hay un endpoint público de entidades
  ([P-069](../../01-requerimientos/pendientes.md)).
- El prefijo `/voluntariado/` de `PRECARGAS` se deja como está, como decía el plan.

## Errores y correcciones

- El plan decía que ninguna prueba comprobaba que la bitácora de la asistencia quedara sin
  datos personales. La prueba existía en `turnos-publico.int.test.ts`; se extendió en lugar de
  duplicarla y se corrigió la fila de §1.9 del plan.
- Cada tarea se cerró corriendo solo Jest, que con `@swc/jest` no revisa tipos. El error de
  tipos de la prueba de DTO apareció recién en la verificación completa.
- La primera corrida de `consola-turnos` contra el servidor falló con `fetch failed`. El script
  salía sin limpiar y dejó «Armar mercados (demo)» cerrada, con un ajuste de más y con dos
  jornadas del recorrido. Se restauró por la API como `operador1` y se comprobó en el listado
  público. Ahora el script limpia también cuando falla, y se probó forzando un fallo en el
  mismo paso. El `fetch failed` no se repitió en tres corridas más, aunque un `curl` recibió
  una vez una respuesta vacía del servidor.
- La revisión final de la rama encontró que `editar` comparaba y registraba contra la fila
  leída antes del bloqueo. Si dos personas editaban a la vez, quien solo cambió el título
  quedaba en la bitácora cambiando la dirección y los voluntarios recibían el aviso dos veces.
  Una prueba con ediciones concurrentes lo reprodujo tres de tres veces, y con el arreglo pasa
  tres de tres.
- En local, `consola-causas` no entró con la contraseña del `.env`: la base local se sembró con
  la del `.env.example` y el `.env` tiene la del servidor.

## Pendiente

- Los siete menores de la revisión final del cierre
  ([P-071](../../01-requerimientos/pendientes.md)).
- Que P8 y C14 calculen plazos en el navegador sigue abierto
  ([P-070](../../01-requerimientos/pendientes.md)).
- Después de desplegar este PR, correr `portal-turnos.mjs` contra el servidor (tarea 5 del
  [plan de cierre](../../05-planes/2026-10-18-cierre-bloque-5.md)).

## Depende de Joseph

Nada. Las contraseñas del servidor se leyeron del `.env` y no se escribieron en ningún archivo
del repositorio.
