---
title: "Sesión 2026-10-20 · Dos hallazgos de la ronda y el escenario 15"
type: informe
tags: [operacion, sesion]
estado: vigente
actualizado: 2026-10-20
---

# Sesión 2026-10-20 · Dos hallazgos de la ronda y el escenario 15

Se confirmó el cierre de la sesión del 19, se revisó el escenario 15 en el servidor y se
arreglaron dos hallazgos de la ronda por rol: #151 y #152.

## Qué cambió

| PR o commit | Qué trae |
|---|---|
| Rama `hallazgos-ronda-19` | #151: en C3 Inventario, una fila con más de 6 horas sin movimientos va con el fondo `surface-container` y dice «Más de 6 horas sin movimientos: puede no estar al día» (RNF-04). La regla vive en `esViejo` de `formato.ts`. #152: C7 «Umbrales y no recibir» muestra «No tienes asignado este acopio.» cuando el acopio no viene en `/acopios/gestion`, sin interruptores ni datos. El escenario 15, dos comentarios, la fila 5 y la 13 del plan, y P-080 |

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
- Los recorridos no se corrieron: el cambio es de dos pantallas y sus pruebas de Vitest las cubren,
  axe incluido.

## Decisiones

- La fila vieja se atenúa con el color de fondo y no con opacidad. En el Bloque 3, `opacity-60`
  dejó texto con contraste de 3,16:1 y axe lo marcó (especificación de custodia, «Cambios al
  construir»).
- Para el acopio ajeno se usa el mismo mensaje de «Mi acopio» («No tienes asignado este acopio.»).

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

## Depende de Joseph

- Autorizar, o no, la prueba del cambio de correo con Supabase en el servidor usando una cuenta
  desechable ([P-080](../../01-requerimientos/pendientes.md)).
- Subir `docs/entregas/Acopio - Avances IS1.docx` a OneDrive y ensayar la presentación (filas 2 y 4
  del [plan de acción](../../05-planes/plan-de-accion.md)).
- El escáner con un teléfono real ([#40](https://github.com/Proyecto-IngSoftware/acopio/issues/40)).
