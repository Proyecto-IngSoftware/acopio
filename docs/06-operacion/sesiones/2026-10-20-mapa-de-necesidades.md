---
title: "Sesión 2026-10-20 · Mapa de necesidades"
type: informe
tags: [operacion, sesion]
estado: vigente
actualizado: 2026-10-20
---

# Sesión 2026-10-20 · Mapa de necesidades

Joseph pidió que el mapa sirva para ver dónde falta un producto y dónde ya hay mucho, como en las
pantallas de Stitch «Mapa de Acopios y Necesidades» y «Voluntariado - Mapa de Jornadas y Reserva
de Cupos». Quedó construido en la rama `mapa-necesidades` y entró a `main` con el PR 168. El
servidor ya lo tiene desplegado.

## Qué cambió

| PR o commit | Qué trae |
|---|---|
| `7d055b1` | Maqueta aprobada, [diseño](../../superpowers/specs/2026-10-20-mapa-de-necesidades-design.md) y [plan](../../05-planes/2026-10-20-mapa-de-necesidades.md) |
| `0af884c`, `c2d09e4` | `GET /api/publico/necesidades`: por acopio, las categorías en falta, de sobra, al día y que no recibe, sin cantidades |
| `70c9b45` a `243a4a4` | P5: cada acopio con su etiqueta y su color, chips de estado, etiquetas por categoría, acopios que no la reciben apagados en vez de ocultos, tarjeta con «Qué falta hoy» y «Ya tienen de sobra» |
| `c75a100`, `a300709`, `49b5044` | P7: vista de mapa por defecto con «Faltan N personas», «Quedan N cupos» o «Llena», chips y precarga |
| `41d6c52`, `f80eabe` | Leyenda pequeña con una frase por estado, etiqueta acortada, ancla en la punta del círculo y chip de la URL siempre visible |
| `6aaddf1` | RF-RED-002, notas de P5 y P7, recorridos y capturas |
| `c9eb0b6` | Una prueba del marcador lee el texto con el DOM; CodeQL la había marcado |
| [#168](https://github.com/Proyecto-IngSoftware/acopio/pull/168) | El PR de la rama, fusionado el 2026-10-20 |

Fuera del repositorio, la maqueta quedó publicada en
<https://claude.ai/artifact/EekofY8Z5Ky2VprW6FXLe4>.

## Pruebas

La verificación completa en local salió con código 0: lint, tipos, depcruise,
`revisar-colores.sh`, unitarias (api 100, web 1147, shared 116, ui-tokens 4) e integración (551
pruebas en 48 suites, contra el contenedor aparte). Los recorridos `referenciados.mjs` y
`portal-turnos.mjs` pasaron 7 de 7 contra la API del Compose, sin errores de página. Después de
fusionar, `GET /api/publico/necesidades` del servidor respondió 200 con los datos de la demo. Las
pantallas en el servidor no se recorrieron.

Cada tarea la hizo un subagente y la revisó otro antes de pasar a la siguiente. Al final hubo una
revisión de toda la rama y otra de sus arreglos.

## Decisiones

- Joseph aprobó la maqueta con los tres teléfonos, voluntariado incluido. Para el punto del acopio
  eligió los colores de la maqueta: un círculo del color del estado, sin el nombre.
- Joseph pidió que voluntariado abra en el mapa, como P5, y una leyenda más pequeña.
- Las decisiones que tomó Claude están en «Lo que decidí yo al cerrar el diseño» y «Cambios al
  construir» del [diseño](../../superpowers/specs/2026-10-20-mapa-de-necesidades-design.md).

## Errores y correcciones

- La revisión final encontró que una categoría con umbral y marca de «no recibir» salía como
  «FALTA» en el mapa, justo encima de «No traigan». Se arregló en la API antes del PR.
- En P5, un enlace compartido con `?estado=falta` podía dejar el filtro puesto sin un chip para
  quitarlo. Quedó arreglado; en P7 hay un caso parecido, anotado en P-087.
- Un subagente dijo haber escrito su informe y el archivo no existía. Las pruebas se comprobaron a
  mano, y desde ahí cada despacho pide confirmar que el archivo existe.
- El primer CI del PR 168 salió en rojo por CodeQL: una prueba nueva quitaba etiquetas HTML con
  una expresión regular (`js/incomplete-multi-character-sanitization`). Ninguna revisión lo vio.
  La prueba pasó a leer el texto con el DOM y el CI quedó en verde.
- La tarea 6 pareció detenida. Esperaba a que venciera una jornada de la demo para volver a
  sembrarla; se le pidió correr todo en primer plano.

## Pendiente

- Los íconos salen siempre de 24 px y la clase `text-label-sm` no existe en los tokens
  ([P-086](../../01-requerimientos/pendientes.md)).
- Menores de las revisiones: pruebas que faltan, el orden del aviso y los chips, el chip de P7 en
  una URL compartida y la captura de P5 tapada por la cabecera
  ([P-087](../../01-requerimientos/pendientes.md)).
- Recorrer en el servidor el mapa nuevo y el de voluntariado, junto con las pantallas de
  [#163](https://github.com/Proyecto-IngSoftware/acopio/issues/163).

## Depende de Joseph

- Revisar en el teléfono, en el servidor, el mapa de acopios y el de voluntariado antes del 23
  ([#163](https://github.com/Proyecto-IngSoftware/acopio/issues/163)).
