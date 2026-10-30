---
title: "C4 · Entrada rápida · diseño en Stitch"
type: diseno
tags: [diseno, stitch, consola, inventario]
estado: vigente
actualizado: 2026-10-30
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


## Selector de unidad kg / g (2026-10-20)

Pendiente de revisión por Joseph. Parte de la [maqueta de la idea](../../../superpowers/specs/2026-10-20-presentaciones-codigos-design.md).

| | |
|---|---|
| Proyecto | ACOPIO DISEÑO (`10306891818878200068`) |
| Pantalla | `3ed55c1d3809424d93b7308fe91260a4`, editada |
| Exportada | 2026-10-20 |
| Archivos | [pantalla-presentaciones.html](pantalla-presentaciones.html) · [render-presentaciones.png](render-presentaciones.png) (el HTML en Chromium a 360 px) |
| Aprobación | Pendiente de Joseph |

### Diferencias

- No hay captura de Stitch: la exportada seguía mostrando la versión anterior («25 kg»). El HTML exportado tampoco traía la edición, así que se aplicó a mano lo que Stitch devolvió: «500» con el selector «kg | g» (g activo) al lado, el aviso «Se registran 0,5 kg» y el botón «Registrar 0,5 kg».
- Se quitó del script de ejemplo la línea que reescribía el botón al teclear, para que el render conserve el texto.
- Se mantiene el resto de la pantalla aprobada: «Unidad: kg» en la tarjeta de categoría, teclado y fecha de vencimiento.

### Ajustes de la segunda ronda (2026-10-20)

- El selector «kg | g» tiene botones de 48 px de alto. El aviso sube a 14 px y añade «tope 10.000 por línea».

### Diferencias al construir (2026-10-20)

- El placeholder del buscador de categoría pasó a «Busca: arroz…» para que quepa a 360 px junto
  a «Escanear».
- Al escanear, el Operador y el Administrador pueden elegir «Escribir el número» cuando la cámara
  no lee. Esa acción no está en la maqueta aprobada.
- Un código propuesto por un Donador se confirma con «Es correcto» o se corrige antes de pedir la
  cantidad.

## Línea visual, fase 3 (2026-10-21)

Los botones que esperan una respuesta giran mientras tanto y lo inhabilitado va en gris sólido. Maqueta: el lienzo aprobado de la línea visual ([ADR-0022](../../../02-arquitectura/adr/ADR-0022-linea-visual-con-movimiento-e-ilustracion.md)). La `construida.png` todavía es la anterior; se rehace con los recorridos.
