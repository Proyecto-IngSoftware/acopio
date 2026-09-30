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

## Estado

| Tarea | Estado | Commit |
|---|---|---|
| 1 Más | ✅ | `f50a164` |
| 2 Guard de consola y rutas | ✅ | `0677f4c` |
| 3 C17 Bitácora | ✅ | `714f2b3` |
| 4 C18 Catálogo | ✅ | `2da67da` |
| 5 C16 Usuarios | ✅ | `e8033ec` |
| 6 Cierre | ✅ | `b64f598`, `48f326a` y el de la documentación |

El recorrido del cierre se hizo el 2026-09-30 en el Compose local, como administrador, en
Chromium a 360 × 640. Ninguna de las seis pantallas desborda a lo ancho, axe no encontró
violaciones graves y la consola del navegador quedó sin errores. La revisión la hizo solo
Joseph.

## Cambios al construir

| Qué | Por qué |
|---|---|
| El botón «Compartir por WhatsApp» usa el estilo primario del tema en lugar del verde de WhatsApp que traía el diseño | En `apps/web` no hay colores fuera de `ui-tokens` (ADR-0013) |
| Al invitar, las ubicaciones se escriben por su identificador | Los nombres de acopios llegan con el Bloque 1 (R-06) |
| Operador y Receptor no ven herramientas en «Más» | Sus pantallas llegan con los bloques 1 a 3 (R-02) |
| La bitácora no tiene la píldora «Invitaciones» del diseño | La API registra las invitaciones con la entidad `usuario`, así que quedan en «Usuarios» |
| «Ver su actividad en la bitácora», en el detalle de usuario, abre la bitácora filtrada por esa persona (`?usuario=`) | Estaba en la maqueta y la API ya filtra por usuario |
| Los `fieldset` de Invitar persona llevan `min-w-0` | Un identificador largo desbordaba la pantalla a 360 px |
| El script de íconos también lee `nombre={cond ? 'a' : 'b'}` y los `return` de las funciones `icono*` | Faltaban `archive`, `unarchive`, `visibility`, `visibility_off` y `link`, y en su lugar se veía la palabra. El botón de mostrar contraseña estaba así desde el ciclo 2 |
| El detalle de la bitácora muestra las fechas en formato local, y las que son solo día van sin hora | Llegaban en ISO |
| El registro del seed dice «Se creó el administrador inicial» | Mostraba `seed.admin_creado` |
