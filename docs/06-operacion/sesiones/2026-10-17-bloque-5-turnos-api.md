---
title: "Sesión 2026-10-17 · Bloque 5: especificación y API de turnos"
type: informe
tags: [operacion, sesion]
estado: vigente
actualizado: 2026-10-17
---

# Sesión 2026-10-17 · Bloque 5: especificación y API de turnos

Joseph abrió el Bloque 5, turnos de voluntariado
([#36](https://github.com/Proyecto-IngSoftware/acopio/issues/36)), y pidió avanzar todo lo
posible antes de la sustentación del viernes 23 de octubre. Salieron la especificación, el plan
de la API y la API completa. La interfaz queda para la siguiente sesión.

## Qué cambió

| PR o commit | Qué trae |
|---|---|
| [#119](https://github.com/Proyecto-IngSoftware/acopio/pull/119), rama `bloque-5-especificacion` | Especificación aprobada; RF-TUR-001, 003 y 007 y RNF-09 reescritos; modelo de datos, vista general, cronograma e índices; [P-067](../../01-requerimientos/pendientes.md) |
| [#120](https://github.com/Proyecto-IngSoftware/acopio/pull/120), rama `bloque-5-api` | Plan de la API; reglas puras en `packages/shared/src/turnos.ts`; tablas `jornada` y `reserva` con sus restricciones; módulo `turnos` con DAO (gestión, reserva pública, listado, inscritos, asistencia, correos y dos tareas programadas); demo de turnos; contrato y tipos regenerados |

Fuera del repositorio: en el Compose local se aplicó la migración, se corrió `seed:demo` y se
reconstruyó la API. `GET /api/turnos/jornadas` devuelve las cuatro jornadas de la demo.

## Alertas de CodeQL

Joseph pidió corregir las diez alertas que CodeQL tenía abiertas en `main`, sin dejar ninguna
para después. Van en la rama `seguridad-codeql`:

| Alerta | Dónde | Qué se hizo |
|---|---|---|
| #1, #2 | `.github/workflows/ci.yml` | `permissions: contents: read` para todo el workflow; ningún job publica |
| #3 a #6 | Cuatro HTML de Stitch en `docs/03-diseno/stitch/` | El folio que escribe la persona se pone con `textContent`, ya no dentro de `innerHTML` |
| #7 | `docs/02-arquitectura/diagramas/build.mjs` | `esc()` escapa también comillas dobles y simples, porque se usa dentro de `aria-label` |
| #8 | `apps/web/src/pruebas/utilidades.tsx` | `responderSegun` escapa todos los caracteres especiales menos el comodín `*`, con su prueba |
| #9 | `apps/web/vite.config.ts` | Los datos del script de precarga escapan `<`, `>`, `&` y los separadores de línea de Unicode |
| #10 | `packages/shared/src/horario.ts` | `erroresHorario` rechaza más de 4 tramos por día antes de recorrerlos. El límite es `MAXIMO_TRAMOS`, que ahora usa también la API |

Las tres lecciones de la sesión quedaron como observaciones del task-observer (0023 a 0025):

- revisar al planear y en la revisión final los patrones que marca el análisis estático;
- declarar `permissions` en todo workflow de CI;
- buscar el nombre de un DTO en el repositorio antes de fijarlo, para que no choque en el
  contrato.

Al regenerar los diagramas salieron cambios ajenos a esta corrección: los SVG y el diagrama de
turnos estaban desactualizados respecto del modelo. No se incluyeron; quedan en
[P-068](../../01-requerimientos/pendientes.md).

## Pruebas

- Verificación completa con código de salida 0: `lint`, `typecheck`, `depcruise`, `test`
  (shared 103, API 70, web 853), `test:int` (436/436) y `revisar-colores.sh`.
- Cinco suites nuevas de integración para turnos: datos, gestión, reservas, público y tareas.
  Cubren las dos reservas simultáneas por el último cupo, el cierre a 12 horas, el correo
  repetido con mayúsculas y espacios, la entidad que pierde la verificación y el borrado a los
  30 días.
- Se comparó el contrato viejo con el nuevo: ninguna ruta ni esquema existente cambió.
- Rama `seguridad-codeql`: verificación completa con código de salida 0; la web sube a 854
  pruebas y shared suma la del límite de tramos.
- Sin recorridos todavía: llegan con la interfaz.

## Decisiones

Joseph tomó T-01 a T-06 en la conversación de la especificación:

- entra todo RF-TUR, sin recortar;
- las jornadas pueden ser de un acopio o de una entidad;
- las reservas se cierran 12 horas antes;
- el perfil se declara;
- los correos se encolan aunque el correo esté apagado;
- los datos se borran a los 30 días.

Aprobó también la especificación y el plan.

Claude tomó T-07 a T-12, que están en la
[especificación](../../superpowers/specs/2026-10-17-bloque-5-turnos-design.md). Las decisiones
que tomó al construir están en su §11. La que más pesa: mover una jornada pide 13 horas de
anticipación, igual que crearla.

## Errores y correcciones

- El plan probaba el borde de 13 horas con una jornada de 23:00 a 23:59, que viola la duración
  mínima de una hora. Se probó el borde con otra hora del reloj.
- `z.email()` rechazaba el correo con espacios antes de recortarlo. Se recorta primero.
- Tres DTO nuevos se llamaban igual que otros de inventario, causas y acopios, y el generador
  del contrato pisó los viejos sin avisar. Lo detectó el `typecheck` de la web. Se renombraron.
- CodeQL marcó en el PR que `codigoReserva` usaba el resto de dividir un byte aleatorio entre 31.
  Como 256 no es múltiplo de 31, las primeras ocho letras salían un poco más seguido. Ahora la
  función descarta los bytes de 248 en adelante, con su prueba.
- La revisión final fue una autorrevisión, porque en esta sesión no se abren subagentes sin
  pedirlo. Dejó cuatro menores en [P-068](../../01-requerimientos/pendientes.md).

## Pendiente

- La interfaz del Bloque 5, con su [plan](../../05-planes/2026-10-17-bloque-5-interfaz.md): maquetas
  de P7, P8 y C14 para que Joseph las apruebe, después las pantallas, los cambios en P5, P6 y P12
  y los dos recorridos ([#36](https://github.com/Proyecto-IngSoftware/acopio/issues/36)).
- Los cuatro menores de la revisión ([P-068](../../01-requerimientos/pendientes.md)).
- Lo que sigue abierto de la pieza C ([P-066](../../01-requerimientos/pendientes.md)).

## Depende de Joseph

- Aprobar las maquetas de P7, P8 y C14 cuando estén.
- Revisar con Claude los tres criterios de HU-03 cuando la interfaz esté construida.
