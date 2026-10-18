---
title: "Bloque 5 · Turnos · plan de cierre"
type: plan
tags: [plan, bloque-5, turnos, pieza-c]
estado: vigente
bloque: 5
actualizado: 2026-10-18
---

# Bloque 5 · Turnos · plan de cierre

> **Para agentes:** se ejecuta con superpowers:executing-plans, tarea por tarea. Los pasos usan
> casillas (`- [ ]`). Las tareas 1 y 2 necesitan a Joseph; las 3 y 4 se pueden hacer sin él.

**Objetivo:** cerrar los issues #36 (turnos) y #48 (pieza C) antes de la sustentación del
viernes 23 de octubre: revisar con Joseph los criterios de HU-03, HU-02 y HU-15, y resolver
los menores que quedaron en P-068 y P-069.

**Arquitectura:** no hay pantallas ni módulos nuevos. Las tareas 3 y 4 tocan el módulo
`turnos` de la API y las pantallas de `portal/turnos`, `portal/ficha` y `consola/turnos`.

**Stack:** NestJS 11 y Prisma 7.10 en la API; React 19, TanStack Query 5 y Vitest en la web;
Playwright para los recorridos.

**Especificaciones:** [Bloque 5](../superpowers/specs/2026-10-17-bloque-5-turnos-design.md) (§1,
§4 y §11) y [pieza C](../superpowers/specs/2026-10-17-pieza-c-causas-design.md) (§9).
Pendientes: [P-066, P-068, P-069 y P-070](../01-requerimientos/pendientes.md).

## Cómo retomar en una sesión nueva

1. `git status`, `gh pr list` y `gh run list --limit 3`. `main` debe estar en verde con #123 a
   #126 fusionados.
2. Leer el [informe de la sesión anterior](../06-operacion/sesiones/2026-10-18-bloque-5-turnos-interfaz.md),
   que resume lo construido, las pruebas y la revisión final.
3. Para las tareas 3 y 4: Compose arriba con `bun run servicios:todo`, `db:migrar` y
   `seed:demo`. La integración va contra el contenedor aparte del puerto 5439, nunca contra el
   del Compose (CLAUDE.md).
4. Rama `bloque-5-cierre`, un solo PR para todo el plan.

## Restricciones globales

- Cupos: siempre «cupos reservados», nunca «personas presentes» como cuenta (HU-03, criterio 3).
- Horas en hora de Bogotá; la web no calcula plazos salvo las dos excepciones anotadas en
  P-070 (cancelar en P8 y asistencia en C14).
- Toda regla de validación de la API que cruce campos lleva una prueba del cuerpo de la
  petición en la web (error 4 de la revisión del 2026-10-18).
- Sin colores hexadecimales en `apps/web`; los íconos nuevos con `node scripts/iconos.mjs`.
- Cambios de endpoint: regenerar `openapi` y `api:tipos` y versionar los dos.

## Review Focus

1. Un Operador marca asistencia en una jornada cancelada que sigue dentro del plazo: la API
   debe responder 409 `JORNADA_CANCELADA`. Prueba en la tarea 3.
2. Cambiar solo la dirección de una jornada de entidad a menos de 12 horas del inicio: la API
   debe rechazarlo como rechaza mover la hora. Prueba en la tarea 3.
3. Abrir `/voluntariado?dia=mañana` o con un `acopio` que no es un UUID: la pantalla carga sin
   ese filtro en vez de quedar en un error que no se arregla reintentando. Prueba en la tarea 4.
4. Un acopio con cinco jornadas: P6 muestra tres y un enlace a todas. Prueba en la tarea 4.
5. El contador de ajuste de C14 refleja el valor nuevo cuando otra persona lo cambia y la
   lista se refresca. Prueba en la tarea 4.

## Estado

| Tarea | Estado | Notas |
|---|---|---|
| 1 Revisión de HU-03 y §1 con Joseph | ⬜ | Necesita a Joseph |
| 2 Pieza C: recorrido en el servidor y HU-02 y HU-15 | ⬜ | Necesita la contraseña del administrador del servidor |
| 3 Menores de la API de turnos (P-068) | ⬜ | |
| 4 Menores de la web de turnos (P-069) | ⬜ | |
| 5 Verificación y cierre | ⬜ | |

---

### Task 1: Revisión de HU-03 y §1 con Joseph

**Files:**
- Modify: `docs/superpowers/specs/2026-10-17-bloque-5-turnos-design.md` (§11, si aparece algo),
  este plan, el informe de la sesión, comentario y cierre de #36

Se recorre en el servidor (`https://acopio.josephqaz.dev`) con Joseph. Los pasos que no se
pueden ver a mano se respaldan con su prueba.

