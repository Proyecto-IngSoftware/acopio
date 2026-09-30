---
title: "Planes de implementación"
type: moc
tags: [moc, planes]
estado: vigente
actualizado: 2026-09-30
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
| 0 · Cimientos | [aprobada](../superpowers/specs/2026-09-28-bloque-0-cimientos-design.md) | [aprobado](2026-09-28-bloque-0-cimientos.md) | 🟡 backend ✅ · interfaz con Stitch |
| 0 · Interfaz, ciclo 1 | [aprobada](../superpowers/specs/2026-09-30-interfaz-ciclo-1-portada-design.md) | [aprobado](2026-09-30-interfaz-ciclo-1-portada.md) | ✅ Portada construida; sigue el ciclo 2 |
| 0 · Interfaz, ciclo 2 | [aprobada](../superpowers/specs/2026-09-30-interfaz-ciclo-2-acceso-design.md) | [por revisar](2026-09-30-interfaz-ciclo-2-acceso.md) | ⬜ |
| 1 · Red | pendiente | pendiente | ⬜ |
| 2 · Inventario | pendiente | pendiente | ⬜ |
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
