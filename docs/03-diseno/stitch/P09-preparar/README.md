---
title: "P9 · Preparar mi donación · diseño en Stitch"
type: diseno
tags: [diseno, stitch, portal, donador]
estado: vigente
actualizado: 2026-10-06
---

# P9 · Preparar mi donación · diseño en Stitch

| | |
|---|---|
| Proyecto | ACOPIO DISEÑO (`10306891818878200068`) |
| Pantallas | Paso 1 `62d76f9288374272a4fbce602007215d` · paso 2 `af651ecb4f8948648a67b4b0d0462b51` |
| Exportada | 2026-10-06 |
| Archivos | [captura-paso-1.png](captura-paso-1.png) · [pantalla-paso-1.html](pantalla-paso-1.html) · [captura-paso-2.png](captura-paso-2.png) · [pantalla-paso-2.html](pantalla-paso-2.html) |
| Maqueta | En la [maqueta del ciclo 1](../P13-mi-cuenta/maqueta.html) |
| Aprobación | Joseph la aprobó el 2026-10-06 |
| Construida | [construida-paso-1.png](construida-paso-1.png) · [construida-paso-2.png](construida-paso-2.png) · [construida-paso-3.png](construida-paso-3.png), en Chromium a 360 × 640 |

## Qué muestra

Tres pasos en `/donar`:

1. Qué llevas: el buscador y el escáner de C4. Cada línea tiene un control − / + y la cantidad
   en unidad base. Un código conocido cuenta presentaciones; uno desconocido se busca por
   nombre.
2. Dónde entregar: las sugerencias de la API, primero los acopios que reciben más de lo que se
   lleva y están abiertos, con la distancia. Debajo, la foto de factura opcional con el aviso de
   los 12 meses.
3. Tu folio: el QR, el folio grande, el acopio elegido y lo que se lleva.

## Diferencias

- El paso 3 no salió de Stitch: se cortó por tiempo dos veces. Se armó con los tokens en la
  maqueta. El QR se dibuja en SVG con la librería `qrcode`.
- La fecha de vencimiento aparece solo en las líneas perecederas.
- «No está recibiendo Agua» va en neutro con ícono, no en ámbar.
- Sin el texto explicativo de la factura que agregó Stitch.