| Criterio | Cómo se mira | Respaldo automático |
|---|---|---|
| HU-03.1 Dos personas por el último cupo: solo una lo obtiene | No se puede a mano | `turnos-reservas.int.test.ts`, «dos personas por el último cupo» |
| HU-03.2 El mismo correo no reserva dos veces la misma jornada | Reservar dos veces en «Armar mercados (demo)» con el mismo correo | `turnos-reservas.int.test.ts`, primera prueba (`RESERVA_REPETIDA`) |
| HU-03.3 Dice «cupos reservados», nunca «personas presentes» | P7, la reserva, P6 y C14 | `Jornadas.test.tsx`, primera prueba |
| §1.1 El Operador crea tres jornadas de su acopio con un formulario | C14 con `operador1` | `consola-turnos.mjs`, paso 2 (con dos fechas) |
| §1.2 El Administrador crea una de la Cruz Roja en dirección propia, con Conductor C2 | C14 con `admin`, «Una entidad» | `FormularioJornada.test.tsx`, segunda prueba |
| §1.3 Alguien sin sesión filtra, reserva con el perfil y llega a P8 con código, `.ics` y enlace | P7 → reservar → P8 | `portal-turnos.mjs` |
| §1.4 Correo repetido rechazado; último cupo para uno solo | Igual que HU-03.1 y HU-03.2 | Las mismas |
| §1.5 A menos de 12 horas dice «Reservas cerradas» | «Descargar el camión de agua (demo)» | `Jornadas.test.tsx` y `turnos-reservas.int.test.ts` |
| §1.6 El Operador ve inscritos, ajusta dos cupos, marca asistencia y cierra | C14 con `operador1` | `consola-turnos.mjs` y `DetalleJornada.test.tsx` |
| §1.7 La persona cancela desde su enlace y el cupo queda libre | P8 → «Cancelar reserva» | `portal-turnos.mjs`, paso 5 |
| §1.8 A los 30 días se borran los datos y quedan los conteos | No se puede a mano | `turnos-tareas.int.test.ts` |
| §1.9 Lo de la consola queda en la bitácora, sin datos personales | Bitácora con `admin` | En parte: `turnos-gestion.int.test.ts` cuenta los eventos de creación y la primera prueba de `turnos-reservas.int.test.ts` revisa que reservar no escriba. Que la asistencia no deje datos personales lo prueba la tarea 3 |

- [ ] **Step 1:** Recorrer la tabla con Joseph. Lo que falle entra como issue con la etiqueta
  `hallazgo`, enlazado desde #36.
- [ ] **Step 2:** Si todo pasa, comentar en #36 qué se revisó y cerrarlo a mano (`gh issue close
  36`): «Cierra #N» en un PR no lo cierra (memoria del proyecto).

### Task 2: Pieza C: recorrido en el servidor y HU-02 y HU-15

**Files:**
- Modify: `docs/06-operacion/recorridos.md` («Últimos resultados»), P-066 en
  `docs/01-requerimientos/pendientes.md`, comentario y cierre de #48

- [ ] **Step 1:** Joseph exporta la contraseña del administrador del servidor y corre:
  `WEB=https://acopio.josephqaz.dev SIN_CORREO=1 CAPTURAS=no ADMIN_CONTRASENA=… node apps/web/recorridos/consola-causas.mjs`.
  Esperado: 6 de 6. Cada corrida deja una «Fundación Recorrido …» en el servidor.
- [ ] **Step 2:** Revisar con Joseph los criterios de HU-02 y HU-15 de §9 de la
  especificación de la pieza C, uno por uno.
