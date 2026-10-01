---
title: "Planes de implementación"
type: moc
tags: [moc, planes]
estado: vigente
actualizado: 2026-10-01
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
| 2 · Inventario | [borrador](../superpowers/specs/2026-10-01-bloque-2-inventario-design.md) | pendiente | 🟡 especificación en revisión |
| 3 · Custodia | pendiente | pendiente | ⬜ |
| 4 · Motor | pendiente | pendiente | ⬜ |
| 5 · Turnos | pendiente | pendiente | ⬜ |
| 6 · Extras | pendiente | pendiente | ⬜ |

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
