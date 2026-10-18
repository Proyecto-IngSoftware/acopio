---
title: "Bloque 5 · Turnos · plan de la interfaz"
type: plan
tags: [plan, bloque-5, turnos, web]
estado: vigente
bloque: 5
actualizado: 2026-10-18
---

# Bloque 5 · Turnos · plan de la interfaz

> **Para agentes:** se ejecuta con superpowers:subagent-driven-development o
> superpowers:executing-plans, tarea por tarea. Los pasos usan casillas (`- [ ]`).

**Objetivo:** las pantallas de turnos. En el portal, P7 (listado y reserva) y P8 (mi reserva);
en la consola, C14 Turnos. También los cambios en P5, P6 y P12 y los dos recorridos (HU-03).

**Arquitectura:** la API ya está en `main` (PR #120,
[plan de la API](2026-10-17-bloque-5-api.md)). Un cliente `api/turnos.ts` con hooks de TanStack
Query sobre los tipos de `esquema.d.ts`. Pantallas públicas en `portal/turnos/` y la consola en
`consola/turnos/`. Las reglas que se muestran (cupos, cierre, `.ics`) salen de
`packages/shared/src/turnos.ts` y no se reescriben en la web.

**Stack:** React 19, React Router, TanStack Query 5, Tailwind 4 con `packages/ui-tokens`, Vitest
con `envolver` y `responderSegun`, Playwright para los recorridos.

