---
title: "Sprint 2 — borrador del registro y reunión del 9 de octubre"
type: entrega
tags: [entrega, is1, sprint-2]
estado: borrador
actualizado: 2026-10-07
---

# Sprint 2 — borrador del registro y reunión del 9 de octubre

La consigna del Sprint 2 todavía no existe: el docente la presenta en la clase virtual
del **viernes 9 de octubre a las 6:30 p. m.** Esta nota adelanta lo que se puede
preparar sin ella, con el formato del [Avance 4](avance-04-sprint1.md): la agenda de
la reunión del equipo que sigue a la clase, un borrador del Planning y las tablas
vacías del seguimiento y del Review. Cuando llegue la consigna, se ajusta todo lo de
la [lista del final](#cuando-llegue-la-consigna).

El nombre del archivo es provisional; si la guía lo llama distinto, se renombra.

## Reunión del viernes 9 de octubre, después de la clase

Virtual, justo al terminar la clase. Una sola reunión cubre el cierre del Sprint 1 y el
arranque del Sprint 2.

| # | Punto | Qué sale | Issue |
|:-:|---|---|---|
| 1 | Captura de la reunión con los cuatro conectados | `evidencia/avance-04/seguimiento.png` | [#45](https://github.com/Proyecto-IngSoftware/acopio/issues/45) |
| 2 | Seguimiento del Sprint 1: cada integrante dice qué terminó, qué sigue y qué lo bloquea | Las filas de Brayan, Alejandra y Michael en la tabla del [Avance 4](avance-04-sprint1.md#3b-seguimiento-del-equipo-daily-scrum) | [#45](https://github.com/Proyecto-IngSoftware/acopio/issues/45) |
| 3 | Leer juntos la retrospectiva del Sprint 1 y confirmarla o corregirla | Retrospectiva sin la marca de borrador | [#45](https://github.com/Proyecto-IngSoftware/acopio/issues/45) |
| 4 | Captura del tablero con las historias del Sprint 1, **antes** de mover tarjetas al Sprint 2 | `evidencia/avance-04/tablero.png` | [#21](https://github.com/Proyecto-IngSoftware/acopio/issues/21) |
| 5 | Repasar la consigna del Sprint 2 que acaba de dar el docente: semanas, entregables, formato | Notas para ajustar el calendario y esta nota | [#47](https://github.com/Proyecto-IngSoftware/acopio/issues/47) |
| 6 | Primer Planning del Sprint 2 sobre el borrador de abajo: Sprint Goal, historias, responsables por rol y Definition of Done | Tabla del Planning y de tareas confirmadas | [#47](https://github.com/Proyecto-IngSoftware/acopio/issues/47) |
| 7 | Mover en el tablero las historias del Sprint 2 y asignar responsables | Tarjetas con «Sprint 2» | [#47](https://github.com/Proyecto-IngSoftware/acopio/issues/47) |

El orden de los puntos 4 y 7 importa: si las tarjetas se mueven antes de la captura, el
tablero ya no muestra el Sprint 1.

## Borrador del Sprint Planning

Todo lo de esta tabla es propuesta y se confirma el viernes. Las semanas suponen un
sprint de tres semanas, del 12 de octubre al 1 de noviembre
([P-047](../01-requerimientos/pendientes.md)).

| Elemento | Propuesta |
|---|---|
| Sprint Goal | El administrador decide cada traslado con el ranking del motor y lo despacha con una remisión que la zona confirma al recibir, y el portal muestra solo causas de entidades verificadas |
| Historias seleccionadas | Del Sprint 1, sin terminar: HU-10a Ver a dónde falta y de dónde sobra (8) y HU-10b Aprobar o descartar un traslado (5). Nuevas: HU-11 Despachar con un documento verificable (5), HU-12 Confirmar la llegada sin contar unidad por unidad (3) y HU-13 Contar lo que la fórmula no ve (3). Pendientes del Sprint 1: HU-02 Donar a una causa real (3) y HU-15 No dirigir donantes a una estafa (3). Suman 30 puntos. Los criterios de aceptación están en el [Avance 2](avance-02-requisitos.md#historias) |
| Tareas técnicas | API de la etapa 2 del motor y simulador ([#46](https://github.com/Proyecto-IngSoftware/acopio/issues/46)). Contrato OpenAPI sin arreglos en los nullable ([#38](https://github.com/Proyecto-IngSoftware/acopio/issues/38)). Maquetas en Stitch de C10, C11 y las pantallas de remisión y recepción. Interfaz del motor en tres ciclos ([#35](https://github.com/Proyecto-IngSoftware/acopio/issues/35)). Pieza C del Bloque 1: verificación de entidades y causas ([#48](https://github.com/Proyecto-IngSoftware/acopio/issues/48)). Servidor de pruebas ([#26](https://github.com/Proyecto-IngSoftware/acopio/issues/26)) |
| Responsables iniciales | Según los roles del Sprint 0 ([Avance 1, §5](avance-01-sprint0.md#5-roles-iniciales-y-acuerdos-de-trabajo)): Joseph, arquitectura, modelo de datos e integración; Brayan, requerimientos y diseño UI/UX; Alejandra, coordinación del sprint y documentación; Michael, calidad, pruebas y despliegue. El responsable hace el seguimiento de su área; la programación se reparte entre los cuatro. Detalle por tarea en la tabla de abajo |
| Dependencias o riesgos | La interfaz del motor depende de la API de la etapa 2 y de las maquetas aprobadas. El servidor de pruebas depende de decidir proveedor, dominio y remitente antes del 18 de octubre. Microsoft 365 retira el SMTP con contraseña a fines de 2026 (RTA-04) |
| Definition of Done | La misma del Sprint 1 ([Avance 4](avance-04-sprint1.md#3a-sprint-planning)), con un punto más: el cambio entra por un pull request que otro integrante revisa y aprueba |

**Tareas y responsables (propuesta).** Cada tarea queda con quien tiene ese rol desde
el Sprint 0. Una tarea con responsable no es de una sola persona: el responsable
garantiza que avance y quede documentada.

| Tarea | Responsable | Rol del Sprint 0 | Apoyo |
|---|---|---|---|
| Validar los criterios de aceptación de las siete historias antes de construir | Brayan | Análisis de requerimientos | Alejandra los deja en el tablero |
| Maquetas en Stitch de C10, C11, remisión, recepción y P3 y P4 (causas) | Brayan | Diseño UI/UX | Joseph las aprueba antes de escribir código |
| Modelo de datos y migraciones de la pieza C ([#48](https://github.com/Proyecto-IngSoftware/acopio/issues/48)) | Joseph | Arquitectura y modelo de datos | |
| API de la etapa 2 del motor y simulador ([#46](https://github.com/Proyecto-IngSoftware/acopio/issues/46)) | Joseph | Arquitectura e integración | Michael, pruebas de integración |
| Contrato OpenAPI sin arreglos en los nullable ([#38](https://github.com/Proyecto-IngSoftware/acopio/issues/38)) | Joseph | Integración entre la web y la API | Michael revisa |
| Interfaz del motor en tres ciclos ([#35](https://github.com/Proyecto-IngSoftware/acopio/issues/35)) | Joseph | Liderazgo de integración | Brayan, maquetas; Michael, recorridos |
| API e interfaz de la pieza C ([#48](https://github.com/Proyecto-IngSoftware/acopio/issues/48)) | Se reparte en el Planning | Desarrollo compartido | |
| Pruebas y recorridos de punta a punta del motor y de la pieza C | Michael | Pruebas | |
| Revisión de los pull requests | Michael | Revisión de calidad | Todos revisan al menos uno |
| Servidor de pruebas, contenedores y runbook ([#26](https://github.com/Proyecto-IngSoftware/acopio/issues/26)) | Michael | Despliegue | Joseph, decisión de proveedor y dominio |
| Planning, seguimientos semanales, tablero y cierre del sprint ([#47](https://github.com/Proyecto-IngSoftware/acopio/issues/47)) | Alejandra | Coordinación de Sprint | |
| Registro del sprint, «Cambios al construir», pendientes, ADR nuevos y Word del avance | Alejandra | Documentación | Joseph genera el Word |

**Rotación de roles.** El Avance 1 dice que los roles rotan cada sprint. El equipo
decidió el 2026-10-07 que en el Sprint 2 no rotan: siguen los del Sprint 0
([P-048](../01-requerimientos/pendientes.md)).

**Calendario del sprint (provisional).**

| Semana | Fecha máxima | Qué tiene que estar listo |
|:-:|---|---|
| 11 | domingo 18 oct | API de la etapa 2 del motor, contrato corregido, decisión de VPS y dominio |
| 12 | domingo 25 oct | Interfaz del motor: Bloque 4 cerrado |
| 13 | domingo 1 nov | Pieza C, servidor de pruebas, Review y retrospectiva |

## Seguimientos del Sprint 2

Uno por semana, el miércoles o el viernes, con captura y una fila por integrante.

| Semana | Fecha | Captura |
|:-:|---|---|
| 11 | por definir el viernes 9 | `evidencia/avance-05/seguimiento-semana-11.png` |
| 12 | por definir | `evidencia/avance-05/seguimiento-semana-12.png` |
| 13 | por definir | `evidencia/avance-05/seguimiento-semana-13.png` |

Tabla de cada seguimiento:

| Integrante | ¿Qué terminé desde el último seguimiento? | ¿Qué haré a continuación? | ¿Qué bloqueo o ayuda necesito? |
|---|---|---|---|
| Joseph | | | |
| Brayan | | | |
| Alejandra | | | |
| Michael | | | |

## Sprint Review (se llena en la semana 13)

| Historia | ¿Se cumplió? | Criterios pendientes, ajustes u observaciones |
|---|---|---|
| HU-10a Ver a dónde falta y de dónde sobra | | |
| HU-10b Aprobar o descartar un traslado | | |
| HU-11 Despachar con un documento verificable | | |
| HU-12 Confirmar la llegada sin contar unidad por unidad | | |
| HU-13 Contar lo que la fórmula no ve | | |
| HU-02 Donar a una causa real | | |
| HU-15 No dirigir donantes a una estafa | | |

La retrospectiva responde las cuatro preguntas del Avance 4 y revisa si se cumplió la
acción del Sprint 1: cuántos pull requests abrió y revisó cada integrante
(`gh pr list --state merged`).

## Cuando llegue la consigna

Lo que se ajusta en cuanto se conozca la consigna del Sprint 2:

- [ ] Guardar la guía en `docs/talleres/` si viene en PDF, o su texto en esta nota
- [ ] Semanas del Sprint 2 en el [calendario](calendario.md) y en el [cronograma](../05-planes/cronograma.md)
- [ ] Fechas de los milestones de las semanas 11 a 13 en GitHub
- [ ] Este borrador: secciones o tablas que pida la guía y no estén, y nombre del archivo
- [ ] [#47](https://github.com/Proyecto-IngSoftware/acopio/issues/47) y [P-047](../01-requerimientos/pendientes.md)
- [ ] Un `generar-avance-05.py` con el formato del Avance 4, y el Word en `unificar-avances.py`
