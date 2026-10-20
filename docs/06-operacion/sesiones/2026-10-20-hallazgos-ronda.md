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
