---
title: "Sesión 2026-10-20 · Escanear códigos en C18, P-086 y P-087"
type: informe
tags: [operacion, sesion]
estado: vigente
actualizado: 2026-10-20
---

# Sesión 2026-10-20 · Escanear códigos en C18, P-086 y P-087

En el catálogo maestro, la pestaña «Códigos de barras» decía «Escaneando o escribiendo el número», pero solo dejaba escribirlo. Ahora el Administrador escanea con la cámara del teléfono y sigue los mismos pasos que en Entrada rápida. Después, a pedido de Joseph, se resolvieron los dos pendientes que dejó la sesión del mapa, P-086 y P-087.

## Qué cambió

| PR o commit | Qué trae |
|---|---|
| [#170](https://github.com/Proyecto-IngSoftware/acopio/pull/170), fusionado con el CI en verde | «Escanear» y «Escribir el número» al pie de la pestaña; «Agregar código» del título abre la cámara; un código nuevo abre «Código nuevo» con el número leído; uno que ya existe avisa y abre su presentación; sin cámara, la hoja para escribirlo. Cinco pruebas en `PestanaCodigos.test.tsx` y un paso más en `presentaciones.mjs` |

| [#172](https://github.com/Proyecto-IngSoftware/acopio/pull/172), fusionado con el CI en verde | P-086: los íconos van con la clase `icono` en una capa de Tailwind y toman el tamaño que pide el código; `text-label-sm` y `gap-space-2xs`, que no existían, pasan a tokens de Stitch; `tokens.test.ts` detecta tokens inexistentes; `anchoPunto` medido en Chromium. P-087: el aviso «no reciben» cuenta solo los visibles y va debajo del mapa, P7 deja el chip de un `?estado=` sin jornadas, pruebas nuevas en P5, P7, el marcador y la integración, un paso de chips en `portal-turnos.mjs` y la leyenda capturada aparte |

No hubo cambios fuera del repositorio. La API no cambió.

## Pruebas

- `lint`, `typecheck`, `depcruise`, `scripts/revisar-colores.sh`, unitarias de la web (1151) y de la API (100), e integración (551) contra un PostgreSQL aparte: todo en verde.
- `presentaciones.mjs` en local, con el build servido por `vite preview` y la API del Compose: 10 de 10, sin errores de página. El paso nuevo usa la cámara falsa de Chromium, que lee el EAN con `@zxing/browser`.
- Para P-086 y P-087, la verificación completa volvió a pasar: 1158 pruebas de la web y 552 de integración. Antes del cambio, en el navegador, los íconos que pedían 22, 20, 18 o 16 px salían de 24; después, cada uno sale del tamaño que pide. `tokens.test.ts` se corrió contra el código anterior y encontró los once usos de los dos tokens inexistentes. `referenciados.mjs` dio 7 de 7 y `portal-turnos.mjs` 8 de 8.
- No se probó en un teléfono. Queda junto a la revisión del mapa en el servidor ([#163](https://github.com/Proyecto-IngSoftware/acopio/issues/163)).

## Decisiones

Stitch no define `label-sm`, y el sistema de diseño deja los 12 px para `label-caps`, así que no se creó el token: cada uso pasó al token de Stitch que le corresponde. Quedó en el cierre de [P-086](../../01-requerimientos/pendientes.md).

Joseph aprobó en el chat la propuesta: los dos botones al pie, la cámara desde el botón del título, el aviso y el detalle para un código que ya existe, y la hoja vacía si falla la cámara. No se hizo pantalla nueva en Stitch porque es la cámara de C04. Quedó escrito en la nota de [C18 Códigos de barras](../../03-diseno/stitch/C18-codigos-barras/README.md) y en «Cambios al construir» del [diseño de presentaciones](../../superpowers/specs/2026-10-20-presentaciones-codigos-design.md).

## Errores y correcciones

- `portal-turnos.mjs` falló al abrir el mapa de P7. No era el cambio: «Clasificar ropa donada (demo)» empezaba en menos de 12 horas y había salido del mapa. El paso ahora acepta cualquiera de las dos jornadas de Chapinero.

- Una prueba nueva fallaba porque la cámara simulada leía el código antes de que la prueba revisara que estaba abierta. Ahora el simulador no lee nada si la prueba no le da un número.
- La primera corrida del recorrido no pudo entrar como Donador: la demo local se sembró con la contraseña por defecto y el `.env` trae otra `DEMO_CONTRASENA`. Se corrió sin esa variable. Es del equipo local, no del repositorio.

## Pendiente

Nada nuevo. [P-086](../../01-requerimientos/pendientes.md) y [P-087](../../01-requerimientos/pendientes.md) pasaron a «Resueltos».

## Depende de Joseph

- Antes del 23, recorrer en el teléfono, contra el servidor, el mapa nuevo, el de voluntariado y ahora «Escanear» en C18 ([#163](https://github.com/Proyecto-IngSoftware/acopio/issues/163)).
