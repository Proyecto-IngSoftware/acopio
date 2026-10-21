---
title: "P8 · Mi reserva · diseño en Stitch"
type: diseno
tags: [diseno, stitch, portal, turnos]
estado: vigente
actualizado: 2026-10-21
---

# P8 · Mi reserva · diseño en Stitch

| | |
|---|---|
| Proyecto | ACOPIO DISEÑO (`10306891818878200068`), tema «Acopio · sistema de diseño» (`assets/3694704229522762996`) |
| Pantalla | `a4eec8e412d34b0a952d0cd0e72a3daa`, generada con `GEMINI_3_5_FLASH_LITE` |
| Exportada | 2026-10-17 |
| Archivos | [captura.png](captura.png) · [pantalla.html](pantalla.html) |
| Maqueta | [maqueta.html](maqueta.html) (<https://claude.ai/artifact/2SvLZGzTLSqC64W7KXdbVa>) |
| Aprobación | Joseph la aprobó el 2026-10-17 |
| Construida | Bloque 5 ([plan de la interfaz](../../../05-planes/2026-10-17-bloque-5-interfaz.md), tarea 5) |

## Qué muestra

La reserva de una persona sin cuenta, en `/voluntariado/reserva/:codigo#secreto`. El secreto va
después del `#` y la web lo manda a la API en el cuerpo de un `POST` (T-07 de la
[especificación](../../../superpowers/specs/2026-10-17-bloque-5-turnos-design.md)).

- Código, jornada, hora, lugar con «Cómo llegar» y qué llevar.
- El aviso «Guarda este enlace: es la única forma de volver a tu reserva», antes de los botones,
  porque el correo está apagado (P-055).
- «Agregar al calendario» baja el `.ics`, «Copiar enlace» copia la dirección completa con el `#`
  y «Cancelar reserva» pide confirmar.
- Cuando la jornada se cancela, solo queda el motivo. Sin el `#` dice «Este enlace está
  incompleto» y no llama a la API; con un secreto equivocado, «No encontramos esa reserva».

## Diferencias

- Cabecera pública de los [componentes compartidos](../_compartidos/README.md), sin avatar.
- El código va sin rótulo en mayúsculas y sin «Guarda o anota este código», porque lo que hay
  que guardar es el enlace.
- «Cancelar reserva» queda como botón de texto al final, como en Stitch, con 48 px de alto.
- Armadas con los tokens, sin Stitch: la confirmación de cancelar, la reserva cancelada, la
  jornada cancelada y los dos errores de enlace.

## Línea visual, fase 2 (2026-10-21)

El círculo con check pasa a ser el sello animado. La jornada lleva su bloque de fecha, la reserva cancelada lo muestra en gris con la etiqueta «Cancelada», y el enlace incompleto o la reserva que no aparece muestran el calendario ilustrado. Maqueta: el lienzo aprobado de la línea visual ([ADR-0022](../../../02-arquitectura/adr/ADR-0022-linea-visual-con-movimiento-e-ilustracion.md)). La `construida.png` todavía es la anterior; se rehace con los recorridos.
