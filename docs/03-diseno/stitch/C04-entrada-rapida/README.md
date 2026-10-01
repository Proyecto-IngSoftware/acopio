---
title: "C4 · Entrada rápida · diseño en Stitch"
type: diseno
tags: [diseno, stitch, consola, inventario]
estado: vigente
actualizado: 2026-10-01
---

# C4 · Entrada rápida · diseño en Stitch

| | |
|---|---|
| Proyecto | ACOPIO DISEÑO (`10306891818878200068`) |
| Pantalla | `3ed55c1d3809424d93b7308fe91260a4` («C4 Entrada rápida - Consola Acopio») |
| Exportada | 2026-10-01 |
| Archivos | [captura.png](captura.png) · [pantalla.html](pantalla.html) |
| Maqueta | Junto a C3 e Historial en <https://claude.ai/artifact/TADcLzYEYr8uKadgBpSpPC> ([maqueta.html](../C03-inventario/maqueta.html)) |
| Aprobación | Joseph la aprobó el 2026-10-01, con las diferencias de abajo |
| Construida | [construida.png](construida.png), en Chromium a 360 × 640 |

Stitch la generó con el sistema de diseño viejo del proyecto (teal `#0F6E6E`); en el
código mandan los tokens de `packages/ui-tokens`.

## Diferencias

Aprobadas por Joseph el 2026-10-01:

- Arriba, una tarjeta «Recibir por folio». La lista de lo que trae la persona llega con
  el comprobante que prepara antes de ir (flujo del diseño general, pasos 1 y 2) y solo
  se confirma. Se activa en el Bloque 3; mientras tanto la tarjeta dice «Llega con los
  comprobantes». Debajo queda el registro sin folio, ítem por ítem, para quien llega sin
  haber preparado nada.
- Cabecera compartida y pestaña «Más» activa.
- «Saldo actual», sin «en carpa», y sin el subtítulo «Operación en bodega».
- El botón «Escanear» aparece en el ciclo 2, con el escáner.
- Si la categoría está marcada «no recibir», un aviso antes de registrar que deja seguir.
- Tras registrar, la pantalla muestra el saldo resultante y queda lista para la siguiente
  entrada.

## Al construir

- A 360 × 640, con una categoría elegida, el botón «Registrar» queda debajo del teclado y
  hay que desplazar un poco para tocarlo. Se revisa con el uso real antes de achicar las
  teclas, que hoy miden 56 px.

