---
title: "Cronograma semanal hasta la entrega final"
type: plan
tags: [planes, cronograma]
estado: vigente
actualizado: 2026-10-09
---

# Cronograma semanal hasta la entrega final

Qué tiene que estar listo al cierre de cada semana, del 7 de octubre de 2026 a la
semana 18. La fecha máxima es el domingo de cada semana, a las 23:59. Las semanas son
las del curso ([calendario](../entregas/calendario.md)).

En GitHub, cada semana es un milestone con esa fecha
([milestones](https://github.com/Proyecto-IngSoftware/acopio/milestones)) y cada
tarea es un issue asignado a su semana. En el Project, el campo «Sprint» agrupa las
historias y los issues por sprint.

## Supuestos

El docente entrega cada consigna a medida que avanza el curso. La del Sprint 2
([Avance 5](../talleres/Avance%20de%20Proyecto%205%20–%20IS1.pdf)) llegó el 9 de
octubre: el Sprint 2 va de la semana 10 a la 12 y la sustentación del segundo corte es
el viernes 23 de octubre ([P-047](../01-requerimientos/pendientes.md)).

- El Sprint 2 se cierra en la semana 12. La Review es la validación en clase del viernes
  23, que también es la sustentación: basta con mostrar el proyecto en ejecución y el
  diagrama de paquetes del Avance 4.
- El Sprint 3 empieza en la semana 13. Mientras no llegue su consigna, se supone que va
  hasta la 16 y que el cierre ocupa las 17 y 18. Si la guía trae otras semanas, se
  corren las fechas y el orden de los bloques se mantiene.
- La guía pide DAO, DTO y patrones de las tres familias con su código
  ([#59](https://github.com/Proyecto-IngSoftware/acopio/issues/59),
  [P-050](../01-requerimientos/pendientes.md)) y evidencia de ramas, pull requests y
  revisión. Desde el Sprint 2 cada cambio entra por PR
  ([P-051](../01-requerimientos/pendientes.md)).
- El ritmo del Sprint 1 fue de cuatro bloques y medio en nueve días de trabajo. El
  cronograma pide menos que eso por semana para que quede margen para las revisiones,
  la deuda y las semanas con más carga de otras materias. Si una semana termina antes,
  se adelanta la siguiente; ninguna fecha impide terminar antes.

## Semana por semana

### Semana 10 · hasta el domingo 11 de octubre · cierre del Sprint 1 y arranque del Sprint 2

| Qué tiene que estar listo | Issue |
|---|---|
| Seguimiento del equipo el viernes 9 con captura, filas de cada integrante y retrospectiva confirmada | [#45](https://github.com/Proyecto-IngSoftware/acopio/issues/45) |
| Vista Board del Project y captura del tablero con las historias del Sprint 1 | [#21](https://github.com/Proyecto-IngSoftware/acopio/issues/21), [#45](https://github.com/Proyecto-IngSoftware/acopio/issues/45) |
| Word del Avance 4 regenerado, unificado con los anteriores, índice actualizado y subido a OneDrive | [#45](https://github.com/Proyecto-IngSoftware/acopio/issues/45), [#23](https://github.com/Proyecto-IngSoftware/acopio/issues/23) |
| Plan de la etapa 2 de la API del motor escrito | [#46](https://github.com/Proyecto-IngSoftware/acopio/issues/46) |

### Semana 11 · hasta el domingo 18 de octubre · Sprint 2

| Qué tiene que estar listo | Issue |
|---|---|
| Planning del Sprint 2 el lunes 12, con las historias del sprint en el tablero | [#47](https://github.com/Proyecto-IngSoftware/acopio/issues/47) |
| API de la etapa 2 del motor: remisiones con QR, despacho, recepción en zona, reportes de necesidad, capa de zonas, vínculo folio-remisión y simulador | [#46](https://github.com/Proyecto-IngSoftware/acopio/issues/46) |
| Contrato OpenAPI sin arreglos en los campos nullable, antes de la interfaz del motor | [#38](https://github.com/Proyecto-IngSoftware/acopio/issues/38) |
| Servidor de pruebas arriba: VPS contratado, Dokploy y subdominio | [#26](https://github.com/Proyecto-IngSoftware/acopio/issues/26) |
| Compose listo para el servidor de pruebas: servicio web, Supabase, contraseña de las cuentas demo por variable | [#53](https://github.com/Proyecto-IngSoftware/acopio/issues/53) |
| Acopio levantado en un segundo equipo siguiendo solo el README | [#54](https://github.com/Proyecto-IngSoftware/acopio/issues/54) |
| Escenarios de prueba por rol, escritos desde los criterios de aceptación | [#55](https://github.com/Proyecto-IngSoftware/acopio/issues/55) |
| Maquetas de C10 y C11 aprobadas | [#56](https://github.com/Proyecto-IngSoftware/acopio/issues/56) |
| DAO sobre Prisma con su ADR, DTO y los patrones de diseño del Avance 5 en el código y en `patrones-y-practicas.md` | [#59](https://github.com/Proyecto-IngSoftware/acopio/issues/59) |

### Semana 12 · hasta el domingo 25 de octubre · cierre del Sprint 2

| Qué tiene que estar listo | Issue |
|---|---|
| Interfaz del motor en sus tres ciclos, con sus recorridos. Bloque 4 cerrado: HU-10a, HU-10b, HU-11, HU-12 y HU-13 | [#35](https://github.com/Proyecto-IngSoftware/acopio/issues/35) |
| Review del Sprint 2 en la validación de clase del viernes 23, historia por historia, y retrospectiva | [#47](https://github.com/Proyecto-IngSoftware/acopio/issues/47) |
| Avance 5 en el Word de OneDrive: pantallas con su flujo, patrones, registro del Sprint 2 y enlace al repositorio | [#47](https://github.com/Proyecto-IngSoftware/acopio/issues/47), [#59](https://github.com/Proyecto-IngSoftware/acopio/issues/59) |
| Sustentación del segundo corte el viernes 23: proyecto en ejecución y diagrama de paquetes | [#47](https://github.com/Proyecto-IngSoftware/acopio/issues/47) |
| Primera ronda de pruebas del equipo en el servidor, con sus hallazgos como issues | [#58](https://github.com/Proyecto-IngSoftware/acopio/issues/58) |
| Maquetas de P3 y P4 (causas) aprobadas | [#57](https://github.com/Proyecto-IngSoftware/acopio/issues/57) |

### Semana 13 · hasta el domingo 1 de noviembre · Sprint 3

| Qué tiene que estar listo | Issue |
|---|---|
| Planning del Sprint 3 el lunes 26 de octubre | [#51](https://github.com/Proyecto-IngSoftware/acopio/issues/51) |
| Pieza C del Bloque 1: verificación de entidades con documento y causas (HU-02, HU-15) | [#48](https://github.com/Proyecto-IngSoftware/acopio/issues/48) |

### Semana 14 · hasta el domingo 8 de noviembre · Sprint 3

| Qué tiene que estar listo | Issue |
|---|---|
| Bloque 5, turnos: especificación, API e interfaz (HU-03) | [#36](https://github.com/Proyecto-IngSoftware/acopio/issues/36) |

### Semana 15 · hasta el domingo 15 de noviembre · Sprint 3

| Qué tiene que estar listo | Issue |
|---|---|
| Pieza E del Bloque 1: importador de RedAcopio y carga por CSV (criterio 2 de HU-01) | [#49](https://github.com/Proyecto-IngSoftware/acopio/issues/49) |
| Pieza D del Bloque 1: contenido del home, páginas legales y Open Graph | [#50](https://github.com/Proyecto-IngSoftware/acopio/issues/50) |
| Escáner probado en un teléfono contra el servidor de pruebas | [#40](https://github.com/Proyecto-IngSoftware/acopio/issues/40) |

### Semana 16 · hasta el domingo 22 de noviembre · cierre del Sprint 3

| Qué tiene que estar listo | Issue |
|---|---|
| Bloque 6: bitácora enriquecida, transparencia y publicaciones. Es lo primero que se recorta si el calendario aprieta | [#37](https://github.com/Proyecto-IngSoftware/acopio/issues/37) |
| Deuda de las revisiones, incluido el criterio 2 de HU-05 | [#43](https://github.com/Proyecto-IngSoftware/acopio/issues/43), [#39](https://github.com/Proyecto-IngSoftware/acopio/issues/39), [#41](https://github.com/Proyecto-IngSoftware/acopio/issues/41) |
| Review del Sprint 3 el viernes 20 y retrospectiva | [#51](https://github.com/Proyecto-IngSoftware/acopio/issues/51) |

### Semana 17 · hasta el domingo 29 de noviembre · congelamiento

Desde el lunes 23 no entra funcionalidad nueva.

| Qué tiene que estar listo | Issue |
|---|---|
| RNF y escenarios de calidad verificados, cada uno con su prueba | [#25](https://github.com/Proyecto-IngSoftware/acopio/issues/25) |
| Revisión final del ADR-001 y su matriz de riesgos | [#24](https://github.com/Proyecto-IngSoftware/acopio/issues/24) |
| Todos los recorridos pasan contra el servidor de pruebas; bóveda y Word final al día; ensayo de la sustentación | [#52](https://github.com/Proyecto-IngSoftware/acopio/issues/52) |

### Semana 18 · hasta el domingo 6 de diciembre · entrega final

| Qué tiene que estar listo | Issue |
|---|---|
| Entrega final y sustentación | [#52](https://github.com/Proyecto-IngSoftware/acopio/issues/52) |

## Tareas por integrante

Cada issue está asignado según los roles del Sprint 0
([github-projects.md §7](../06-operacion/github-projects.md#7-equipo-y-asignaciones)).
Esta tabla junta las tareas abiertas hasta la semana 13; la fecha es el domingo de esa
semana.

| Integrante | Tarea | Hasta |
|---|---|---|
| Alejandra | Seguimiento del 9 de octubre, capturas y Word en OneDrive [#45](https://github.com/Proyecto-IngSoftware/acopio/issues/45) | 11 oct |
| Alejandra | Revisión de redacción y formato del documento del curso [#23](https://github.com/Proyecto-IngSoftware/acopio/issues/23) | 11 oct |
| Alejandra | Planning, seguimientos, Review y retrospectiva del Sprint 2, antes de la sustentación del 23 [#47](https://github.com/Proyecto-IngSoftware/acopio/issues/47) | 25 oct |
| Alejandra | Organizar la primera ronda de pruebas y ordenar los hallazgos [#58](https://github.com/Proyecto-IngSoftware/acopio/issues/58) | 25 oct |
| Brayan | Escenarios de prueba por rol [#55](https://github.com/Proyecto-IngSoftware/acopio/issues/55) | 18 oct |
| Brayan | Maquetas de C10 y C11 [#56](https://github.com/Proyecto-IngSoftware/acopio/issues/56) | 18 oct |
| Brayan | Maquetas de P3 y P4 [#57](https://github.com/Proyecto-IngSoftware/acopio/issues/57) | 25 oct |
| Brayan | Probar como visitante y Donador en la primera ronda [#58](https://github.com/Proyecto-IngSoftware/acopio/issues/58) | 25 oct |
| Michael | Servidor de pruebas: VPS, Dokploy y subdominio [#26](https://github.com/Proyecto-IngSoftware/acopio/issues/26) | 18 oct |
| Michael | Levantar Acopio en su equipo con el README [#54](https://github.com/Proyecto-IngSoftware/acopio/issues/54) | 18 oct |
| Michael | Probar como Operador y Receptor, con el escáner en un teléfono [#58](https://github.com/Proyecto-IngSoftware/acopio/issues/58) | 25 oct |
| Joseph | API de la etapa 2 del motor [#46](https://github.com/Proyecto-IngSoftware/acopio/issues/46) y contrato [#38](https://github.com/Proyecto-IngSoftware/acopio/issues/38) | 18 oct |
| Joseph | DAO, DTO y patrones de diseño del Avance 5 [#59](https://github.com/Proyecto-IngSoftware/acopio/issues/59) | 18 oct |
| Joseph | Compose listo para el servidor de pruebas [#53](https://github.com/Proyecto-IngSoftware/acopio/issues/53) | 18 oct |
| Joseph | Interfaz del motor [#35](https://github.com/Proyecto-IngSoftware/acopio/issues/35) | 25 oct |
| Joseph | Verificación de entidades y causas [#48](https://github.com/Proyecto-IngSoftware/acopio/issues/48) | 1 nov |

## Si el calendario aprieta

La [especificación](../superpowers/specs/2026-08-20-acopio-design.md) fija dos
recortes: el Bloque 6 es lo primero que sale, y los turnos se reducen a la reserva
básica (sin voluntariado especializado ni administración avanzada de jornadas). Este
cronograma pone la pieza D entre los dos, porque no tiene historia propia. El motor
(Bloque 4) y las piezas C y E, que cubren historias Must, no se recortan.

## Cómo se mantiene

Al cerrar cada semana se revisa su milestone. Lo que no se terminó se mueve a la
semana siguiente con un comentario en el issue que dice por qué, y se corrige esta
tabla. Cada seguimiento semanal empieza mirando el milestone de esa semana.
