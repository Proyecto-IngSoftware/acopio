---
title: "Sesión 2026-10-17 · Recorridos estables, «Mi zona» e informes de sesión"
type: informe
tags: [operacion, sesion]
estado: vigente
actualizado: 2026-10-17
---

# Sesión 2026-10-17 · Recorridos estables, «Mi zona» e informes de sesión

Se retomaron los pendientes de la sesión anterior. Los dos recorridos que no corrían quedaron
arreglados, «Mi zona» se construyó como pantalla propia y empezó la regla del informe por
sesión. Antes de escribirla se recuperó lo que solo había quedado en el chat.

## Qué cambió

| PR | Qué trae |
|---|---|
| #108 | `consola-remisiones.mjs` busca la línea por su categoría, y `donador.mjs` corre con `SIN_CORREO=1` entrando como `donador1` |
| #109 | «Mi zona» (`/consola/mi-zona`), el inicio del Receptor, con lo que viene en camino, lo que más falta y sus reportes. En «Más» queda una fila, y C20 abre en «Ya se resolvió» con `?modo=resuelta` |
| #110 | Esta carpeta, la plantilla, la regla en el `CLAUDE.md` y P-061 a P-063 |
| #111 | Los nueve menores de P-061 y el arreglo de P-059 (`findBy` espera 3 s): tope de 20 categorías en C20, «Subiendo la foto…» anunciado, forma del token del QR, contadores ligados a su nota, pruebas del 413 y el 415 con los datos reales de la API, la remisión fijada con estado en vez de `ref`, sin error encima del formulario al fallar una recarga, cambio de remisión sin desmontar, y el recorrido que cancela su borrador si no puede despachar |

Fuera del repositorio quedaron la maqueta de «Mi zona» en Stitch (pantalla
`f030c2293f00455891466e1a62aeee5d`) y su artifact, que Joseph aprobó. Los nueve menores del
ciclo 3 se listaron en [#43](https://github.com/Proyecto-IngSoftware/acopio/issues/43), y el
avance del motor, en [#35](https://github.com/Proyecto-IngSoftware/acopio/issues/35).

## Pruebas

- En los dos PR de código pasaron lint, tipos, depcruise, colores, unitarias e integración
  (369/369), y el CI de cada uno.
- En local, `consola-remisiones.mjs` dio 7/7 en tres corridas, `donador.mjs` 8/8 (y 7/7 con
  `SIN_CORREO=1`) y `consola-recepciones.mjs` 7/7, ya con «Mi zona».
- Contra el servidor, con `SIN_CORREO=1` y después del despliegue del #109,
  `consola-recepciones.mjs` dio 7/7 y `donador.mjs` 7/7. Es la primera vez que este último
  corre allá.
  `consola-remisiones.mjs` también dio 7/7 allá. Todo sin errores de página.

- Con los menores corregidos, las unitarias de recepciones pasan 110/110 y
  `consola-recepciones.mjs` 7/7 en local.
- La verificación de esa rama falló dos veces en `rutas.test.tsx`, cada vez en una prueba
  distinta y por tiempo. `main` sin los cambios falló igual en una de dos corridas: era
  [P-059](../../01-requerimientos/pendientes.md). Con `findBy` esperando 3 s la suite pasó
  cuatro de cuatro, y P-059 quedó resuelto en la misma rama.

## Decisiones

- «Lo que más falta» ordena por cobertura y no por déficit, porque el déficit viene en
  unidades distintas. Está en «Cambios al construir» de la especificación del motor.
- La fila de «Más» dice «N en camino · zona», y «Por recibir» muestra tres remisiones. Las dos
  cosas salieron del recorrido y están en la [nota de diseño](../../03-diseno/stitch/mi-zona/README.md).
- Joseph aprobó la maqueta de «Mi zona» y pidió el informe por sesión.
- El token del QR se valida con la forma que genera la API (24 caracteres base64url). Un QR
  de otra versión del documento con otra forma dejaría de abrirse, pero hoy todos salen de
  `randomBytes(18)`.

## Errores y correcciones

- La falla de `consola-remisiones.mjs` se había atribuido a datos viejos de la demo sin
  reproducirla. La causa era el script, que tomaba el primer campo del editor. Se corrigió la
  nota en `recorridos.md` y en los dos planes.
- Una expectativa de orden en `MiZona.test.tsx` se calculó de memoria y estaba mal. La atrapó
  la corrida, y la prueba ahora lleva la cuenta escrita.
- `prettier --write` sobre `src` reformateó `esquema.d.ts`, que es generado. Se devolvió a como
  estaba antes del commit.
- P-062 se marcó resuelto (#113) con la palabra de que la contraseña se había cambiado, sin
  haberla probado, porque el servidor no respondía. Al volver el servidor, la contraseña
  anterior todavía entraba, y P-062 se reabrió.
- El comentario de cierre en #43 decía que las nueve casillas iban marcadas antes de
  marcarlas. Se marcaron enseguida, editando el comentario que las listaba.

## Pendiente

El siguiente paso quedó en «Lo que sigue» del [índice de planes](../../05-planes/README.md):
al empezar, Joseph elige entre las maquetas de P3 y P4
([#57](https://github.com/Proyecto-IngSoftware/acopio/issues/57)) y la especificación del
Bloque 5 ([#36](https://github.com/Proyecto-IngSoftware/acopio/issues/36)).

- El hook `commit-tras-verificar.sh`, que está fuera del repositorio
  ([P-063](../../01-requerimientos/pendientes.md)).
- El usuario recordado, para después de la presentación
  ([P-060](../../01-requerimientos/pendientes.md)).
- La ronda de pruebas del equipo ([#58](https://github.com/Proyecto-IngSoftware/acopio/issues/58)).

## Depende de Joseph

- Cambiar `DEMO_CONTRASENA` por una más fuerte y borrar la primera descripción del PR #99
  ([P-062](../../01-requerimientos/pendientes.md)). Al cierre de la sesión, la descripción
  quedó borrada y comprobada en GitHub. La contraseña no cambió: Joseph la cambió en Dokploy,
  pero `seed:demo` no toca las cuentas que ya existen, y a las 18:20 `receptor1` entró con la
  anterior. Falta cambiarla en Supabase. Entre las 18:10 y las 18:13 el servidor no respondió
  por los puertos 80, 443 ni 22; a las 18:20 ya respondía.
