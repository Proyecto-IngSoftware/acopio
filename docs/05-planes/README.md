---
title: "Planes de implementación"
type: moc
tags: [moc, planes]
estado: vigente
actualizado: 2026-10-09
---

# Planes de implementación

Un plan por bloque. Se escribe **justo antes** de empezar el bloque, no todos al
principio: un plan redactado con tres meses de anticipación describe un proyecto
que ya no existe.

Cada plan nace de su especificación correspondiente en
[superpowers/specs/](../superpowers/specs/).

## Orden de construcción

```
Bloque 0  Cimientos    monorepo · docker · prisma · identidad · catálogo maestro
Bloque 1  Red          acopios · zonas · entidades · mapa · home
Bloque 2  Inventario   movimientos · saldos · umbrales · no recibir · entrada rápida
Bloque 3  Custodia     comprobantes · conciliación · Garage · seguimiento por folio
Bloque 4  Motor        déficit · superávit · sugerencias · remisiones · QR
Bloque 5  Turnos       jornadas · reservas · aforo
Bloque 6  Extras       offline · bitácora enriquecida · transparencia
```

**Dependencias:**
- El Bloque 0 es prerrequisito de todo
- Los bloques 1, 2 y 3 pueden solaparse entre personas distintas
- El Bloque 4 exige 2 y 3 cerrados
- El Bloque 6 es lo primero que se recorta si el calendario aprieta

## Estado