**Especificación:** [2026-10-17-bloque-5-turnos-design.md](../superpowers/specs/2026-10-17-bloque-5-turnos-design.md),
§6 y §7. Issue [#36](https://github.com/Proyecto-IngSoftware/acopio/issues/36).

## Cómo retomar en una sesión nueva

1. `git status`, `gh pr list` y `gh run list --limit 3`: `main` debe estar en verde con #119,
   #120 y #121 fusionados.
2. Leer este plan, la especificación (§1 «El bloque termina cuando», §3 decisiones y §6) y el
   [informe de la sesión anterior](../06-operacion/sesiones/2026-10-17-bloque-5-turnos-api.md).
3. Levantar el Compose (`bun run servicios:todo`), migrar y correr `seed:demo`. Así la API trae
   las cuatro jornadas «(demo)» que sirven para mirar las pantallas.
4. Empezar por la tarea 1: **sin maquetas aprobadas por Joseph no se escribe código de
   pantalla** (CLAUDE.md, ADR-0011).
5. Rama `bloque-5-interfaz`, un solo PR para todo el plan, con pocos commits agrupados por tema.

## Restricciones globales

- Toda pantalla que muestre cupos dice «cupos reservados», nunca «personas presentes», y muestra
  «Ajustado hace…» cuando hubo ajuste manual (RF-TUR-006).
- Las horas se muestran en hora de Bogotá aunque el navegador esté en otra zona.
- El secreto de la reserva viaja después del `#` y solo se manda a la API en el cuerpo de un
  `POST` (T-07). Nunca va en una ruta, una consulta ni el almacenamiento del navegador.
- Sin colores hexadecimales en `apps/web`; los íconos nuevos se agregan con `node scripts/iconos.mjs`.
- La web no calcula plazos ni cupos por su cuenta: usa `aceptaReservas`, `motivoSinReserva`,
  `libres` y `cierreReservas` que trae la API.
- Revisar en cada tarea los patrones que marca CodeQL (observación 0023 del task-observer): nada
  de `innerHTML` ni `dangerouslySetInnerHTML` con datos de la API o del usuario, y escapar los
  datos que se arman en una URL.

## Review Focus

1. P8 abierta sin el `#secreto` (enlace copiado a medias) muestra «Este enlace está incompleto»
   y no llama a la API. Prueba en la tarea 5.
2. Entre ver el listado y enviar el formulario, otra persona toma el último cupo: el 409
   `JORNADA_LLENA` se muestra sin borrar lo que la persona escribió. Prueba en la tarea 4.
3. Con el navegador en otra zona horaria (`TZ=America/New_York` en la prueba), la hora sigue
   siendo la de Bogotá. Prueba en la tarea 3.
4. El secreto no aparece en ninguna URL que la web pida a la API. Prueba en la tarea 5: se
   revisan todas las llamadas a `fetch`.
5. Una jornada cancelada que llega por un enlace viejo muestra el motivo y no ofrece reservar.
   Prueba en la tarea 4.

## Errores del plan

Los encontró la revisión final del 2026-10-18, hecha por un revisor aparte sobre #123 y #124.
Cada punto dice qué decía el plan, qué debía decir y qué se hizo.

1. **Tarea 6** ponía «Ver jornadas» en `TarjetaAcopio.tsx`. Esa tarjeta ya es un enlace a la
   ficha, y otro enlace adentro sería HTML inválido. Debía decir `Mapa.tsx`, en la tarjeta del
   acopio elegido, que es «la hoja del acopio» de la especificación. Se construyó así.
2. **Tarea 3** metía en `textoCupos` la cuenta, la marca («Llena», «Reservas cerradas») y la
   antigüedad del ajuste, y no decía qué hacer con el ajuste. Debía separar `textoCupos` (la
   cuenta, con «· N sin reserva» cuando hay ajuste) de `marcaJornada` (la marca), y pedir que
   P6, P7 y C14 usaran las dos. Corregido en #125: el ajuste aparece en los cupos y la barra
   cuenta lo tomado.
3. **Tarea 6** pedía listar las jornadas de P6 «con `textoCupos`» y no pedía marcar las llenas
   ni las cerradas. P6 mostraba como disponible una jornada llena. Corregido en #125.
4. **Tareas 7 y 8** no tenían ninguna prueba ni paso del recorrido que editara una jornada. La
   API ya pedía la fecha y las dos horas juntas para mover una jornada (§11 de la
   especificación), y el plan no lo trasladó. Por eso mover una jornada fallaba siempre con
   un 400. Corregido en #125, con dos pruebas del cuerpo del `PATCH` y un paso nuevo en
   `consola-turnos.mjs` que mueve una jornada y revisa `fin` en la API.
5. **Tarea 8** pedía que «el Operador no ve el botón de editar el lugar de una jornada de
   entidad». A ese estado no se llega: la lista del Operador no trae jornadas de entidad y la
   API le responde 403. Debía decir que, al editar, solo el Administrador ve dirección y
   municipio. La prueba de `FormularioJornada` cubre eso.
6. **Tarea 4** no pedía probar el 409 `RESERVAS_CERRADAS`, que llega cuando el plazo vence entre
   abrir el formulario y enviarlo (§8 de la especificación). Desde #125, ese 409 y el de
   `JORNADA_LLENA` muestran el mensaje, conservan lo escrito y ofrecen «Ver otras jornadas».
7. **Tarea 5** solo pedía el caso 404 de P8. Faltaban sin red, 429 y 5xx, que no deben decir
   «No encontramos esa reserva». Corregido en #125 en P8 y en la reserva de P7: «no existe»
   sale solo con 404, lo demás deja reintentar, y un refetch fallido no borra lo cargado.
8. **Requisito sin tarea:** §6 de la especificación dice que P8 «muestra si la jornada
   cambió». Ninguna tarea lo asignó y la API no lo expone. Quedó para decidir en
   [P-070](../01-requerimientos/pendientes.md).
9. **Las restricciones globales** dicen que la web no calcula plazos, y la tarea 8 pide
   habilitar la asistencia con `puedeMarcarAsistencia` y el reloj del navegador. P8 también
   oculta «Cancelar reserva» después del inicio con ese reloj. Se acepta la excepción: en los
   dos casos la API vuelve a validar y responde con su mensaje. Quedó escrito en P-070 por si
   se prefiere que la API mande esos permisos.
10. **Review Focus 3** (`TZ=America/New_York` en la prueba) solo funciona si Vitest corre en
    procesos; en hilos el cambio de zona no tiene efecto y la prueba pasaría sin probar nada.
    Desde #125 `vite.config.ts` fija `pool: 'forks'`.
11. **Tarea 2** definía `useMarcarAsistencia(jornadaId)` con un parámetro que no se usa. Quedó
    en [P-069](../01-requerimientos/pendientes.md).

## Estado

| Tarea | Estado | Notas |
|---|---|---|
| 1 Maquetas de P7, P8 y C14 | ✅ | Joseph las aprobó el 2026-10-17. El formulario y el detalle de C14 se armaron con los tokens: Stitch no devolvió esas pantallas |
| 2 Cliente web y datos de prueba | ✅ | |
| 3 P7 listado | ✅ | Los filtros van en la URL; `textoCupos` da solo los cupos y la marca «Llena» o «Reservas cerradas» sale de `marcaJornada` |
| 4 P7 reservar | ✅ | |
| 5 P8 mi reserva | ✅ | |
| 6 P5, P6 y P12 | ✅ | «Ver jornadas» va en la tarjeta del acopio elegido en el mapa (`Mapa.tsx`), porque `TarjetaAcopio` ya es un enlace |
| 7 C14 lista y formulario | ✅ | |
| 8 C14 detalle de la jornada | ✅ | |
| 9 Recorridos y cierre | ✅ | Recorridos 6 de 6 en local y verificación completa en verde. `portal-turnos.mjs` dio 6 de 6 contra el servidor el 2026-10-18, después de desplegar #123. La revisión final y sus arreglos van en #125. Falta revisar HU-03 con Joseph |

---

### Task 1: Maquetas de P7, P8 y C14

**Files:**
- Create: `docs/03-diseno/stitch/P07-voluntariado/`, `P08-mi-reserva/`, `C14-turnos/`, cada una
  con captura, HTML de Stitch, `maqueta.html` y `README.md` (formato de `C22-causas/README.md`)
- Modify: `docs/03-diseno/stitch/README.md`

- [ ] **Step 1:** Generar en Stitch (proyecto `10306891818878200068`, tema
  `assets/3694704229522762996`, modelo `GEMINI_3_5_FLASH_LITE`, prompts cortos, una pantalla por
  llamada; `list_screens` no muestra las nuevas, se guarda el id que devuelve cada llamada):
  - P7 listado por fecha, con filtros y tarjetas en tres estados: con cupos, «Llena» y
    «Reservas cerradas»;
  - P7 reservar, con el detalle y el formulario;
  - P8 con el código, el `.ics`, copiar el enlace y cancelar;
  - C14 lista con pestañas, C14 formulario con un calendario de varias fechas y C14 detalle con
    inscritos y asistencia.
- [ ] **Step 2:** Armar `maqueta.html` con los tokens y los componentes de `_compartidos`.
  Publicarla como artifact para que Joseph la vea en el teléfono.
- [ ] **Step 3:** Joseph aprueba. Sin esa aprobación no empiezan las tareas 3 a 8; la tarea 2 sí
  puede avanzar.
- [ ] **Step 4:** Commit `Diseño: maquetas de P7, P8 y C14`.

### Task 2: Cliente web y datos de prueba

**Files:**
- Create: `apps/web/src/api/turnos.ts`, `apps/web/src/api/turnos.test.tsx`,
  `apps/web/src/pruebas/datos-turnos.ts`

**Interfaces:**
- Produces:
  - tipos `JornadaPublica = S['JornadaPublicaDto']`, `JornadaGestion = S['JornadaGestionDto']`,
    `ReservaCreada`, `ReservaPublica`, `Inscrito`;
  - públicos: `useJornadas(filtro: { desde?; hasta?; acopio?; entidad?; perfil? })`,
    `useJornada(id)`, `useReservar(jornadaId)`, `useConsultarReserva(codigo, secreto | null)`
    (deshabilitado sin secreto) y `useCancelarReserva(codigo)`;
  - consola: `useJornadasGestion(pestana)`, `useCrearJornadas()`, `useEditarJornada(id)`,
    `useCambiarEstadoJornada(id)` (`'cerrar' | 'reabrir' | 'cancelar'`), `useBorrarJornada(id)`,
    `useAjustarCupos(id)`, `useInscritos(id)` y `useMarcarAsistencia(jornadaId)`;
  - en `datos-turnos.ts`: `jornadaDe(extra)`, `gestionDe(extra)` e `inscritoDe(extra)`, con
    valores por defecto válidos.
- Las mutaciones invalidan `['turnos']`.

- [ ] **Step 1: Pruebas que fallan** con `responderSegun`: `useJornadas({ perfil: 'CONDUCTOR_C2' })`
  pide `/api/turnos/jornadas?perfil=CONDUCTOR_C2`; `useConsultarReserva('ABCD2345', 's3cr3t')`
  hace un `POST` con el cuerpo `{ secreto: 's3cr3t' }` y la URL no contiene `s3cr3t`; con
  `secreto = null` no llama a la API.
- [ ] **Step 2:** `cd apps/web && bunx vitest run src/api/turnos.test.tsx`. Esperado: fallan.
- [ ] **Step 3:** Implementar como `api/causas.ts`.
- [ ] **Step 4:** El mismo comando. Esperado: pasan.

### Task 3: P7 listado

**Files:**
- Create: `apps/web/src/portal/turnos/Jornadas.tsx`, `TarjetaJornada.tsx`, `piezas.tsx` (texto de
  cupos y de perfil compartido con P6), y sus pruebas
- Modify: `apps/web/src/rutas.tsx` (sacar `'voluntariado'` de `SIN_CONSTRUIR`; ruta
  `/voluntariado` con `lazy`), `apps/web/src/rutas.test.tsx`

**Interfaces:**
- Produces: `textoCupos(j: JornadaPublica): string` y `<EstadoCupos jornada />` en `piezas.tsx`.
  Textos: «3 de 10 cupos reservados», «Llena», «Reservas cerradas», «Ajustado hace 2 h». Los usan
  P6 y C14.

- [ ] **Step 1: Pruebas que fallan:**
  - con dos jornadas del 21 y una del 22, se ven dos grupos con su fecha («Miércoles 21 de
    octubre»);
  - una tarjeta con `libres: 0` y `motivoSinReserva: 'LLENA'` dice «Llena» y sigue en la lista;
  - una con `'PLAZO'` dice «Reservas cerradas»;
  - con `ajusteActualizadoEn` dos horas antes del reloj dice «Ajustado hace 2 h»;
  - ningún texto de la pantalla contiene «personas presentes»;
  - el filtro de perfil pide `?perfil=VETERINARIO`;
  - con `TZ=America/New_York`, una jornada de `2026-10-21T13:00:00Z` dice «8:00 a. m.»;
  - sin jornadas, «Por ahora no hay jornadas abiertas».
- [ ] **Step 2:** Esperado: fallan.
- [ ] **Step 3:** Implementar según la maqueta.
- [ ] **Step 4:** `cd apps/web && bunx vitest run src/portal/turnos src/rutas.test.tsx`. Esperado:
  pasan.

### Task 4: P7 reservar

**Files:**
- Create: `apps/web/src/portal/turnos/Reservar.tsx` y su prueba
- Modify: `apps/web/src/rutas.tsx` (`/voluntariado/:id`), `apps/web/vite.config.ts`
  (`'/voluntariado/'` en `PRECARGAS`)

- [ ] **Step 1: Pruebas que fallan:**
  - el formulario pide nombre, correo, teléfono opcional y la casilla del consentimiento con
    enlace a `/privacidad`; sin la casilla, «Reservar» queda inactivo;
  - en una jornada con `perfilRequerido: 'CONDUCTOR_C2'` aparece la casilla «Tengo licencia de
    conducción C2» con el aviso «El acopio o la entidad puede pedirte que lo demuestres al
    llegar», y es obligatoria;
  - aparece el aviso «Puede haber gente que llegó sin reserva»;
  - un 409 `JORNADA_LLENA` muestra el mensaje de la API y conserva lo escrito;
  - un 409 `RESERVA_REPETIDA` muestra su mensaje;
  - una jornada `CANCELADA` muestra su motivo y no tiene formulario;
  - una con `aceptaReservas: false` por `'PLAZO'` dice «Las reservas se cerraron 12 horas antes
    del inicio» y no tiene formulario;
  - al reservar, navega a `/voluntariado/reserva/<codigo>#<secreto>`.
- [ ] **Step 2:** Esperado: fallan.
- [ ] **Step 3:** Implementar según la maqueta.
- [ ] **Step 4:** `cd apps/web && bunx vitest run src/portal/turnos`. Esperado: pasan.

### Task 5: P8 mi reserva

**Files:**
- Create: `apps/web/src/portal/turnos/MiReserva.tsx` y su prueba
- Modify: `apps/web/src/rutas.tsx` (`/voluntariado/reserva/:codigo`)

**Interfaces:**
- Consumes: `generarIcs` de `@acopio/shared`, `useConsultarReserva` y `useCancelarReserva`.

- [ ] **Step 1: Pruebas que fallan:**
  - con `#s3cr3t`, muestra el código, el lugar con «Cómo llegar» (enlace a
    `https://www.google.com/maps/search/?api=1&query=<lat>,<lng>`, o la dirección si no hay
    punto), la hora y «Qué llevar»;
  - «Agregar al calendario» descarga `reserva-<codigo>.ics`, armado con `generarIcs`;
  - «Copiar enlace» copia la URL completa con el `#`;
  - aparece el aviso «Guarda este enlace: es la única forma de volver a tu reserva»;
  - «Cancelar reserva» pide confirmar y después muestra «Cancelaste tu reserva»;
  - sin `#` muestra «Este enlace está incompleto» y no hace ningún `fetch`;
  - un 404 muestra «No encontramos esa reserva»;
  - una reserva de una jornada cancelada muestra el motivo;
  - en ninguna llamada a `fetch` de la prueba aparece el secreto en la URL.
- [ ] **Step 2:** Esperado: fallan.
- [ ] **Step 3:** Implementar según la maqueta. El secreto se lee de `location.hash` al montar.
- [ ] **Step 4:** `cd apps/web && bunx vitest run src/portal/turnos`. Esperado: pasan.

### Task 6: P5, P6 y P12

**Files:**
- Modify: `apps/web/src/portal/ficha/FichaAcopio.tsx` (el bloque «Voluntariado» cambia
  «Pronto» por las próximas tres jornadas del acopio, con `useJornadas({ acopio })`, y el aviso
  de RF-TUR-006), `apps/web/src/portal/mapa/TarjetaAcopio.tsx` («Ver jornadas» →
  `/voluntariado?acopio=<id>`), `apps/web/src/portal/Privacidad.tsx` (sección «Si reservas un
  turno») y sus pruebas
- Modify: `apps/web/src/portal/turnos/Jornadas.tsx` (lee `?acopio=` de la URL como filtro inicial)

- [ ] **Step 1: Pruebas que fallan:**
  - P6 con dos jornadas las lista con `textoCupos` y enlaza a `/voluntariado/<id>`; sin jornadas
    dice «Este acopio no tiene jornadas abiertas»;
  - la hoja del acopio en P5 tiene «Ver jornadas» con el enlace filtrado;
  - P7 abierta con `?acopio=<id>` pide `/api/turnos/jornadas?acopio=<id>`;
  - P12 dice que el nombre, el correo y el teléfono de una reserva se borran 30 días después de
    la jornada.
- [ ] **Step 2:** Esperado: fallan.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `cd apps/web && bunx vitest run src/portal`. Esperado: pasan.

### Task 7: C14 lista y formulario

**Files:**
- Create: `apps/web/src/consola/turnos/Turnos.tsx`, `FormularioJornada.tsx`,
  `CalendarioFechas.tsx`, y sus pruebas
- Modify: `apps/web/src/rutas.tsx` (`/consola/turnos` con
  `RequiereRol roles={['ADMIN', 'OPERADOR']}`), `apps/web/src/portal/Mas.tsx` (fila «Turnos»,
  ícono `groups`, para ADMIN y OPERADOR), `docs/02-arquitectura/patrones-y-practicas.md` si
  `CalendarioFechas` queda reutilizable

- [ ] **Step 1: Pruebas que fallan:**
  - las pestañas «Próximas», «En curso» y «Pasadas» piden
    `?pestana=proximas|en-curso|pasadas`;
  - el Operador no ve la opción «Jornada de una entidad»; el Administrador sí, y al elegirla
    aparecen entidad (solo verificadas), dirección y municipio;
  - marcar tres días en el calendario envía `fechas` con los tres, ordenados;
  - no deja marcar más de 14 ni días a más de 90;
  - el formulario recuerda «Las reservas se cierran 12 horas antes del inicio»;
  - un 422 `JORNADA_INVALIDA` muestra el mensaje de la API junto al horario;
  - al crear vuelve a la lista con las nuevas.
- [ ] **Step 2:** Esperado: fallan.
- [ ] **Step 3:** Implementar según la maqueta.
- [ ] **Step 4:** `cd apps/web && bunx vitest run src/consola/turnos src/portal/Mas.test.tsx src/rutas.test.tsx`.
  Esperado: pasan.

### Task 8: C14 detalle de la jornada

**Files:**
- Create: `apps/web/src/consola/turnos/DetalleJornada.tsx`, `Inscritos.tsx` y sus pruebas

- [ ] **Step 1: Pruebas que fallan:**
  - lista los inscritos con nombre, correo, teléfono y «Declaró: Conductor C2»;
  - «Copiar contacto» copia nombre y teléfono;
  - una reserva con los datos borrados dice «Datos borrados (30 días)»;
  - la asistencia solo está habilitada cuando `puedeMarcarAsistencia` lo permite, y envía
    `{ estado: 'ASISTIO' }`;
  - «Ajustar cupos» envía `{ cupos: 2 }` y un 409 `AJUSTE_SIN_CUPO` muestra su mensaje;
  - cerrar, reabrir y cancelar (con motivo obligatorio) llaman a su ruta;
  - «Borrar» solo aparece si la jornada no tuvo reservas;
  - el Operador no ve el botón de editar el lugar de una jornada de entidad.
- [ ] **Step 2:** Esperado: fallan.
- [ ] **Step 3:** Implementar según la maqueta.
- [ ] **Step 4:** `cd apps/web && bunx vitest run src/consola/turnos`. Esperado: pasan.
- [ ] **Step 5:** Commit `Bloque 5: pantallas de turnos` (tareas 2 a 8).

### Task 9: Recorridos y cierre

**Files:**
- Create: `apps/web/recorridos/portal-turnos.mjs`, `apps/web/recorridos/consola-turnos.mjs`
- Modify: `docs/06-operacion/recorridos.md`, este plan (tabla de estado), la especificación (§11),
  `docs/05-planes/README.md`, informe de la sesión, comentario en #36

- [ ] **Step 1:** `portal-turnos.mjs` a 360 px:
  - abre `/voluntariado`;
  - ve «Llena» en «Clasificar ropa donada (demo)»;
  - reserva en «Armar mercados (demo)» con un correo único;
  - llega a P8 con el código;
  - descarga el `.ics`;
  - cancela;
  - comprueba en `GET /api/turnos/jornadas/:id` que `ocupados` volvió a su valor.
- [ ] **Step 2:** `consola-turnos.mjs` a 360 px con `operador1`:
  - crea una serie de dos fechas;
  - ve los inscritos de «Armar mercados (demo)»;
  - ajusta un cupo;
  - cierra la jornada;
  - comprueba el efecto final en la API, no solo en la pantalla.
- [ ] **Step 3:** Verificación completa:
  `set -o pipefail; bun run lint && bun run typecheck && bun run --filter @acopio/api depcruise && bun run test && bun run test:int && scripts/revisar-colores.sh`.
  Esperado: todo con código 0.
- [ ] **Step 4:** Recorridos contra el Compose (`docs/06-operacion/recorridos.md`). Esperado: en
  verde.
- [ ] **Step 5:** Commit, PR y fusión con el CI en verde. Después del despliegue,
  `portal-turnos.mjs` contra el servidor de pruebas.
- [ ] **Step 6:** Con Joseph, los tres criterios de HU-03 y los nueve pasos de §1 de la
  especificación.