- [ ] **Step 3:** Los tres menores de P-066 (texto «Subir logotipo» que no cambia, logotipo de
  entidades no verificadas, C22 sin ruta por causa) pasan a P-069 o a la deuda (#43), según lo
  que decida Joseph. Cerrar #48 a mano si los criterios pasan.

### Task 3: Menores de la API de turnos (P-068)

**Files:**
- Modify: `apps/api/src/modulos/turnos/jornadas.service.ts` (`editar`, `ajustar`),
  `apps/api/src/modulos/turnos/reservas.service.ts` (`marcarAsistencia`)
- Create: `apps/api/src/comun/dto-nombres.test.ts`
- Test: `apps/api/src/pruebas-integracion/turnos-gestion.int.test.ts`,
  `turnos-publico.int.test.ts`
- Modify: `docs/02-arquitectura/diagramas/` (regenerados)

- [ ] **Step 1: Pruebas que fallan** (integración):
  - «no se marca asistencia en una jornada cancelada»: jornada que empezó hace una hora con
    una reserva activa; se cancela; `PUT /api/turnos/gestion/reservas/:id/asistencia` con
    `{ estado: 'ASISTIO' }` responde 409 y `codigo: 'JORNADA_CANCELADA'`.
  - «cambiar solo la dirección a menos de 12 horas se rechaza»: jornada de entidad con inicio
    en `AHORA + 11 h`; `PATCH` con `{ direccion: 'Otra calle 1' }` responde 422 y
    `codigo: 'JORNADA_INVALIDA'`. Con inicio en `AHORA + 14 h`, el mismo `PATCH` responde 200.
  - «la asistencia queda en la bitácora sin datos personales»: después de marcar `ASISTIO`,
    la fila de la bitácora de esa reserva no contiene en `antes` ni en `despues` el nombre, el
    correo ni el teléfono de la reserva (T-08). Si pasa al escribirla, queda como prueba de
    regresión y se dice en el informe.
- [ ] **Step 2:** `cd apps/api && PRUEBAS_PG_URL=postgresql://acopio_owner:acopio@127.0.0.1:5439 bunx jest -c jest.int.config.cjs --runInBand src/pruebas-integracion/turnos-gestion.int.test.ts src/pruebas-integracion/turnos-publico.int.test.ts`.
  Esperado: las dos nuevas fallan.
- [ ] **Step 3:** En `marcarAsistencia`, rechazar con `ErrorDominio('JORNADA_CANCELADA', …, 409)`
  si la jornada está cancelada. En `editar`, si cambian `direccion` o `municipio` y faltan 12
  horas o menos (`LIMITES_TURNOS.horasCierre`), `ErrorDominio('JORNADA_INVALIDA', 'Faltan 12
  horas o menos: ya no se puede cambiar el lugar', 422)`.
- [ ] **Step 4:** En `editar` y `ajustar`, leer el cupo y el ajuste después de
  `this.dao.bloquear(id, tx)` y dentro de la transacción, no antes. No hay una prueba
  determinista de la carrera; las existentes deben seguir en verde.
- [ ] **Step 5: Prueba que falla** `dto-nombres.test.ts`: lee los `.ts` de `apps/api/src` (sin
  `generado/`), junta los nombres de `class (\w+Dto) extends crearDto` y espera que no haya
  repetidos. Para ver que falla, duplicar a mano un nombre en una copia temporal y revertirlo.
- [ ] **Step 6:** `cd apps/api && bunx jest src/comun/dto-nombres.test.ts` y el comando del
  Step 2. Esperado: pasan.
- [ ] **Step 7:** `node docs/02-arquitectura/diagramas/build.mjs` y versionar lo que cambie.

### Task 4: Menores de la web de turnos (P-069)

**Files:**
- Modify: `apps/web/src/portal/turnos/Jornadas.tsx`, `portal/turnos/piezas.tsx`,
  `portal/ficha/FichaAcopio.tsx`, `consola/turnos/DetalleJornada.tsx`,
  `consola/turnos/Inscritos.tsx`, `api/turnos.ts`, y sus pruebas

**Interfaces:**
- Produces: `useMarcarAsistencia()` sin parámetros (antes recibía `jornadaId` sin usarlo).

- [ ] **Step 1: Pruebas que fallan:**
  - `Jornadas.test.tsx`: con `/voluntariado?dia=mañana`, la petición es
    `GET /api/turnos/jornadas` sin `dia`; con `?acopio=no-es-uuid`, igual sin `acopio`.
  - `Jornadas.test.tsx`: con `?acopio=x1` y la API sin jornadas, el chip de lugar dice el
    nombre del acopio (de `GET /api/acopios/x1`) y no «Lugar».
  - `Jornadas.test.tsx`: los chips de filtro tienen `aria-haspopup="dialog"`.
  - `Jornadas.test.tsx`: una jornada con `ajuste: 0` y `ajusteActualizadoEn` no muestra
    «Ajustado hace…».
  - `FichaAcopio.test.tsx`: con cinco jornadas muestra tres y un enlace «Ver todas las
    jornadas» a `/voluntariado?acopio=x1`; si la consulta falla, dice «No se pudieron cargar
    las jornadas».
  - `DetalleJornada.test.tsx`: al volver a renderizar con `ajuste: 3`, el contador muestra 3.
- [ ] **Step 2:** `cd apps/web && bunx vitest run src/portal/turnos src/portal/ficha src/consola/turnos`.
  Esperado: fallan las nuevas.
- [ ] **Step 3:** Implementar. Los parámetros de la URL se validan como en la API (`dia`
  `AAAA-MM-DD`, `acopio` y `entidad` UUID) y el inválido se ignora. El contador se sincroniza
  con `jornada.ajuste` mientras no haya un cambio sin guardar.
- [ ] **Step 4:** El mismo comando. Esperado: pasan.
- [ ] **Step 5:** El prefijo `/voluntariado/` de `PRECARGAS` que también coincide con P8 se
  deja como está: cuesta una precarga de más y separarlo exige cambiar el script del build.
  Anotarlo como decidido en P-069.

### Task 5: Verificación y cierre

**Files:**
- Modify: este plan (tabla de estado), P-068 y P-069 (resueltos), informe de la sesión nueva
  en `docs/06-operacion/sesiones/` y su fila en el índice

- [ ] **Step 1:** `set -o pipefail; bun run lint && bun run typecheck && bun run --filter @acopio/api depcruise && bun run test && PRUEBAS_PG_URL=postgresql://acopio_owner:acopio@127.0.0.1:5439 bun run test:int && scripts/revisar-colores.sh`.
  Esperado: código 0.
- [ ] **Step 2:** Recorridos en local: `portal-turnos.mjs` 6 de 6 y `consola-turnos.mjs` 7 de 7.
- [ ] **Step 3:** Revisión de la rama completa con un revisor aparte, si Joseph lo pide.
- [ ] **Step 4:** Commit, PR, CI en verde y fusión. Después del despliegue,
  `portal-turnos.mjs` contra el servidor.
