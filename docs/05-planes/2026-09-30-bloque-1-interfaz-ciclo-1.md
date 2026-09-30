---
title: "Bloque 1 · Interfaz, ciclo 1: red y mapa · plan"
type: plan
tags: [plan, interfaz, bloque-1]
estado: vigente
bloque: 1
actualizado: 2026-09-30
---

# Bloque 1 · Interfaz, ciclo 1: red y mapa · plan

**Objetivo:** construir con los diseños de Stitch las pantallas nuevas del Bloque 1: la
consola que carga la red (C21 Acopios, C15 Entidades, C9 Zonas), el buscador de
ubicaciones de C16, las herramientas del Operador (Mi acopio y C7 No recibir) y lo
público (P5 Mapa y P6 Ficha).

**Especificación:** [Bloque 1](../superpowers/specs/2026-09-30-bloque-1-red-design.md),
§6 y el flujo aprobado el 2026-09-30. La API ya está construida
([plan de la API](2026-09-30-bloque-1-api.md)).

**Diseños aprobados por Joseph el 2026-09-30, con sus diferencias:**
[C21 lista](../03-diseno/stitch/C21-acopios/lista/README.md),
[C21 formulario](../03-diseno/stitch/C21-acopios/formulario/README.md),
[C15](../03-diseno/stitch/C15-entidades/README.md),
[C9](../03-diseno/stitch/C09-zonas/README.md),
[Mi acopio](../03-diseno/stitch/mi-acopio/README.md),
[C7](../03-diseno/stitch/C07-no-recibir/README.md),
[P5](../03-diseno/stitch/P05-mapa/README.md) y
[P6](../03-diseno/stitch/P06-ficha-acopio/README.md).

## Decisiones

| # | Decisión | Por qué |
|---|---|---|
| I-01 | Rutas públicas `/mapa` y `/acopios/:id`. Consola: `/consola/acopios`, `/consola/acopios/nuevo`, `/consola/acopios/:id`, `/consola/acopios/:id/operacion` (Mi acopio), `/consola/acopios/:id/no-recibir`, `/consola/entidades`, `/consola/zonas` | Siguen el patrón de `/consola/...` del ciclo 3 y las rutas de la API |
| I-02 | Leaflet con `react-leaflet` y `leaflet.markercluster`, en un fragmento que se carga solo al abrir una pantalla con mapa | RF-RED-002 pide Leaflet con OSM sin llave; la Portada no debe crecer |
| I-03 | La web consume `@acopio/shared` (horario): los scripts `dev`, `build` y `typecheck` compilan el paquete antes; Vitest lee el código fuente con un alias | Mismo arreglo que la API; `abiertoAhora` y `erroresHorario` son las mismas reglas en los dos lados |
| I-04 | «Cómo llegar» abre la ruta en Google Maps (`https://www.google.com/maps/dir/?api=1&destination=lat,lng`); «Compartir» usa `https://wa.me/?text=` con el enlace a la ficha | En Colombia es lo que abre la app del teléfono; sin llave ni librería |
| I-05 | «Cerca de mí» usa la geolocalización del navegador; si la niegan, queda la búsqueda por dirección. Las coordenadas viajan en `?cerca=` y P6 las usa para «A 1,2 km de ti» | RF-RED-002 y la diferencia aprobada de P6 |
| I-06 | Piezas compartidas: `EditorHorario`, `EtiquetaEstado`, `TarjetaNoTraigan` y `MapaConPin` | Aparecen en dos o más pantallas según el flujo aprobado |

## Tareas

1. **Base:** `@acopio/shared` en la web (I-03); ganchos de la API en `src/api/`
   (acopios, entidades, zonas, ubicaciones, no recibir y geocodificación); piezas
   `EtiquetaEstado`, `TarjetaNoTraigan` y `EditorHorario`, con sus pruebas.
2. **Mapa:** Leaflet en carga diferida (I-02) y `MapaConPin` con geocodificación.
3. **C15 Entidades:** lista y hoja para crear y editar.
4. **C21 Acopios:** lista con buscador y filtros, formulario para crear, editar y
   cerrar, «Crear entidad» si no hay entidades y enlace al «No recibir» del acopio.
5. **C9 Zonas:** selector de emergencia, lista, formulario con pin y solo lectura con la
   emergencia cerrada.
6. **C16 buscador de ubicaciones (B-08):** Invitar y Detalle eligen acopios y zonas por
   nombre y el detalle muestra los nombres.
7. **«Más»:** Acopios, Entidades y Zonas para el Administrador; una fila «Mi acopio» por
   acopio asignado para el Operador.
8. **Mi acopio y C7 No recibir.**
9. **P5 Mapa:** filtros, «Cerca de mí», búsqueda por dirección, marcadores agrupados y
   vista de lista; la pestaña «Mapa» deja de ir a «Próximamente».
10. **P6 Ficha:** «Cómo llegar», «No traigan», horario, cómo entrar, compartir, aviso sin
    dinero y la página de acopio cerrado.
11. **Cierre:** recorrido del §1 de la especificación en el Compose, revisión en
    Chromium a 360 × 640 con axe, peso de la Portada y del mapa en 3G, capturas
    `construida.png` y documentación.

Cada tarea sigue el contrato de los ciclos anteriores: pruebas primero con Vitest y
Testing Library (`responderSegun`), `lint`, `typecheck`, `test`, colores y commit a `main`.
En Vitest Leaflet no funciona, así que el mapa se prueba por su vista de lista y sus
filtros, y se revisa en Chromium.

## Estado

| Tarea | Estado | Qué falta |
|---|---|---|
| 1 Base | ⬜ | |
| 2 Mapa | ⬜ | |
| 3 C15 | ⬜ | |
| 4 C21 | ⬜ | |
| 5 C9 | ⬜ | |
| 6 C16 buscador | ⬜ | |
| 7 Más | ⬜ | |
| 8 Mi acopio y C7 | ⬜ | |
| 9 P5 | ⬜ | |
| 10 P6 | ⬜ | |
| 11 Cierre | ⬜ | |
