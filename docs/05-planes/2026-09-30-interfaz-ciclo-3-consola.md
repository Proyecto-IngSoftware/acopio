---
title: "Interfaz · Ciclo 3: Más y herramientas de la consola · plan"
type: plan
tags: [plan, interfaz, bloque-0]
estado: vigente
bloque: 0
actualizado: 2026-09-30
---

# Interfaz · Ciclo 3: Más y herramientas de la consola · plan

**Objetivo:** con sesión, «Más» lleva a las herramientas de cada rol: usuarios y accesos
(C16), bitácora (C17) y catálogo maestro (C18), construidas con los diseños de Stitch.

**Diseños aprobados por Joseph el 2026-09-30:**
[Más con sesión](../03-diseno/stitch/mas-con-sesion/README.md),
[C16](../03-diseno/stitch/C16-usuarios/lista/README.md) (lista, invitar y detalle),
[C17](../03-diseno/stitch/C17-bitacora/README.md) y
[C18](../03-diseno/stitch/C18-catalogo/README.md).

**Base:** la API del Bloque 0 ya tiene todos los endpoints; este ciclo es solo web. Todo
pasa por el cliente tipado y la sesión en cookie (ADR-0014).

## Decisiones

| # | Decisión | Por qué |
|---|---|---|
| R-01 | «Más» es una sola pantalla para todos. Sin sesión muestra las secciones públicas; con sesión suma «Tu cuenta», las herramientas del rol y «Cerrar sesión» | Es el diseño aprobado y evita una barra distinta por rol (P-030) |
| R-02 | Herramientas por rol: Administrador ve usuarios, bitácora y catálogo; Auditor ve la bitácora; Operador y Receptor todavía no tienen herramientas | Son los permisos que ya aplica la API |
| R-03 | Las herramientas viven en `/consola/...` y un guard de la web pide sesión y rol. Sin sesión lleva a Entrar; con otro rol muestra «No tienes acceso» | La API ya lo exige; la web evita mostrar una pantalla que solo va a devolver 403 |
| R-04 | Las filas públicas de «Más» (donación, transparencia) llevan a «Próximamente» | Sus módulos no existen todavía |
| R-05 | Bitácora: las píldoras filtran por tipo (Todo, Destacados, Usuarios, Catálogo, Emergencias) y «Filtrar» por fechas. La frase de cada registro sale de su `accion` | La API filtra por `entidad`, `destacado` y fechas |
| R-06 | Detalle de usuario: las ubicaciones se muestran como cantidad; asignar y quitar ubicaciones llega con el Bloque 1 | No hay nombres de acopios hasta entonces |

## Tareas

1. **Más:** pantalla y fila compartida (`FilaMenu`), secciones por rol y cerrar sesión.
2. **Guard de consola y rutas:** `/consola/usuarios`, `/consola/usuarios/:id`,
   `/consola/usuarios/invitar`, `/consola/bitacora`, `/consola/catalogo`.
3. **C17 Bitácora:** píldoras, hoja de filtros, días, detalle con antes y después,
   «Cargar más».
4. **C18 Catálogo:** categorías (búsqueda, grupos, archivadas, crear, editar, archivar y
   reactivar), canasta (versión vigente y nueva versión) y emergencias (crear, editar y
   cerrar).
5. **C16 Usuarios:** lista con filtros, detalle con suspender, reactivar, restablecer
   acceso, cambiar rol y reenviar invitación; invitar persona.
6. **Cierre:** recorrido real, revisión en Chromium a 360 × 640 y documentación.

Cada tarea sigue el mismo contrato de los ciclos 1 y 2: pruebas primero, `lint`,
`typecheck`, `test`, colores y commit a `main`.
