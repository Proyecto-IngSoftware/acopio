---
title: "Sesión 2026-10-18 · Deuda de turnos (#129) y arranque de la pieza E"
type: informe
tags: [operacion, sesion]
estado: vigente
actualizado: 2026-10-18
---

# Sesión 2026-10-18 · Deuda de turnos (#129) y arranque de la pieza E

Joseph pidió cerrar los menores del Bloque 5 (P-070 y P-071) y arrancar la pieza E con una
lectura única de RedAcopio que sirva de base de desarrollo. #129 queda cerrado; la pieza E sigue
en diseño.

## Qué cambió

| PR o commit | Qué trae |
|---|---|
| PR de la rama `deuda-turnos-129` | P-070 y P-071 resueltos, contrato y tipos regenerados, pendientes, especificación del Bloque 5 y plan al día |

- P-070: la reserva pública trae `puedeCancelar` y la jornada de gestión trae
  `puedeMarcarAsistencia`, calculados con el reloj de la API. P8 y C14 solo leen esos campos.
- P-071: la API valida `dia`, `desde`, `hasta`, `fecha` y la fecha de cierre de una causa con
  `z.iso.date()`. `2026-13-01` y `2026-02-30` dan 400 `VALIDACION` (antes, probablemente un 500).
  P7 usa el patrón de UUID de la API y pasa el lugar a minúsculas. El logotipo sale con
  `Cache-Control: public, no-cache`. En C22 la causa editada entra a las listas apenas responde
  el PATCH, y sus estados de error ya no duplican el margen. P6 solo muestra el error de jornadas
  si no hay datos cargados.

En GitHub, [#49](https://github.com/Proyecto-IngSoftware/acopio/issues/49) suma dos casillas
que pidió Joseph: la copia de trabajo de RedAcopio y las plataformas de `/herramientas`.

## Pruebas

Pasan `lint`, `typecheck`, `depcruise`, `scripts/revisar-colores.sh`, las unitarias (104 de
shared, 71 de la API y 944 de la web) y las de integración (448, contra un PostgreSQL aparte en
el puerto 5439). Las dos pruebas nuevas de P7 fallan con el `Jornadas.tsx` anterior y pasan con
el nuevo. Dos arreglos quedaron sin prueba propia: la causa editada en C22, porque la respuesta
simulada de la lista no cambia tras el PATCH y no se distingue de la recarga, y el error de P6
con datos ya cargados. No se corrieron los recorridos.

## Decisiones

- Joseph: las plataformas de `/herramientas` irán como una lista aparte de «otras plataformas»,
  con su enlace, fuera del flujo de causas, porque no traen NIT ni verificación (HU-15).
- Joseph: la pieza E arranca con una lectura única de la portada de RedAcopio guardada en el
  repositorio, para no pedir la página en cada prueba. La lectura programada se agrega después
  sobre el mismo adaptador.
- Claude: el logotipo usa `no-cache` en vez de una versión en la URL. La URL pública no tiene
  de dónde sacar una versión, y así un logotipo reemplazado tampoco se queda en el navegador.

## Errores y correcciones

Una edición de los datos de prueba de la web se aplicó aunque Joseph detuvo la llamada. El
contenido era el previsto y se revisó con `git diff` antes de seguir.

## Pendiente

- Diseño de la pieza E: especificación con la copia de trabajo, el modelo del acopio
  referenciado y la lista de plataformas
  ([#49](https://github.com/Proyecto-IngSoftware/acopio/issues/49), fila 8 del
  [plan de acción](../../05-planes/plan-de-accion.md)).
- La copia de la portada leída hoy (88 puntos, 13 de septiembre como último cambio) todavía no
  está en el repositorio; entra con la especificación
  ([#49](https://github.com/Proyecto-IngSoftware/acopio/issues/49)).
- Menores de los bloques 1 a 3 y P-058
  ([#43](https://github.com/Proyecto-IngSoftware/acopio/issues/43), fila 13).

## Depende de Joseph

Aprobar la especificación de la pieza E y la maqueta de la ficha del acopio referenciado
([#49](https://github.com/Proyecto-IngSoftware/acopio/issues/49)).
