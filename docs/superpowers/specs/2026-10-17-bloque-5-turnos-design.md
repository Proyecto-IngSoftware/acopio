---
title: "Bloque 5 · Turnos de voluntariado · especificación"
type: spec
tags: [spec, bloque-5, turnos]
estado: vigente
bloque: 5
actualizado: 2026-10-18
---

# Bloque 5 · Turnos de voluntariado · especificación

**Fecha:** 2026-10-17
**Estado:** aprobada por Joseph el 2026-10-17
**Deriva de:** [diseño general](2026-08-20-acopio-design.md) (M3, P7, P8, C14),
[RF-TUR-001 a RF-TUR-007](../../01-requerimientos/funcionales/turnos.md), HU-03
([avance 2](../../entregas/avance-02-requisitos.md)) y RNF-09
([no funcionales](../../01-requerimientos/no-funcionales.md#rnf-09--privacidad--ley-1581-de-2012))
**Issue:** [#36](https://github.com/Proyecto-IngSoftware/acopio/issues/36). El milestone dice 8 de noviembre, pero Joseph pidió adelantarlo todo lo posible antes de la sustentación del viernes 23 de octubre
**Planes:** [API](../../05-planes/2026-10-17-bloque-5-api.md) (construida) · [interfaz](../../05-planes/2026-10-17-bloque-5-interfaz.md)

---

## 1. Objetivo

Que una persona que quiere ayudar con sus manos reserve un cupo antes de salir de su casa, para
no cruzar la ciudad y llegar a un lugar donde ya sobra gente. Y que el acopio, o la entidad que
pide voluntarios, sepa con 12 horas de anticipación cuánta gente esperar.

El dato que se publica es de reservas, no de presencia. Quien llega sin reservar no aparece en
ninguna cuenta hasta que el responsable lo ajusta a mano, y la interfaz lo dice con esas
palabras.

**El bloque termina cuando**, en el Compose local:

1. Un Operador crea en C14 tres jornadas de su acopio, una por día, con un solo formulario.
2. El Administrador crea una jornada de la Cruz Roja Colombiana en una dirección propia, que
   pide conductores con licencia C2.
3. Una persona sin sesión abre «Voluntariado», filtra por día, reserva en la jornada de la Cruz
   Roja declarando el perfil y llega a P8 con su código, el `.ics` y el enlace para cancelar.
4. Otra persona intenta reservar con el mismo correo y el sistema lo rechaza. Dos personas
   piden a la vez el último cupo de otra jornada y solo una lo obtiene.
5. A menos de 12 horas del inicio la jornada aparece con «Reservas cerradas».
6. El Operador ve los inscritos, ajusta dos cupos por gente que llegó sin reservar, marca la
   asistencia y cierra la jornada.
7. La primera persona cancela desde su enlace y el cupo vuelve a quedar libre.
8. Treinta días después de la jornada, la tarea diaria borra los datos personales de sus
   reservas y quedan los conteos.
9. Todo lo hecho desde la consola queda en la bitácora, sin datos personales.

## 2. Alcance

### Dentro

| Área | Qué | Requerimientos |
|---|---|---|
| Jornadas | Crear (también varias fechas de una vez), editar, cerrar, reabrir, cancelar y borrar sin reservas. De acopio o de entidad | RF-TUR-001, T-01, T-02 |
| Público | P7 listado con filtros por lugar, día y perfil; formulario de reserva; P8 confirmación, consulta y cancelación | RF-TUR-002 a RF-TUR-004, HU-03 |
| Aforo | Cupos libres, ajuste manual con su antigüedad, cierre 12 horas antes | RF-TUR-005, RF-TUR-006, T-03 |
| Consola | C14 Turnos: lista, formulario, inscritos, asistencia, ajuste, cierre y cancelación | RF-TUR-005 |
| Perfiles | Una jornada puede pedir un perfil; quien reserva lo declara | RF-TUR-007 (recortado, T-04) |
| Correo | Reserva, cancelación, cambios y recordatorio de 24 horas, en cola | RF-TUR-003, RF-TUR-004, T-05 |
| Privacidad | Consentimiento al reservar, datos borrados a los 30 días, sección nueva en P12 | RNF-09, T-06 |
| Enlaces | Bloque «Voluntariado» en P6 y salida desde la hoja del acopio en P5 | RF-TUR-002 |
| Demo | `seed:demo` con jornadas de acopio y una de entidad, con reservas | |

### Fuera, y a dónde va

| Qué | Dónde |
|---|---|
| Enlace entre causas y jornadas (parte de RF-TUR-007) | Recortado por Joseph el 2026-10-17 (T-04) |
| Comprobar el perfil declarado antes de dar el cupo | Lo hace el responsable al llegar la persona (T-04) |
| Que las entidades entren a crear sus jornadas | El Administrador las crea por ellas, como las causas |
| Jornadas en zonas afectadas | El modelo no les da jornadas a las zonas; el Receptor no entra |
| Envío real de los correos | `CORREO_ACTIVO=false` ([P-055](../../01-requerimientos/pendientes.md)); se encolan y P8 muestra lo que el correo traería |
| Cuenta de voluntario o historial de reservas | Sin cuenta, por diseño (§6 del diseño general) |
| Filtro «tiene cupo» en el mapa (P5) | Decisión de Claude, ver §3: el mapa enlaza al listado ya filtrado |

## 3. Decisiones

Tomadas por Joseph el 2026-10-17, en la conversación de esta especificación.

| # | Decisión | Alternativa descartada y por qué |
|---|---|---|
| T-01 | Entra todo RF-TUR-001 a RF-TUR-006 y lo que queda de RF-TUR-007, sin el recorte por fases del diseño general. Cada ruta queda completa, del portal a la consola | Construir solo la reserva básica: deja al responsable sin forma de ajustar el aforo ni de marcar asistencia |
| T-02 | Una jornada es de un acopio o de una entidad. La de entidad la crea el Administrador, a nombre de la entidad y en la dirección que escriba. Que deba estar verificada lo propuso Claude, igual que con las causas | Solo jornadas de acopio: las entidades que piden gente para una campaña quedarían fuera |
| T-03 | Las reservas se cierran 12 horas antes del inicio, en todas las jornadas. En una catástrofe se pueden abrir jornadas para el día siguiente; las ordenadas se publican con días de anticipación | Reservar hasta la hora de inicio: el responsable no puede estimar cuánta gente va a llegar |
| T-04 | Si la jornada pide un perfil, quien reserva solo lo declara y ve un aviso de que el acopio o la entidad puede verificarlo al llegar. Se recorta el enlace con las causas | Revisar el perfil antes de dar el cupo: necesita documentos y una persona disponible para revisarlos |
| T-05 | Los correos se programan completos y se encolan. Con el correo apagado no salen, y P8 muestra en pantalla lo que el correo traería | Esperar a que vuelva el correo para construir la reserva |
| T-06 | El nombre, el correo y el teléfono de cada reserva se borran 30 días después de su jornada. Quedan el estado y los conteos | Guardarlos sin plazo: la Ley 1581 pide temporalidad declarada |

Decisiones de Claude, para que Joseph las revise al leer:

| # | Decisión | Por qué |
|---|---|---|
| T-07 | El enlace para cancelar lleva un secreto en el fragmento de la URL (`#`), que el navegador no manda al servidor. La web lo envía a la API en el cuerpo de la petición | Con el secreto en la ruta o en la consulta, quedaría en los registros del servidor y del proxy |
| T-08 | La bitácora registra los cambios de jornadas y los de estado de las reservas con ids y estados, nunca con nombre, correo o teléfono. Las reservas que hace el público no van a la bitácora | La bitácora no admite `UPDATE`; un nombre escrito ahí no se podría borrar a los 30 días |
| T-09 | Si a una entidad le quitan la verificación, sus jornadas dejan de verse en el portal y no aceptan reservas. Nada cambia en la base, y si vuelve a verificarse reaparecen. Las reservas que ya tenía se mantienen | `acopios` no puede importar `turnos` (vista general); calcularlo al leer evita la dependencia al revés |
| T-10 | Las reservas canceladas no bloquean el correo: quien canceló puede volver a reservar la misma jornada | Que el `UNIQUE (jornada_id, correo)` cuente las canceladas castiga a quien liberó su cupo |
| T-11 | P5 no gana un filtro nuevo. La hoja de cada acopio en el mapa enlaza a sus jornadas | El mapa ya tiene cuatro filtros a 360 px; el listado de P7 filtra mejor |
| T-12 | Una jornada se crea con al menos 13 horas de anticipación y como máximo a 90 días, empieza y termina el mismo día en hora de Bogotá, dura entre 1 y 12 horas y tiene de 1 a 500 cupos. Una serie crea hasta 14 fechas de una vez, con las mismas horas | Con menos de 13 horas, nadie alcanzaría a reservar antes del cierre de T-03 |

T-02 y T-04 cambian RF-TUR-001 y RF-TUR-007; T-03, RF-TUR-003; T-06, RF-TUR-003 y RNF-09.
También cambia `jornada` en [modelo-datos.md](../../02-arquitectura/modelo-datos.md). Se anotan
en [P-067](../../01-requerimientos/pendientes.md) y los requerimientos se reescriben en el mismo
PR de esta especificación.

## 4. Datos

Módulo nuevo `turnos`, con DAO desde el principio (ADR-0019). Entra en `MIGRADOS_A_DAO`.

```
jornada
  id uuid
  acopio_id uuid? (FK) · entidad_id uuid? (FK)
  CHECK (exactamente uno de acopio_id, entidad_id)
  direccion text? · municipio text? · lat, lng decimal(9,6)?
  CHECK (entidad_id IS NULL OR (direccion IS NOT NULL AND municipio IS NOT NULL))
  titulo text (5 a 80) · descripcion text (20 a 1000)       la labor
  que_llevar text? (hasta 300)
  inicio timestamptz · fin timestamptz                     CHECK (fin > inicio)
  cupo_maximo int                                          CHECK (1 a 500)
  requisitos jsonb   { edad_minima?: int, ropa_cerrada: bool, carga: bool }
  perfil_requerido  VETERINARIO | MEDICO | PSICOLOGO | CUIDADOR_ADULTO_MAYOR | CONDUCTOR_C2 ?
  cupos_ajuste_manual int DEFAULT 0  CHECK (>= 0) · ajuste_actualizado_en timestamptz?
  estado  ABIERTA | CERRADA | CANCELADA
  motivo_cancelacion text? · cancelada_en timestamptz?
  serie_id uuid?            las jornadas creadas juntas comparten serie
  creada_por uuid (FK usuario) · creado_en · actualizado_en

reserva
  id uuid · jornada_id uuid (FK)
  nombre text? · correo text? · telefono text?      nulos tras borrar los datos (T-06)
  codigo text UNIQUE        8 caracteres, sin 0/O ni 1/I/L
  secreto_hash text         sha256 del secreto del enlace (T-07)
  perfil_declarado bool DEFAULT false
  estado  ACTIVA | CANCELADA | ASISTIO | NO_ASISTIO
  consentimiento_en timestamptz NOT NULL
  recordatorio_en timestamptz?        cuándo se encoló el recordatorio
  cancelada_en timestamptz? · datos_borrados_en timestamptz?
  creada_en
  UNIQUE (jornada_id, correo) WHERE estado <> 'CANCELADA'   (T-10)
```

El correo se guarda en minúsculas y sin espacios. Para una jornada de acopio, la dirección, el
municipio y el punto salen del acopio; las columnas de la jornada quedan nulas. Para una de
entidad, el punto es opcional y sale del geocodificador que ya usa C21.

### Reglas

- **Ocupados** = reservas en `ACTIVA`, `ASISTIO` o `NO_ASISTIO`.
- **Libres** = `max(0, cupo_maximo − ocupados − cupos_ajuste_manual)`.
- **Se puede reservar** si la jornada está `ABIERTA`, faltan más de 12 horas para el inicio,
  hay libres y, si es de entidad, la entidad está verificada.
- **Reservar** bloquea la fila de la jornada (`SELECT … FOR UPDATE`) dentro de la
  transacción, cuenta los ocupados y solo entonces inserta. El segundo que llega por el último
  cupo recibe `JORNADA_LLENA` (409). Un correo repetido recibe `RESERVA_REPETIDA` (409); fuera
  de plazo, `RESERVAS_CERRADAS` (409).
- **Si la jornada pide perfil**, la reserva exige `perfil_declarado = true`.
- **Cancelar una reserva** se puede hasta la hora de inicio, con el código y el secreto. El cupo
  queda libre al instante. Cancelar dos veces responde lo mismo que la primera.
- **Editar una jornada**: el cupo no puede bajar de los ocupados más el ajuste. Si cambian el
  inicio, el fin o la dirección, el nuevo inicio debe quedar a más de 12 horas y se encola un
  aviso a cada reserva activa. Los demás cambios no avisan.
- **Cerrar** (`CERRADA`) para las reservas nuevas y conserva las que hay. **Reabrir** vuelve a
  `ABIERTA` si faltan más de 12 horas.
- **Cancelar una jornada** pide motivo y avisa a cada reserva activa. Es definitivo.
- **Borrar** solo una jornada que nunca tuvo reservas.
- **Ajuste manual**: el responsable fija cuántas personas sin reserva hay. Guarda la hora en
  `ajuste_actualizado_en`, que el público ve como «Ajustado hace 2 h».
- **Asistencia**: se marca `ASISTIO` o `NO_ASISTIO` desde 2 horas antes del inicio hasta 7 días
  después del fin. Se puede corregir dentro de ese plazo.
- **Quién**: el Operador gestiona las jornadas de los acopios que tiene asignados; el
  Administrador, todas, y es el único que crea jornadas de entidad. El Receptor y el Auditor no
  entran a C14. El Auditor ve los cambios en la bitácora.

### Tareas programadas

| Tarea | Cuándo | Qué hace |
|---|---|---|
| `recordar-reservas` | cada 15 minutos | Encola el recordatorio de las reservas activas de jornadas que empiezan en las próximas 24 horas y que no tienen `recordatorio_en` |
| `borrar-datos-reservas` | diaria, 00:20 | Pone en nulo el nombre, el correo y el teléfono de las reservas de jornadas que terminaron hace más de 30 días y marca `datos_borrados_en` |

Las dos se agregan a la tabla de tareas de [vista-general.md](../../02-arquitectura/vista-general.md).

## 5. API

### Público (`@Publico()`, con `LimiteIntentosGuard`)

| Método y ruta | Qué | Límite |
|---|---|---|
| `GET /api/turnos/jornadas?desde&hasta&acopio&entidad&perfil` | Jornadas que no han terminado, `ABIERTA` o `CERRADA`, agrupables por fecha. Cada una con libres, ocupados, ajuste y su antigüedad, y si acepta reservas | general |
| `GET /api/turnos/jornadas/:id` | Una jornada. Las canceladas responden con su estado y motivo, para quien llega por un enlace viejo | general |
| `POST /api/turnos/jornadas/:id/reservas` | `{ nombre, correo, telefono?, perfilDeclarado, consentimiento: true }` → `{ codigo, secreto, jornada }` | 5 por minuto |
| `POST /api/turnos/reservas/:codigo/consultar` | `{ secreto }` → la reserva con su jornada | 10 por minuto |
| `POST /api/turnos/reservas/:codigo/cancelar` | `{ secreto }` | 10 por minuto |

Una consulta con un secreto que no coincide responde 404, igual que un código que no existe.

### Consola (Operador y Administrador)

| Método y ruta | Qué |
|---|---|
| `GET /api/turnos/gestion/jornadas?pestana&acopio` (`proximas`, `en-curso` o `pasadas`) | Las jornadas que le tocan a quien consulta |
| `POST /api/turnos/gestion/jornadas` | Crea una o varias: `{ …datos, fechas: ['2026-10-25', …] }` con la hora de inicio y fin |
| `PATCH /api/turnos/gestion/jornadas/:id` | Edita |
| `POST /api/turnos/gestion/jornadas/:id/cerrar` · `/reabrir` · `/cancelar` | Cambia el estado; cancelar lleva `{ motivo }` |
| `DELETE /api/turnos/gestion/jornadas/:id` | Borra, si nunca tuvo reservas |
| `PUT /api/turnos/gestion/jornadas/:id/ajuste` | `{ cupos }` |
| `GET /api/turnos/gestion/jornadas/:id/reservas` | Inscritos con nombre, correo, teléfono, perfil declarado y estado |
| `PUT /api/turnos/gestion/reservas/:id/asistencia` | `{ estado: 'ASISTIO' \| 'NO_ASISTIO' }` |

La pertenencia al acopio se revisa con las asignaciones de la sesión, como en inventario.

### Correos

Plantillas nuevas en `notificaciones/plantillas.ts`: `reservaConfirmada` (código, lugar, hora,
qué llevar y enlace a P8), `reservaCancelada`, `jornadaCambiada`, `jornadaCancelada` y
`recordatorioJornada`. Se encolan dentro de la transacción de la operación, como el resto.

### Contrato

Se regeneran `openapi.json` y `esquema.d.ts` en el mismo PR de la API.

## 6. Web

Toda pantalla necesita su maqueta en Stitch aprobada por Joseph antes del código.

### Público

| Pantalla | Ruta | Qué muestra |
|---|---|---|
| P7 Voluntariado | `/voluntariado` | Jornadas por fecha. Filtros por lugar (acopio o entidad), día y perfil. Cada tarjeta: título, lugar, hora, «N de M cupos reservados» o «Llena», «Reservas cerradas» a menos de 12 horas, perfil pedido y «Ajustado hace…» si hubo ajuste. Las llenas se ven, marcadas |
| P7 Reservar | `/voluntariado/:id` | Detalle de la jornada, requisitos, aviso de que puede haber gente sin reserva y el formulario: nombre, correo, teléfono opcional, la casilla del perfil con su aviso (T-04) y la del consentimiento con enlace a P12 |
| P8 Mi reserva | `/voluntariado/reserva/:codigo#secreto` | Código, lugar con «Cómo llegar», hora, qué llevar, «Agregar al calendario» (`.ics`), «Copiar enlace» y «Cancelar reserva». Avisa que este enlace es la única forma de volver a la reserva mientras el correo no salga. Muestra si la jornada cambió o se canceló |

El `.ics` se arma en el navegador con una función pura de `packages/shared` (`generarIcs`), en
hora de Bogotá.

Cambios en pantallas que ya existen: la ruta `voluntariado` sale de `SIN_CONSTRUIR`; P6 cambia
el bloque «Llega pronto con los turnos» por las próximas jornadas del acopio y el aviso de
RF-TUR-006; la hoja del acopio en P5 gana «Ver jornadas»; P12 gana la sección «Si reservas un
turno», con lo que se guarda, para qué y el borrado a los 30 días. Las pantallas de reserva van
en `PRECARGAS`.

### Consola

C14 Turnos, en `/consola/turnos`, desde «Más» para el Operador y el Administrador.

- Pestañas «Próximas», «En curso» y «Pasadas». Cada fila: título, lugar, fecha, cupos
  reservados de los totales y el estado.
- Formulario: dueño (el acopio, o la entidad y la dirección si es el Administrador), título,
  labor, qué llevar, requisitos, perfil, cupo, hora de inicio y fin, y un calendario para marcar
  una o varias fechas. Avisa del cierre de 12 horas.
- Al tocar una jornada: inscritos con su contacto y perfil declarado, asistencia, ajuste manual,
  editar, cerrar o reabrir, cancelar con motivo y borrar si no tiene reservas.
- Copiar el contacto de un inscrito para llamarlo, porque los avisos no salen mientras el correo
  esté apagado.

## 7. Orden de construcción

Dos planes y dos PR, según el flujo del `CLAUDE.md`:

1. **API**: esquema y migración, módulo `turnos` con DAO, reglas puras en `packages/shared`
   (libres, plazos, código, `.ics`), endpoints, correos, tareas, `seed:demo`, contrato y
   pruebas de integración.
2. **Interfaz**: maquetas de P7, P8 y C14 en Stitch con su aprobación, después las pantallas,
   los cambios en P5, P6 y P12, y dos recorridos (`portal-turnos.mjs`, `consola-turnos.mjs`).

### Datos de ejemplo

`seed:demo` crea dos jornadas por cada acopio de la demo en los próximos días, una llena y una
con reservas cerradas por estar a menos de 12 horas, y una jornada de la Cruz Roja Colombiana
que pide `CONDUCTOR_C2`. Las reservas usan correos `@demo.acopio.local`.

## 8. Pruebas

- **Shared**: libres con y sin ajuste; el plazo de 12 horas justo en el borde; el código sin
  caracteres ambiguos; el `.ics` con la hora de Bogotá.
- **Integración**, con el reloj de `crearAppPrueba({ ahora })`:
  - dos reservas simultáneas por el último cupo (`Promise.all`): una 201 y una 409
    `JORNADA_LLENA`, y una sola fila en la base;
  - el correo repetido, en mayúsculas o con espacios, da 409, y después de cancelar se puede
    volver a reservar;
  - a 12 horas y 1 minuto se reserva; a 11 horas y 59 minutos, no;
  - el Operador de otro acopio recibe 403 en cada ruta de gestión;
  - una jornada de entidad sin verificar no aparece y no acepta reservas;
  - cancelar libera el cupo; un secreto equivocado da 404;
  - editar la hora encola un aviso por reserva activa; cancelar la jornada, también;
  - el recordatorio se encola una sola vez;
  - el borrado a los 30 días deja nulos los datos y conserva el estado;
  - ninguna fila de la bitácora tiene el nombre o el correo de un inscrito.
- **Web**: cada pantalla con `responderSegun`, incluidos el mensaje de jornada llena, el de
  correo repetido y el de reservas cerradas.
- **Recorridos** a 360 px contra el Compose, y el público también contra el servidor de pruebas.

## 9. Criterios de salida

- Los nueve pasos de §1 en el Compose.
- HU-03 con sus tres criterios, revisados por Joseph.
- Verificación completa en verde: `lint`, `typecheck`, `depcruise`, `test`, `test:int` y
  `revisar-colores.sh`.
- `portal-turnos.mjs` en verde contra el servidor de pruebas después de desplegar.

## 10. Riesgos

| Riesgo | Qué se hace |
|---|---|
| El correo apagado deja al voluntario sin su enlace si cierra P8 sin guardarlo | P8 lo advierte y ofrece copiar y compartir; el responsable tiene su contacto en C14 |
| Alguien llena una jornada con correos falsos | Límite de 5 reservas por minuto por IP; el responsable ve los inscritos y puede ajustar o cerrar |
| Un perfil declarado sin tenerlo | Aviso al reservar (T-04); el responsable verifica al llegar |
| La sustentación del 23 de octubre llega antes que el bloque completo | Primero la API y la reserva pública, que son las que se muestran. Nada se recorta sin hablarlo con Joseph (T-01); lo que no alcance antes del 23 sigue hasta el 8 de noviembre |

## 11. Cambios al construir

API, rama `bloque-5-api` ([plan](../../05-planes/2026-10-17-bloque-5-api.md)):

- Mover una jornada (cambiar su fecha u horas) pide las mismas 13 horas de anticipación que
  crearla, no las 12 de §4. Así crear y mover siguen una sola regla. Lo que se pierde: no se
  puede mover una jornada a un inicio entre 12 y 13 horas después.
- Para mover una jornada se mandan la fecha y las dos horas juntas; la API rechaza una sola.
- Los correos salen de una clase propia del módulo, `AvisosTurnos`. Una reserva con los datos
  ya borrados no recibe ninguno.
- El borrado de los 30 días deja una sola fila en la bitácora (`reservas.datos_borrados`) con
  la cantidad, sin identificar a nadie.
- La asistencia se puede corregir dentro del plazo, de `ASISTIO` a `NO_ASISTIO` y al revés.
- La demo pone la jornada de la Cruz Roja en «Punto de encuentro de la demostración», Bogotá,
  y no inventa una dirección real.

Interfaz, rama `bloque-5-interfaz` ([plan](../../05-planes/2026-10-17-bloque-5-interfaz.md)):

- Stitch generó el formulario y el detalle de C14, pero no devolvió las pantallas. Esas dos
  vistas se armaron con los tokens y Joseph las aprobó así el 2026-10-17
  ([C14-turnos](../../03-diseno/stitch/C14-turnos/README.md)).
- Los filtros de P7 viven en la URL (`acopio` o `entidad`, `dia` y `perfil`). Las opciones de
  lugar y de día salen de las jornadas publicadas, así que un lugar sin jornadas no aparece.
- «Ver jornadas» de P5 va en la tarjeta del acopio elegido en el mapa. En la lista, cada
  tarjeta ya es un enlace a la ficha, y la ficha (P6) lista las jornadas.
- Quien reserva una jornada que pide perfil declara una frase según el perfil, por ejemplo
  «Tengo licencia de conducción C2» o «Tengo título de psicología».
- En C14 los inscritos cancelados no se listan, y «Borrar» solo aparece si la jornada no tuvo
  ninguna reserva, ni siquiera cancelada, porque la API solo borra en ese caso.
- Al editar una jornada, el contenido (título, labor, cupo, requisitos, perfil) se manda
  siempre. La fecha y las dos horas se mandan las tres juntas, y solo si cambió alguna. Así un
  cambio de título no cuenta como mover la jornada ni avisa a quienes reservaron.
- Los cupos del portal dicen las reservas y, aparte, las personas sin reserva del ajuste
  manual («3 de 10 cupos reservados · 2 sin reserva»). La barra cuenta las dos. P6 marca las
  jornadas llenas y cerradas igual que P7.
- P8 deja de ofrecer «Cancelar reserva» cuando la jornada ya empezó, según el reloj del
  navegador. C14 habilita la asistencia con `puedeMarcarAsistencia` y el mismo reloj. En los
  dos casos la API vuelve a validar ([P-070](../../01-requerimientos/pendientes.md)).
- «Muestra si la jornada cambió» (§6, P8) no se construyó: la API no expone una marca de
  cambio. Quedó para decidir en [P-070](../../01-requerimientos/pendientes.md).
