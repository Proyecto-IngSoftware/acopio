---
title: "Sesión 2026-10-20 · Escanear códigos en C18"
type: informe
tags: [operacion, sesion]
estado: vigente
actualizado: 2026-10-20
---

# Sesión 2026-10-20 · Escanear códigos en C18

En el catálogo maestro, la pestaña «Códigos de barras» decía «Escaneando o escribiendo el número», pero solo dejaba escribirlo. Ahora el Administrador escanea con la cámara del teléfono y sigue los mismos pasos que en Entrada rápida.

## Qué cambió

| PR o commit | Qué trae |
|---|---|
| [#170](https://github.com/Proyecto-IngSoftware/acopio/pull/170), fusionado con el CI en verde | «Escanear» y «Escribir el número» al pie de la pestaña; «Agregar código» del título abre la cámara; un código nuevo abre «Código nuevo» con el número leído; uno que ya existe avisa y abre su presentación; sin cámara, la hoja para escribirlo. Cinco pruebas en `PestanaCodigos.test.tsx` y un paso más en `presentaciones.mjs` |

No hubo cambios fuera del repositorio. La API no cambió.

## Pruebas

- `lint`, `typecheck`, `depcruise`, `scripts/revisar-colores.sh`, unitarias de la web (1151) y de la API (100), e integración (551) contra un PostgreSQL aparte: todo en verde.
- `presentaciones.mjs` en local, con el build servido por `vite preview` y la API del Compose: 10 de 10, sin errores de página. El paso nuevo usa la cámara falsa de Chromium, que lee el EAN con `@zxing/browser`.
- No se probó en un teléfono. Queda junto a la revisión del mapa en el servidor ([#163](https://github.com/Proyecto-IngSoftware/acopio/issues/163)).

## Decisiones

Joseph aprobó en el chat la propuesta: los dos botones al pie, la cámara desde el botón del título, el aviso y el detalle para un código que ya existe, y la hoja vacía si falla la cámara. No se hizo pantalla nueva en Stitch porque es la cámara de C04. Quedó escrito en la nota de [C18 Códigos de barras](../../03-diseno/stitch/C18-codigos-barras/README.md) y en «Cambios al construir» del [diseño de presentaciones](../../superpowers/specs/2026-10-20-presentaciones-codigos-design.md).

## Errores y correcciones

- Una prueba nueva fallaba porque la cámara simulada leía el código antes de que la prueba revisara que estaba abierta. Ahora el simulador no lee nada si la prueba no le da un número.
- La primera corrida del recorrido no pudo entrar como Donador: la demo local se sembró con la contraseña por defecto y el `.env` trae otra `DEMO_CONTRASENA`. Se corrió sin esa variable. Es del equipo local, no del repositorio.

## Pendiente

- Los íconos que salen siempre de 24 px y la clase `text-label-sm` que no existe ([P-086](../../01-requerimientos/pendientes.md)).
- Los detalles menores de la revisión del mapa ([P-087](../../01-requerimientos/pendientes.md)).

## Depende de Joseph

- Antes del 23, recorrer en el teléfono, contra el servidor, el mapa nuevo, el de voluntariado y ahora «Escanear» en C18 ([#163](https://github.com/Proyecto-IngSoftware/acopio/issues/163)).
