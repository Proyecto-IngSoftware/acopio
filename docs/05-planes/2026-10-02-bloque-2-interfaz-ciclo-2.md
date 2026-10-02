---
title: "Bloque 2 · Interfaz, ciclo 2: salida, conteo, umbrales y escáner · plan"
type: plan
tags: [plan, interfaz, bloque-2]
estado: aprobado
bloque: 2
actualizado: 2026-10-02
---

# Bloque 2 · Interfaz, ciclo 2: salida, conteo, umbrales y escáner · plan

**Objetivo:** que el Operador registre lo que sale de su acopio (C5) y corrija el saldo
después de contar (C6), que el Operador y el Administrador fijen mínimo y máximo por
categoría (C7), que C4, C5 y C6 encuentren la categoría con la cámara y que el
Administrador revise los códigos aprendidos (C18).

**Especificación:** [Bloque 2](../superpowers/specs/2026-10-01-bloque-2-inventario-design.md),
§6 y §7 (etapa 3). La API ya tiene todos los endpoints de este ciclo
([plan](2026-10-01-bloque-2-api.md)) y sus tipos están en `apps/web/src/api/esquema.d.ts`,
así que el ciclo no toca `apps/api`.

**Diseños aprobados por Joseph el 2026-10-02:**
[C5](../03-diseno/stitch/C05-salida/README.md) y
[C6](../03-diseno/stitch/C06-conteo-fisico/README.md), con su
[maqueta](../03-diseno/stitch/C05-salida/maqueta.html). Los umbrales de C7, el escáner y
la pestaña de C18 todavía no tienen diseño: la tarea 5 los pide a Stitch y no se escribe
su código hasta que Joseph apruebe la maqueta.

## Decisiones

| # | Decisión | Por qué |
|---|---|---|
| S-01 | Rutas `/consola/acopios/:id/salida` (C5) y `/consola/acopios/:id/conteo` (C6), solo para el Operador con `RequiereRol` | Siguen el patrón de C4; V-04 deja los movimientos al Operador asignado |
| S-02 | C4, C5 y C6 comparten el buscador de categoría, la tarjeta con el saldo y el teclado. Se sacan de `EntradaRapida.tsx` a piezas de `consola/inventario/` antes de escribir C5 | Tres pantallas con el mismo bloque; C4 ya tiene pruebas que cuidan el cambio |
| S-03 | La salida y el ajuste no llevan `id` del navegador: la API no lo recibe. Contra el doble toque, el botón queda inactivo mientras la petición está en curso | `SalidaDto` y `AjusteDto` no tienen `id`; las salidas no se capturan sin conexión (V-07) |
| S-04 | C5 compara la cantidad con el saldo leído de `GET /saldos` y bloquea el botón si lo pasa. Si la API responde 409 `SALDO_INSUFICIENTE`, el aviso usa el saldo de la respuesta y se vuelve a pedir el saldo | Otra persona pudo sacar entre la lectura y el registro |
| S-05 | «Sale primero» sale de `vencimientos` del saldo, solo en perecederos y solo si hay alguna fecha | El cálculo ya lo hace la API (V-02) |
| S-06 | C6 bloquea el botón si la cantidad contada es igual al saldo o si el motivo tiene menos de 10 caracteres. Un 422 `SIN_DIFERENCIA` muestra «Coincide con el sistema» | Las mismas reglas del `CHECK` y de la API, antes de enviar |
| S-07 | En «Más», «Mi acopio» suma Salida y Conteo físico para el Operador | §6 de la especificación |
| S-08 | El escáner es lo primero que se recorta si el tiempo aprieta, después de la captura sin conexión del ciclo 3 | §7 de la especificación |

## Tareas

1. **Piezas compartidas:** `BuscadorCategoria`, `TarjetaSaldo` y `TecladoCantidad` salen
   de C4 a `consola/inventario/`, con sus pruebas. Ganchos `useRegistrarSalida` y
   `useRegistrarAjuste` en `src/api/inventario.ts`. C4 pasa a usar las piezas y sus
   pruebas siguen en verde sin cambios.
