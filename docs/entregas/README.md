---
title: "Entregas IS1 — índice"
type: moc
tags: [moc, entrega, is1]
estado: vigente
actualizado: 2026-10-07
---

# Entregas IS1 — índice

Entregables de **Ingeniería de Software I** · Docente: Juan Pablo Bustamante Moreno
· ETITC.

| Entrega | Contenido | Fecha | Estado |
|---|---|---|---|
| [Avance 1 — Sprint 0](avance-01-sprint0.md) | Matriz de selección, problema y usuarios, visión de producto, propuesta de valor, roles y acuerdos | 9 sep 2026 | ✅ Entregado. [Word](Avance%201%20-%20Sprint%200%20-%20Acopio.docx) |
| [Avance 2 — Requisitos y planeación](avance-02-requisitos.md) | RF, RNF y escenarios, restricciones y reglas, historias y backlog, casos de uso, stakeholders. [Guía](../talleres/Avance%20de%20Proyecto%202%20–%20IS1.pdf) · [Tablero](https://github.com/orgs/Proyecto-IngSoftware/projects/1) | Retomado 14 sep 2026 | 🟡 En curso — RF en borrador |
| [Avance 3 — Arquitectura inicial](avance-03-arquitectura.md) | Descomposición funcional, modelo de datos, ADR-001, diagrama de arquitectura. [Guía](../talleres/Avance%20de%20Proyecto%203%20–%20IS1.pdf) | Sustentación 11 sep 2026 · correcciones hasta 14 sep | 🟡 Word de revisión listo: [Avance 3 - Arquitectura inicial - Acopio.docx](Avance%203%20-%20Arquitectura%20inicial%20-%20Acopio.docx), generado con [generar-avance-03.py](generar-avance-03.py). Falta revisión del equipo y unirlo al Word del Avance 1 |
| [Avance 4 — Sprint 1](avance-04-sprint1.md) | Incremento funcional (API en Docker), diagrama de paquetes, Sprint Planning, seguimiento, Review y retrospectiva. [Guía](../talleres/Avance%20de%20Proyecto%204%20–%20IS1.pdf) | Semanas 8 a 10 (21 sep a 11 oct 2026) | 🟡 Word generado con [generar-avance-04.py](generar-avance-04.py). Faltan la captura del tablero y el seguimiento del viernes 9 de octubre |
| [Sprint 2 (borrador)](avance-05-sprint2.md) | Agenda de la reunión del 9 de octubre, borrador del Planning y tablas del seguimiento y del Review | Semanas 11 a 13, provisionales hasta la consigna del 9 de octubre | ⬜ Sin guía todavía |

## Calendario

Las guías fechan por número de semana. La conversión a fechas está en
[calendario.md](calendario.md): la semana 18 es la del 1 de diciembre de 2026.

## Un Word por avance y uno unificado

Cada avance tiene su propio script `generar-avance-0N.py`, que produce el Word de esa
entrega. [unificar-avances.py](unificar-avances.py) une los Word de todos los avances,
en orden, en «Acopio - Avances IS1.docx», que es el que se sube a OneDrive. Si cambia
un avance, se regenera su Word y luego el unificado.

## Equipo

| Integrante | Usuario de GitHub | Responsabilidad inicial |
|---|---|---|
| Joseph | [`Josephqaz`](https://github.com/Josephqaz) | Arquitectura y liderazgo de integración |
| Brayan | [`Bij3y`](https://github.com/Bij3y) | Análisis de requerimientos · Diseño UI/UX |
| Alejandra | [`algn1265-code`](https://github.com/algn1265-code) | Coordinación de Sprint y documentación |
| Michael | [`estebangutierrez406-svg`](https://github.com/estebangutierrez406-svg) | Calidad, pruebas y despliegue |

Los usuarios los confirmó Joseph el 2026-10-07. Los roles no rotan en el Sprint 2
([P-048](../01-requerimientos/pendientes.md)). Así se asignan los issues y las tarjetas
del Project: ver [github-projects.md](../06-operacion/github-projects.md#7-equipo-y-asignaciones).

## Evidencia del Avance 1

Resuelta. Se sustenta con la observación directa del 2026-08-20 y con fuentes de
prensa y de entidades del gobierno. No se harán conversaciones con operador,
voluntario y donante: decisión del equipo del 2026-09-11. Los datos del Manual Esfera
y del DANE se usan solo como referencia; ver
[P-001 y P-002](../01-requerimientos/pendientes.md).

## Fuente de verdad

El **Word** de esta carpeta es la versión entregada.
[avance-01-sprint0.md](avance-01-sprint0.md) es su copia en Markdown para la bóveda;
si difieren, manda el Word.

## Convención

Los entregables mantienen **enlaces Markdown**, no wikilinks, porque salen del vault
hacia OneDrive y Word. Ver [GUIA-OBSIDIAN.md](../GUIA-OBSIDIAN.md).