| Bloque | Especificación | Plan | Estado |
|---|---|---|---|
| 0 · Cimientos | [aprobada](../superpowers/specs/2026-09-28-bloque-0-cimientos-design.md) | [aprobado](2026-09-28-bloque-0-cimientos.md) | ✅ cerrado; RTA-04 pasa al primer despliegue (P-032) |
| 0 · Interfaz, ciclo 1 | [aprobada](../superpowers/specs/2026-09-30-interfaz-ciclo-1-portada-design.md) | [aprobado](2026-09-30-interfaz-ciclo-1-portada.md) | ✅ Portada construida; sigue el ciclo 2 |
| 0 · Interfaz, ciclo 2 | [aprobada](../superpowers/specs/2026-09-30-interfaz-ciclo-2-acceso-design.md) | [aprobado](2026-09-30-interfaz-ciclo-2-acceso.md) | ✅ acceso y sesión construidos |
| 0 · Interfaz, ciclo 3 | sin especificación; los diseños están en el [plan](2026-09-30-interfaz-ciclo-3-consola.md) | [aprobado](2026-09-30-interfaz-ciclo-3-consola.md) | ✅ «Más» y consola (C16, C17, C18) construidos |
| 1 · Red, API | [aprobada](../superpowers/specs/2026-09-30-bloque-1-red-design.md) | [aprobado](2026-09-30-bloque-1-api.md) | ✅ cerrado el 2026-10-01: API e interfaz (ciclos 1 y 2), criterios del §9 cumplidos |
| 1 · Red, interfaz ciclo 1 | [aprobada](../superpowers/specs/2026-09-30-bloque-1-red-design.md) | [aprobado](2026-09-30-bloque-1-interfaz-ciclo-1.md) | ✅ red y mapa construidos |
| 1 · Red, interfaz ciclo 2 | [aprobada](../superpowers/specs/2026-09-30-bloque-1-red-design.md) | [aprobado](2026-10-01-bloque-1-interfaz-ciclo-2.md) | ✅ selector de la cabecera y matriz de acceso construidos |
| 2 · Inventario | [aprobada](../superpowers/specs/2026-10-01-bloque-2-inventario-design.md) | [API](2026-10-01-bloque-2-api.md), [interfaz ciclo 1](2026-10-01-bloque-2-interfaz-ciclo-1.md), [interfaz ciclo 2](2026-10-02-bloque-2-interfaz-ciclo-2.md), [interfaz ciclo 3](2026-10-02-bloque-2-interfaz-ciclo-3.md) | ✅ cerrado el 2026-10-05: API e interfaz (ciclos 1 a 3). El escáner en un teléfono real queda en P-037 |
| 3 · Custodia | [aprobada](../superpowers/specs/2026-10-05-bloque-3-custodia-design.md) | [API](2026-10-05-bloque-3-api.md) · [interfaz, ciclo 1](2026-10-06-bloque-3-interfaz-ciclo-1.md) · [interfaz, ciclo 2](2026-10-06-bloque-3-interfaz-ciclo-2.md) | ✅ Cerrado el 2026-10-06: API, ciclo 1 (el Donador) y ciclo 2 (la consola), con sus recorridos en `apps/web/recorridos/donador.mjs` y `consola-comprobantes.mjs` |
| 4 · Motor | [aprobada](../superpowers/specs/2026-10-06-bloque-4-motor-design.md) | [API, etapa 1](2026-10-06-bloque-4-api-etapa-1.md) | 🟡 Etapa 1 de la API hecha el 2026-10-07 (cálculo, sugerencias, pesos, aprobar y descartar). Faltan la etapa 2 (remisiones, recepción, reportes, mapa), el simulador y tres ciclos de interfaz. [#35](https://github.com/Proyecto-IngSoftware/acopio/issues/35) |
| 1 · Piezas C, D y E | pendientes: verificación y causas, contenido del home, importador | pendiente | ⬜ Quedaron fuera de la especificación del Bloque 1 y sin issue hasta el Sprint Review ([P-046](../01-requerimientos/pendientes.md)). [#48](https://github.com/Proyecto-IngSoftware/acopio/issues/48) hasta el 1 nov, [#50](https://github.com/Proyecto-IngSoftware/acopio/issues/50) y [#49](https://github.com/Proyecto-IngSoftware/acopio/issues/49) hasta el 15 nov |
| 5 · Turnos | pendiente | pendiente | ⬜ [#36](https://github.com/Proyecto-IngSoftware/acopio/issues/36) |
| 6 · Extras | pendiente | pendiente | ⬜ [#37](https://github.com/Proyecto-IngSoftware/acopio/issues/37) |

## Lo que sigue

Las fechas máximas de cada semana, hasta la entrega final, están en el
[cronograma](cronograma.md). Cada semana es un milestone de GitHub.

1. **Bloque 4**, etapa 2 de la API ([#46](https://github.com/Proyecto-IngSoftware/acopio/issues/46),
   hasta el domingo 18 de octubre; la interfaz sigue en
   [#35](https://github.com/Proyecto-IngSoftware/acopio/issues/35)). Primero se escribe su plan, a partir del §8 de la
   [especificación](../superpowers/specs/2026-10-06-bloque-4-motor-design.md). Entran las
   remisiones (crear a mano, editar el borrador, despachar con las `SALIDA`, cancelar y el
   QR), la recepción en zona con foto, los reportes de necesidad del Receptor, la capa de
   zonas del mapa público y el vínculo folio-remisión (RF-CMP-007). Las tablas ya existen
   desde la etapa 1 y `RemisionesBorradorService` ya arma los borradores. El plan también
   recoge los ocho menores que dejó la revisión final de la etapa 1 (anotados al pie de la
   tabla de estado de su [plan](2026-10-06-bloque-4-api-etapa-1.md)).
2. En paralelo con la etapa 2, el diseño de C10 Ficha de zona y C11 Motor de sugerencias en
   Stitch: son el ciclo 1 de interfaz y no se escriben sin la maqueta aprobada. La API que
   necesitan ya está.
3. DAO, DTO y patrones de diseño que pide el Avance 5
   ([#59](https://github.com/Proyecto-IngSoftware/acopio/issues/59), hasta el 18 de octubre).
   Primero un ADR que dice en qué módulos entran los DAOs y cómo comparten la
   transacción de cada servicio. La sustentación del segundo corte es el viernes 23 de
   octubre ([cronograma](cronograma.md)).
4. En paralelo, cuando haga falta, la deuda técnica de
   [#38 a #43](https://github.com/Proyecto-IngSoftware/acopio/issues?q=is%3Aopen+label%3Adeuda)
   y el primer despliegue ([#26](https://github.com/Proyecto-IngSoftware/acopio/issues/26)).

El [diseño general](../superpowers/specs/2026-08-20-acopio-design.md) ya está
aprobado y cubre los siete bloques. Cada bloque necesita además su propia
especificación de detalle antes de su plan.

## Qué lleva un plan

- Tareas en orden, con dependencias explícitas
- Quién hace qué
- Criterios de verificación por tarea, no solo al final
- Qué prueba demuestra que la tarea quedó bien
- Qué se recorta si el tiempo no alcanza

Una tarea sin criterio de verificación se declara terminada cuando alguien se
cansa, no cuando funciona.
