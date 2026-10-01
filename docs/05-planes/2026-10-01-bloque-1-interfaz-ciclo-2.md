---
title: "Bloque 1 · Interfaz, ciclo 2: selector de ubicación y matriz de acceso · plan"
type: plan
tags: [plan, interfaz, bloque-1]
estado: vigente
bloque: 1
actualizado: 2026-10-01
---

# Bloque 1 · Interfaz, ciclo 2: selector de ubicación y matriz de acceso · plan

**Objetivo:** los dos cambios a lo que ya existe que dejó el §6 de la especificación:
el selector de ubicación en la cabecera con sesión (RF-IDE-010) y la matriz de acceso
(RF-IDE-011, decisión B-07).

**Especificación:** [Bloque 1](../superpowers/specs/2026-09-30-bloque-1-red-design.md),
§6 «Cambios a lo que ya existe» y §7, paso 3. No hace falta API nueva: la matriz se arma
con `GET /usuarios` y `GET /ubicaciones`, y el selector con `GET /ubicaciones/mias`.

**Diseños:** la cabecera con el conmutador ya está en
[componentes compartidos](../03-diseno/stitch/_compartidos/README.md). La matriz y la
hoja del selector se piden en Stitch al empezar el ciclo y no se escribe código de esas
pantallas hasta que Joseph apruebe la maqueta.

## Decisiones

| # | Decisión | Por qué |
|---|---|---|
| J-01 | El selector vive en un contexto `UbicacionActiva` dentro de `src/sesion/`. Lee `GET /ubicaciones/mias` y guarda la elección en `localStorage` con la llave `acopio.ubicacion.<id del usuario>`. Si lo guardado ya no está entre las asignaciones, toma la primera | RF-IDE-010 pide que la elección dure entre sesiones en el mismo dispositivo. Con la llave por usuario, un teléfono compartido no mezcla las elecciones de dos personas |
| J-02 | El conmutador aparece solo con dos o más ubicaciones. El Administrador y el Auditor no lo tienen, porque su alcance es global | RF-IDE-010 y la regla de la cabecera en los componentes compartidos |
| J-03 | Al tocar el conmutador se abre una `Hoja` con las ubicaciones asignadas, agrupadas en acopios y zonas, y la activa marcada | Es el mismo patrón de las otras hojas de la consola y a 360 px no cabe un menú desplegable con nombres largos |
| J-04 | «Más» deja de mostrar una fila por acopio asignado. Muestra «Mi acopio» solo para la ubicación activa, si es un acopio | Con el selector, la ubicación activa es la que manda en toda la interfaz |
| J-05 | La matriz va en `/consola/accesos`, detrás de `RequiereRol` con Administrador y Auditor. El Administrador llega desde C16 y el Auditor desde «Más» | C16 es solo del Administrador en la web, y RF-IDE-011 también es del Auditor |
| J-06 | A 360 px la matriz se lee por ubicación: se elige una y se ve la lista de quién puede tocarla. Desde 768 px se ve la tabla de personas por ubicaciones, con la primera columna fija | Lo pide el §6 de la especificación. Una tabla de veinte columnas no se lee en un teléfono |
| J-07 | Los Donadores no entran. Los Administradores tampoco van en filas: una línea dice cuántos son y que pueden tocar todas las ubicaciones | RF-IDE-011. Un Administrador marcado en todas las columnas solo agrega ruido |
| J-08 | El CSV se arma en el navegador con una fila por persona y ubicación: nombre, usuario, rol, estado, restablecimiento pendiente, tipo, ubicación y municipio. Quien no tiene asignaciones sale en una fila con la ubicación vacía. Va con BOM y separador `;` | B-07. Excel en Colombia abre bien el `;` y el BOM conserva las tildes |

## Tareas

1. **Maquetas:** la matriz a 360 px (por ubicación) y desde 768 px (tabla), y la hoja del
   selector. Van en `docs/03-diseno/stitch/C16-usuarios/matriz/`. **Bloquea las tareas 3
   a 5 hasta que Joseph apruebe.**
2. **Cruce y CSV:** funciones puras `cruzarMatriz(usuarios, ubicaciones)` y
   `matrizCsv(filas)` con sus pruebas (cruce con nombres, filtros por rol, estado y
   ubicación, marca de restablecimiento y contenido del CSV).
3. **Selector:** contexto `UbicacionActiva`, conmutador en `CabeceraConSesion` y hoja;
   «Más» con la ubicación activa (J-04).
4. **Matriz:** pantalla `/consola/accesos` con las dos vistas (J-06), filtros, resumen de
   Administradores y botón «Exportar CSV»; enlace desde C16 y fila en «Más» para el
   Auditor.
5. **Cierre:** recorrido en el Compose con un Operador de dos acopios, un Auditor y el
   Administrador; axe en Chromium a 360 × 640 y la tabla a 1280 px; capturas
   `construida.png`; documentación.

Cada tarea sigue el contrato de los ciclos anteriores: pruebas primero con Vitest y
Testing Library (`responderSegun`), `lint`, `typecheck`, `test`, colores y commit a `main`.

## Qué se recorta si no alcanza

La vista de tabla desde 768 px. La lectura por ubicación cubre los criterios de
RF-IDE-011 en cualquier ancho.

## Estado

| Tarea | Estado | Qué falta |
|---|---|---|
| 1 Maquetas | ✅ | Stitch se cortó por tiempo dos veces sin dejar pantalla. La maqueta se armó con los tokens del tema y Joseph la aprobó el 2026-10-01 |
| 2 Cruce y CSV | ✅ | `consola/accesos/matriz.ts`. El CSV antepone una comilla simple a los campos que empiezan con `=`, `+`, `-` o `@`, para que Excel no los lea como fórmula |
| 3 Selector | ✅ | `useUbicacionActiva` (en `sesion/`) guarda la elección con `useSyncExternalStore`, así la cabecera y «Más» cambian juntas. `scripts/iconos.mjs` no ve un ícono que sale de una variable; el del selector se escribió como `function iconoDe` para que lo encuentre |
| 4 Matriz | ✅ | `/consola/accesos`. `MarcoPortal` deja esta ruta más ancha desde 768 px (lista `AMPLIAS`). El CSV sale con los filtros de rol y estado aplicados. `Pildora` pasó de C16 a `componentes/` |
| 5 Cierre | ⬜ | |
