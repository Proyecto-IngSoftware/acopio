---
title: "Sesión 2026-10-20 · Hallazgos de la ronda, escenario 15 y escáner"
type: informe
tags: [operacion, sesion]
estado: vigente
actualizado: 2026-10-20
---

# Sesión 2026-10-20 · Hallazgos de la ronda, escenario 15 y escáner

Se confirmó el cierre de la sesión del 19, se revisó el escenario 15 en el servidor y se
arreglaron dos hallazgos de la ronda por rol: #151 y #152 (PR #160). En una segunda parte se
cerró la fila 2 del plan y se buscó por qué el escáner no lee en el teléfono (#40).

## Qué cambió

| PR o commit | Qué trae |
|---|---|
| Rama `hallazgos-ronda-19` | #151: en C3 Inventario, una fila con más de 6 horas sin movimientos va con el fondo `surface-container` y dice «Más de 6 horas sin movimientos: puede no estar al día» (RNF-04). La regla vive en `esViejo` de `formato.ts`. #152: C7 «Umbrales y no recibir» muestra «No tienes asignado este acopio.» cuando el acopio no viene en `/acopios/gestion`, sin interruptores ni datos. El escenario 15, dos comentarios, la fila 5 y la 13 del plan, y P-080 |

| Rama `pendientes-20` | `camara.ts` pide la cámara en 1920 × 1080 y con enfoque continuo (#40, P-037), con `camara.test.ts`. La fila 2 del plan queda hecha y la 10 en curso |

No hubo cambios en el servidor, en Supabase ni en Stitch. En el servidor solo se leyó la API
pública.

## Pruebas

- Cierre del 19: `main` limpio y sin PR abiertos, el CI y CodeQL de `main` en verde después del
  #159, y `revisar-plan.mjs` sin avisos.
- Escenario 15: `GET /api/acopios/<Chapinero>/no-recibir` en el servidor devolvió Sal con
  `hasta: 2026-10-20`. Está bien así: la fecha cuenta como el último día sin recibir (la pantalla
  dice «Vuelve a recibir al día siguiente» y la API filtra `hasta >= hoy`). Sal vuelve a recibirse
  el 21.
- Pruebas nuevas: `esViejo` en `formato.test.ts`, la fila vieja y la reciente en
  `Inventario.test.tsx`, y el acopio ajeno en `Operacion.test.tsx`. Las dos de pantalla fallaron
  antes del cambio.
- Verificación completa en local: lint, typecheck, depcruise, `revisar-colores.sh`, unitarias e
  integración (46 suites, 506 pruebas, contra un PostgreSQL aparte en el 5439).
- Escáner: Joseph lo probó en Android con Chrome, y abría sin leer. Para reproducirlo se le pasó
  un EAN-13 dibujado en un canvas, en lugar de la cámara, al `camara.ts` de la app en el Chromium
  de Playwright. Con un código del mismo tamaño físico no leyó a 640 × 480, y a 1920 × 1080 leyó
  en unos 100 ms. Con un desenfoque leve no lee en ningún caso, y `TRY_HARDER` con los formatos
  limitados no lo mejoró, así que no se dejó. El enfoque continuo no se pudo probar aquí. La
  prueba nueva falla sin el cambio.
- Los recorridos no se corrieron: el cambio es de dos pantallas y sus pruebas de Vitest las cubren,
  axe incluido.

## Decisiones

- La fila vieja se atenúa con el color de fondo y no con opacidad. En el Bloque 3, `opacity-60`
  dejó texto con contraste de 3,16:1 y axe lo marcó (especificación de custodia, «Cambios al
  construir»).
- Para el acopio ajeno se usa el mismo mensaje de «Mi acopio» («No tienes asignado este acopio.»).

- Presentaciones, códigos de barras y unidades: Joseph aprobó el diseño
  ([spec](../../superpowers/specs/2026-10-20-presentaciones-codigos-design.md)) a partir de una
  maqueta de cinco pantallas. Cada código apunta a una presentación genérica, suelta o paquete;
  los Donadores proponen y los Operadores validan; los campos de cantidad admiten g o ml, y hay
  topes de 50 por presentación y 10.000 por línea. El plan quedó en
  [2026-10-20-presentaciones.md](../../05-planes/2026-10-20-presentaciones.md)
  ([P-081](../../01-requerimientos/pendientes.md), #163).

## Errores y correcciones

El informe y el plan del 19 decían que el escenario 15 se revisaba el 20. Con «hasta el 20», el 20
todavía no se recibe. Se corrigieron la guía de escenarios y la fila 5 del plan.

## Pendiente

- El 21, revisar que Sal ya no figure en «no recibir» de Chapinero (escenario 15, fila 5 del
  [plan de acción](../../05-planes/plan-de-accion.md)).
- [#153](https://github.com/Proyecto-IngSoftware/acopio/issues/153), segunda parte: la frase de la
  bitácora para un cambio de fecha en «no recibir».
- [#154](https://github.com/Proyecto-IngSoftware/acopio/issues/154): escenarios de HU-01.2, HU-02,
  HU-15 y HU-03 en la guía.
- El 24, los escenarios que gastan la demo
  ([#58](https://github.com/Proyecto-IngSoftware/acopio/issues/58)).

- Presentaciones, códigos y unidades, después del 23
  ([#163](https://github.com/Proyecto-IngSoftware/acopio/issues/163),
  [plan](../../05-planes/2026-10-20-presentaciones.md)).

## Depende de Joseph

- Aprobar en Stitch las maquetas de presentaciones, C18 y recepción (tarea 9 del
  [plan](../../05-planes/2026-10-20-presentaciones.md)).

- Autorizar, o no, la prueba del cambio de correo con Supabase en el servidor usando una cuenta
  desechable ([P-080](../../01-requerimientos/pendientes.md)).
- Ensayar la presentación (fila 4 del [plan de acción](../../05-planes/plan-de-accion.md)). El Word
  llega solo a OneDrive con cada push, y la fila 2 quedó hecha.
- Repetir el escáner en el teléfono cuando se despliegue el cambio, con un EAN a la distancia de
  una caja y con poca luz ([#40](https://github.com/Proyecto-IngSoftware/acopio/issues/40),
  [P-037](../../01-requerimientos/pendientes.md)).

## Parte 3 · Implementación de presentaciones, códigos de barras y unidades

Joseph pidió ejecutar el [plan](../../05-planes/2026-10-20-presentaciones.md) ese mismo día, en
la rama `presentaciones`, sin PR hasta después de la sustentación del 23
([P-081](../../01-requerimientos/pendientes.md), #163).

### Qué se construyó

- Esquema y migración de `presentacion` y del estado del código, con el ADR y las reglas puras en
  `packages/shared`.
- API de presentaciones y de códigos, topes de 50 por presentación y 10.000 por línea, y la
  propuesta del Donador.
- Recepción que valida o marca códigos, con el orden de candados presentación, código y candado
  consultivo.
- Contrato, tipos de la web y demo con presentaciones.
- Web: selector de unidades, «Código nuevo» y «Nueva presentación», C18 «Códigos» y la
  recepción con «Es correcto» y «Corregir».
- Recorrido `presentaciones.mjs`, documentado en [recorridos](../recorridos.md).

### Pruebas

- Verificación completa, encadenada con `&&`, salida 0 a la primera: lint, typecheck, depcruise
  (241 módulos, sin violaciones), unitarias (shared 116, API 100, web 1.089 en 109 archivos),
  integración contra el PostgreSQL aparte del 5439 (47 suites, 539 pruebas) y
  `revisar-colores.sh`. Las pruebas de la web que fallan bajo carga
  ([P-059](../../01-requerimientos/pendientes.md)) no fallaron en esta corrida.
- Tras los arreglos de la revisión final, la misma verificación salió en 0: unitarias (shared
  116, API 100, web 1.094 en 109 archivos), integración (47 suites, 546 pruebas), depcruise
  (241 módulos) y `revisar-colores.sh`. La demo se sembró dos veces sobre la base del Compose sin
  errores.
- Recorrido `presentaciones.mjs` en local, con la API del Compose reconstruida: 9 de 9 y 0
  errores de página. Con la cámara falsa de Chromium leyó un EAN-13 dibujado, el Donador lo
  propuso con una presentación nueva, `operador1` lo confirmó con «Es correcto» y el
  Administrador lo vio «Validado» en C18. La API confirmó el paso de `PROPUESTO` a `VALIDADO` y
  la línea recibida con su EAN. Tres corridas fallaron antes: una por el límite de 5 inicios de
  sesión por minuto, una por buscar la ficha sin abrir antes su presentación en C18 y otra por
  un selector de la casilla «Todos». Tras los arreglos de la revisión final se repitió: 9 de 9 a
  la primera.

### Decisiones de Joseph

- Los códigos de barras no se borran, se corrigen; sale la ruta `DELETE`.
- El Operador es la fuente de verdad: corregir una línea a una presentación propuesta la valida.
- El despliegue y el PR esperan a después del 23.

Las decisiones de Claude y los cambios respecto del diseño están en «Cambios al construir» del
[diseño](../../superpowers/specs/2026-10-20-presentaciones-codigos-design.md).

### Pendiente

- Desplegar y migrar el servidor de pruebas y abrir el PR de la rama `presentaciones`, con
  `Closes #163`, después del 23 (tarea 14, pasos 3 y 4 del
  [plan](../../05-planes/2026-10-20-presentaciones.md), fila 20 del
  [plan de acción](../../05-planes/plan-de-accion.md)).
- Ajustar a mano la demo del servidor tras la migración:
  [P-082](../../01-requerimientos/pendientes.md).
- Decidir el tope de 10.000 en el conteo físico:
  [P-083](../../01-requerimientos/pendientes.md).
- Revisión de Joseph de las pantallas de la rama y repetir el escáner en el teléfono:
  [#163](https://github.com/Proyecto-IngSoftware/acopio/issues/163) y
  [#40](https://github.com/Proyecto-IngSoftware/acopio/issues/40).
- Los menores diferidos de cada tarea (carrera al confirmar el tamaño de un paquete, `LIMIT 500`
  de la búsqueda sin aviso, `keepPreviousData` en C18 y otros) quedaron en
  [P-084](../../01-requerimientos/pendientes.md).
- La pantalla para renombrar, corregir y juntar presentaciones en C18 necesita maqueta y la
  aprobación de Joseph: [P-085](../../01-requerimientos/pendientes.md).
- El texto de las tareas 5 y siguientes del plan todavía menciona `DELETE` y el 422; vale
  «Cambios al construir» del
  [diseño](../../superpowers/specs/2026-10-20-presentaciones-codigos-design.md).
