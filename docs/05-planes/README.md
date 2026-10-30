---
title: "Planes de implementación"
type: moc
tags: [moc, plan]
estado: vigente
actualizado: 2026-10-30
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
| 4 · Motor | [aprobada](../superpowers/specs/2026-10-06-bloque-4-motor-design.md) | [API, etapa 1](2026-10-06-bloque-4-api-etapa-1.md) · [API, etapa 2](2026-10-09-bloque-4-api-etapa-2.md) · [interfaz, ciclo 1](2026-10-14-bloque-4-interfaz-ciclo-1.md) | ✅ Cerrado el 2026-10-18: API (etapas 1 y 2) y los tres ciclos de interfaz, con sus recorridos. [#35](https://github.com/Proyecto-IngSoftware/acopio/issues/35) |
| 1 · Piezas C, D y E | C: [plan](2026-10-17-pieza-c-causas.md); D y E: sin especificación | C cerrada, D y E pendientes | 🟨 C cerrada el 2026-10-18 con HU-02 y HU-15 revisadas en el servidor ([#48](https://github.com/Proyecto-IngSoftware/acopio/issues/48)). D ([#50](https://github.com/Proyecto-IngSoftware/acopio/issues/50)) y E ([#49](https://github.com/Proyecto-IngSoftware/acopio/issues/49)) hasta el 15 nov |
| 5 · Turnos | [aprobada](../superpowers/specs/2026-10-17-bloque-5-turnos-design.md) | [API](2026-10-17-bloque-5-api.md) · [interfaz](2026-10-17-bloque-5-interfaz.md) · [cierre](2026-10-18-cierre-bloque-5.md) | ✅ Cerrado el 2026-10-18: API, interfaz y cierre, con HU-03 revisada en el servidor. [#36](https://github.com/Proyecto-IngSoftware/acopio/issues/36) |
| Presentaciones y códigos | [aprobada](../superpowers/specs/2026-10-20-presentaciones-codigos-design.md) | [plan](2026-10-20-presentaciones.md) | ⬜ Después del 23; las pantallas esperan Stitch. [#163](https://github.com/Proyecto-IngSoftware/acopio/issues/163) |
| 6 · Extras | pendiente | pendiente | ⬜ [#37](https://github.com/Proyecto-IngSoftware/acopio/issues/37) |
| Servidor de pruebas | [despliegue.md](../06-operacion/despliegue.md) | [plan de trabajo](2026-10-16-servidor-de-pruebas.md) · [factura y demo](2026-10-16-servidor-de-pruebas-factura-y-demo.md) | 🟡 Arriba desde el 2026-10-16 (#91, #92, #93). Factura por la API y demo con `DEMO_CONTRASENA` hechas en local; faltan desplegarlas, sembrar la demo y los recorridos contra el servidor. [#53](https://github.com/Proyecto-IngSoftware/acopio/issues/53), [#26](https://github.com/Proyecto-IngSoftware/acopio/issues/26) |

## Lo que sigue

El orden de lo que falta, con su issue, su fecha y su estado, está en el
[plan de acción](plan-de-accion.md). Se corrige cada vez que cambia algo y
`node scripts/revisar-plan.mjs` dice si quedó desalineado con GitHub. Las fechas máximas de
cada semana, hasta la entrega final, están en el [cronograma](cronograma.md); cada semana es
un milestone de GitHub. El último informe de sesión está en
[sesiones](../06-operacion/sesiones/README.md).

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
