---
title: "Sesión 2026-10-21 · Línea visual, fase 3"
type: informe
tags: [operacion, sesion, web, diseno, consola]
estado: vigente
actualizado: 2026-10-21
---

# Sesión 2026-10-21 · Línea visual, fase 3

Fusionada la fase 2 (PR 179), Joseph pidió seguir con la consola. Escribí el plan de la fase 3 y lo construí en la misma sesión, con la tabla «Pantalla por pantalla» de la especificación y el lienzo aprobado como maqueta. Quedó en un PR con la verificación completa en verde. Los recorridos siguen sin correrse porque la sesión no tiene Docker.

## Qué cambió

| PR o commit | Qué trae |
|---|---|
| Rama `claude/beautiful-faraday-11mzwz`, reiniciada desde `main` tras el PR 179 ([#177](https://github.com/Proyecto-IngSoftware/acopio/issues/177)) | C14 con bloque de fecha; sello al recibir por folio, recibir una remisión, conciliar y despachar; unos 40 botones que giran mientras esperan; inhabilitado en gris sólido; vacíos ilustrados en toda la consola; emergencia cerrada, sus zonas y usuario suspendido atenuados; remisiones y bitácora que entran al filtrar |
| Misma rama, documentos | [Plan de la fase 3](../../05-planes/2026-10-21-linea-visual-fase-3.md), «Cambios al construir» de la [especificación](../../superpowers/specs/2026-10-21-linea-visual-design.md), una sección en la nota de cada pantalla de consola y la fila 22 del [plan de acción](../../05-planes/plan-de-accion.md) |

Fuera del repositorio: el PR 179 de la fase 2 se fusionó con el CI en verde y sin alertas nuevas de CodeQL, a pedido de Joseph.

## Pruebas

- Verificación completa con salida 0: lint, typecheck, depcruise, `revisar-colores.sh`, 116 pruebas de `shared`, 100 de la API, 1255 de la web y 552 de integración contra un PostgreSQL 16 local.
- Las pruebas nuevas se vieron fallar antes del cambio: C14 con su bloque y el gris de la cerrada, cada sello solo tras su acción, «Conciliar», «Entrar» y «Rechazar comprobante» ocupados sin mandar dos veces, los vacíos de cada grupo y la suspendida atenuada.
- Con la web construida se comprobó que Tailwind genera las clases `enabled:` de los botones que conservan su color.
- No se corrieron los recorridos ni se rehicieron las `construida.png`: los dos necesitan la API del Compose.
- A pedido de Joseph, revisé el diseño con la skill `frontend-design`. Sobraba un efecto: las filas del balance de la Portada entraban escalonadas al cargar, sin que nadie filtrara. Se quitó, y la regla de usar la skill quedó en el `CLAUDE.md`.
- La revisión final la hice yo, sin un revisor aparte. Encontró que los botones rojos y durazno destellaban en verde al presionarlos, por el `active:` del primario, y quedó corregido.

## Decisiones

Todas en «Cambios al construir» de la especificación:

- El calendario de fechas de C14 conserva el texto tenue en los días que no se pueden elegir.
- Los sellos de conciliar y despachar salen solo justo después de la acción.
- Los botones principales con otro color pasan a `Boton` con `enabled:` para conservar el color y quedar en gris al inhabilitarse.
- «Suspendido» pasa del rojo al gris de los desactivados.
- Cuatro avisos sueltos de mi zona, reportar y sin sincronizar pasan a estado vacío con ilustración.

## Errores y correcciones

- El cambio de `disabled` a `ocupado` se hizo con un script sobre los `<Boton>`. Un `<button>` de `HojaCancelar` recibió `ocupado` y lo atrapó el typecheck; pasó a `Boton`.
- El primer intento en `CalendarioFechas` pintaba de gris todo el mes; se revirtió al ver qué quería decir «lleno» ahí.

## Pendiente

- Correr los 13 recorridos contra el Compose y rehacer las `construida.png` del portal y la consola ([#177](https://github.com/Proyecto-IngSoftware/acopio/issues/177)).

## Después de fusionar

Joseph pidió fusionar el PR 180 y recorrer el servidor. Con las tres fases desplegadas pasaron `referenciados`, `portal-causas`, `portal-turnos` (8 de 8) y `donador` (7 de 7). Las primeras corridas encontraron contraste por debajo de AA, corregido en el PR 181; el detalle está en «Últimos resultados» de [recorridos](../recorridos.md). Joseph habilitó «Accept edits» para que la sesión corriera los recorridos contra el servidor.

## Depende de Joseph

- Que `operador1` del servidor gestione el acopio de «Armar mercados (demo)», o decidir otra cuenta, para que `consola-turnos.mjs` corra allá ([#177](https://github.com/Proyecto-IngSoftware/acopio/issues/177)).
- Recorrer la demo del servidor antes del 23 ([#177](https://github.com/Proyecto-IngSoftware/acopio/issues/177)).
- Los recorridos que gastan la demo, en la ronda del 24 ([fila 5 del plan de acción](../../05-planes/plan-de-accion.md)).