2. **C5 Salida:** categoría, saldo con semáforo, «Sale primero», cantidad con lo que
   queda, los cuatro motivos, nota obligatoria con Traslado y Otro, aviso de saldo
   insuficiente (también desde el 409), saldo resultante y reinicio para la siguiente.
3. **C6 Conteo físico:** saldo del sistema y último movimiento, cantidad contada, franja
   con la diferencia o «Coincide con el sistema», motivo con lo que falta para 10
   caracteres, aviso de que no se borra, saldo resultante y reinicio.
4. **Navegación:** rutas de S-01, filas de «Mi acopio» (S-07) y prueba de rutas.
5. **Diseños pendientes:** pedir a Stitch el mínimo y el máximo en C7, el escáner en C4
   (código conocido, código nuevo para asociar, sin permiso de cámara) y la pestaña
   «Códigos de barras» de C18. Captura, HTML, maqueta y nota en
   `docs/03-diseno/stitch/`; aprobación de Joseph.
6. **Umbrales en C7:** mínimo y máximo por categoría con `PUT` y `DELETE
   /acopios/:id/umbrales/:categoriaId`, para el Operador asignado y el Administrador.
   Mínimo no mayor que máximo antes de enviar. C3 muestra el semáforo nuevo al volver.
7. **Escáner:** el botón «Escanear» vive en `BuscadorCategoria`, así llega a C4, C5 y C6.
   `@zxing/browser` se carga al tocarlo. Código conocido: llena la
   categoría y, con `contenido`, C4 cuenta presentaciones («12 botellas × 0,6 L = 7,2 L»).
   Código nuevo: elegir la categoría y asociarlo con `POST /codigos-barras`. Sin permiso
   de cámara o sin red, un aviso y la búsqueda sigue igual.
8. **C18 Códigos de barras:** pestaña para el Administrador con los códigos sin revisar
   (`GET /codigos-barras?revisado=false`), cambio de categoría o contenido y «Marcar
   revisado» (`PATCH`).
9. **Cierre:** recorrido en el Compose con un Operador y un Administrador, axe en
   Chromium a 360 × 640 en cada pantalla nueva, capturas `construida.png`, documentación
   y estado de este plan.

Cada tarea sigue el contrato de los ciclos anteriores: pruebas primero con Vitest y
Testing Library (`responderSegun`), `lint`, `typecheck`, `test`, colores, íconos nuevos
con `node scripts/iconos.mjs` y commit a `main`.

## Lo que más puede fallar sin que una prueba lo note

- Un decimal con coma en una categoría en `UNIDAD`: el teclado de C6 no muestra coma y C5
  tampoco debe aceptarla. La API responde 422.
- Una salida que deja el saldo en cero exacto: está permitida y el semáforo pasa a «Bajo
  el mínimo» si hay umbral.
- La nota de Traslado u Otro con solo espacios: cuenta como vacía.
- Cambiar de categoría con una cantidad escrita: la cantidad y el motivo se limpian para
  no registrar sobre la categoría equivocada.
- Una respuesta 403 (el Operador perdió la asignación): mensaje claro y sin reintento.

Cada caso lleva su prueba en la tarea que construye la pantalla.

## Estado

| Tarea | Estado | Qué falta |
|---|---|---|
| 1 Piezas compartidas | ✅ | El teclado de C4 tampoco ofrece la coma en categorías por unidades. Los ganchos de salida y ajuste entraron con C5 y C6 |
| 2 C5 | ✅ | `ErrorApi` guarda los `detalles` del error para leer el saldo del 409 |
| 3 C6 | ✅ | Un 422 `SIN_DIFERENCIA` dice que otra persona registró antes y vuelve a pedir el saldo |
| 4 Navegación | ✅ | |
| 5 Diseños pendientes | 🟡 | C18 exportada. Umbrales en C7, cámara del escáner y código nuevo se cortaron por tiempo en Stitch; falta encontrarlas en el lienzo, la maqueta y la aprobación |
| 6 Umbrales en C7 | ⬜ | |
| 7 Escáner | ⬜ | |
| 8 C18 | ⬜ | |
| 9 Cierre | ⬜ | |
