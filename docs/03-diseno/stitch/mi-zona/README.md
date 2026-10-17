---
title: "Mi zona · diseño en Stitch"
type: diseno
tags: [diseno, stitch, consola, motor, recepcion]
estado: vigente
actualizado: 2026-10-17
---

# Mi zona · diseño en Stitch

| | |
|---|---|
| Proyecto | ACOPIO DISEÑO (`10306891818878200068`), tema «Acopio · sistema de diseño» (`assets/3694704229522762996`) |
| Pantalla | `f030c2293f00455891466e1a62aeee5d`, generada con `GEMINI_3_5_FLASH_LITE` |
| Exportada | 2026-10-17 |
| Archivos | [captura.png](captura.png) · [pantalla.html](pantalla.html) |
| Maqueta | [maqueta.html](maqueta.html) (<https://claude.ai/artifact/GzPiXjQG9xav6HiXT4qoAu>) |
| Aprobación | Joseph la aprobó el 2026-10-17 |
| Construida | [construida-mas.png](construida-mas.png) · [construida.png](construida.png), en Chromium a 360 × 640 (`consola-recepciones.mjs`) |

## Qué muestra

«Mi zona» es el inicio del Receptor, en `/consola/mi-zona`. Junta lo que antes estaba
repartido entre la sección de «Más», C13 y la ficha de zona (C10). Cierra lo que quedaba del
[plan del ciclo 3](../../../05-planes/2026-10-16-bloque-4-interfaz-ciclo-3.md) (tarea 9).

- En «Más», una sola fila «Mi zona», como «Mi acopio» del Operador, con el número de
  remisiones en camino.
- Arriba, la zona con su municipio, su emergencia y la población estimada.
- «Por recibir»: hasta tres remisiones en camino a la zona y los despachos generales, el
  escáner del QR y «Ver todas», que abre C13.
- «Lo que más falta»: las tres categorías de menor cobertura que aún tienen déficit, con una
  barra de dos tramos (recibido y en camino) y «Ver la ficha».
- «Tus reportes»: los reportes abiertos, uno por categoría, con «Reportar necesidad» y «Ya
  se resolvió algo», que abre C20 en ese modo.
- Con dos zonas o más, un selector arriba; la zona elegida va en `?zona=`. La ficha de zona
  vuelve a «Mi zona» con esa zona elegida.

## Diferencias

- Cabecera de la consola, con el avatar, como en C13.
- La barra tiene dos tramos. Stitch dibujó solo lo recibido, pero la ficha trae también lo
  que viene en camino, y eso es lo que el Receptor espera ver llegar. Va en un tono claro de
  la marca, con su leyenda.
- Las cifras van sin la palabra «Recibido» («120 de 1.200 L · 400 en camino») para que quepan
  en una línea a 360 px.
- «Reportar necesidad» usa el botón secundario de la consola; Stitch lo pintó gris.
- Armadas con los tokens, sin Stitch: la fila de «Más», el selector de dos zonas, la vista
  sin nada pendiente y la de sin zonas.

## Cambios al construir

- La fila de «Más» dice «5 en camino · Barrio San Agustín (prueba)». Con «remisiones en
  camino» y el nombre de la zona, la fila cortaba el número.
- «Por recibir» muestra tres remisiones. En la demo local se acumulan las de cada corrida del
  recorrido, y con más la tarjeta ocupaba media pantalla; las demás están en «Ver todas».
