---
title: "Planes de implementación"
type: moc
tags: [moc, planes]
estado: vigente
actualizado: 2026-10-18
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
| 4 · Motor | [aprobada](../superpowers/specs/2026-10-06-bloque-4-motor-design.md) | [API, etapa 1](2026-10-06-bloque-4-api-etapa-1.md) · [API, etapa 2](2026-10-09-bloque-4-api-etapa-2.md) · [interfaz, ciclo 1](2026-10-14-bloque-4-interfaz-ciclo-1.md) | 🟡 API hecha: etapa 1 el 2026-10-07 (cálculo, sugerencias, pesos, aprobar y descartar) y etapa 2 el 2026-10-10 (remisiones, recepción en zona, reportes, capa pública, RF-CMP-007 y simulador). Interfaz: ciclo 1 (Administrador) construido el 2026-10-14, con su recorrido `consola-motor.mjs`; faltan los ciclos 2 y 3. [#35](https://github.com/Proyecto-IngSoftware/acopio/issues/35) |
| 1 · Piezas C, D y E | C: [plan](2026-10-17-pieza-c-causas.md), construida el 2026-10-17; D y E: contenido del home e importador | C construida, D y E pendientes | 🟨 C en `main` con lo que falta en [P-066](../01-requerimientos/pendientes.md). D y E quedaron fuera de la especificación del Bloque 1 y sin issue hasta el Sprint Review ([P-046](../01-requerimientos/pendientes.md)). [#48](https://github.com/Proyecto-IngSoftware/acopio/issues/48) hasta el 1 nov, [#50](https://github.com/Proyecto-IngSoftware/acopio/issues/50) y [#49](https://github.com/Proyecto-IngSoftware/acopio/issues/49) hasta el 15 nov |
| 5 · Turnos | [aprobada](../superpowers/specs/2026-10-17-bloque-5-turnos-design.md) | [API](2026-10-17-bloque-5-api.md) · [interfaz](2026-10-17-bloque-5-interfaz.md) | 🟡 API construida el 2026-10-17 e interfaz el 2026-10-18. Falta el recorrido contra el servidor y revisar HU-03 con Joseph. [#36](https://github.com/Proyecto-IngSoftware/acopio/issues/36) |
| 6 · Extras | pendiente | pendiente | ⬜ [#37](https://github.com/Proyecto-IngSoftware/acopio/issues/37) |
| Servidor de pruebas | [despliegue.md](../06-operacion/despliegue.md) | [plan de trabajo](2026-10-16-servidor-de-pruebas.md) · [factura y demo](2026-10-16-servidor-de-pruebas-factura-y-demo.md) | 🟡 Arriba desde el 2026-10-16 (#91, #92, #93). Factura por la API y demo con `DEMO_CONTRASENA` hechas en local; faltan desplegarlas, sembrar la demo y los recorridos contra el servidor. [#53](https://github.com/Proyecto-IngSoftware/acopio/issues/53), [#26](https://github.com/Proyecto-IngSoftware/acopio/issues/26) |

## Lo que sigue

Las fechas máximas de cada semana, hasta la entrega final, están en el
[cronograma](cronograma.md). Cada semana es un milestone de GitHub.

Estado al 2026-10-18: la API y los tres ciclos de interfaz del Bloque 4 están en `main`,
con «Mi zona» y los menores de la revisión del ciclo 3. El servidor de pruebas corre la
demo, y los recorridos pasan allá. Las maquetas de P3 y P4, las causas, quedaron aprobadas
([#57](https://github.com/Proyecto-IngSoftware/acopio/issues/57)). El último informe de
sesión está en [sesiones](../06-operacion/sesiones/README.md).

1. **Siguiente paso: cerrar el Bloque 5, turnos**
   ([#36](https://github.com/Proyecto-IngSoftware/acopio/issues/36)). La API y la interfaz
   están construidas ([plan de la interfaz](2026-10-17-bloque-5-interfaz.md)). Faltan correr
   `portal-turnos.mjs` contra el servidor después del despliegue y revisar con Joseph los
   criterios de HU-03 y los nueve pasos de §1 de la especificación. Los menores quedaron en
   [P-069](../01-requerimientos/pendientes.md) y [P-068](../01-requerimientos/pendientes.md).
   De la pieza C falta lo de [P-066](../01-requerimientos/pendientes.md): el recorrido de
   consola contra el servidor y los criterios de HU-02 y HU-15 con Joseph.
2. La ronda de pruebas del equipo en el servidor
   ([#58](https://github.com/Proyecto-IngSoftware/acopio/issues/58)). Lo que reporten entra
   como issue con la etiqueta `hallazgo`.
3. Después de la presentación: P-060, que vence el usuario recordado. Cuando se sume otra
   persona, P-063, el hook fuera del repositorio.
4. En paralelo, cuando haga falta, la deuda técnica
   ([etiqueta `deuda`](https://github.com/Proyecto-IngSoftware/acopio/issues?q=is%3Aopen+label%3Adeuda))
   y el despliegue definitivo ([#26](https://github.com/Proyecto-IngSoftware/acopio/issues/26)).

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
