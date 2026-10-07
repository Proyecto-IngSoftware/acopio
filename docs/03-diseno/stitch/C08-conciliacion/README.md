---
title: "Conciliación de un comprobante · diseño en Stitch"
type: diseno
tags: [diseno, stitch, consola, custodia]
estado: vigente
actualizado: 2026-10-06
---

# Conciliación de un comprobante · diseño en Stitch

| | |
|---|---|
| Proyecto | ACOPIO DISEÑO (`10306891818878200068`) |
| Pantalla | `8f9068754e6c4441bc4c574e06977b78` («C8b Conciliación de folio - Consola Acopio»), con el tema «Acopio · sistema de diseño» (`assets/3694704229522762996`) |
| Exportada | 2026-10-06 |
| Archivos | [captura.png](captura.png) · [pantalla.html](pantalla.html) |
| Maqueta | En la [maqueta del ciclo 2](../C08-comprobantes/maqueta.html) (<https://claude.ai/artifact/PHHhK2wyZjCj8bJZ1P3QRJ>) |
| Aprobación | Joseph la aprobó el 2026-10-06 |
| Construida | [construida.png](construida.png) · [construida-rechazo.png](construida-rechazo.png) · [construida-vincular.png](construida-vincular.png), en Chromium a 360 × 640 |

## Qué muestra

`/consola/comprobantes/:folio`, para el Auditor y el Administrador.

- El folio, su estado, el acopio, las fechas y «Ver factura» si la tiene.
- Una tabla por categoría en unidad base: lo que declaró el Donador, lo que llegó y lo que
  suman las entradas vinculadas, con la nota de diferencia o «No llegó».
- Las entradas vinculadas, cada una con la hora, quién la registró y si vino de la recepción
  o del Auditor.
- «Vincular entradas»: las entradas sin donación de los últimos 14 días, con selector de
  acopio, para un folio que se entregó sin red.
- «Conciliar» y «Rechazar». Rechazar abre una hoja con los cuatro motivos y una nota, que es
  obligatoria con «Otro», y avisa que se le escribe al Donador.
- Con el comprobante rechazado, «Revertir rechazo» en lugar de las dos acciones.

## Diferencias

- Una tabla por categoría en lugar de una tarjeta por categoría. Sin «Coincide», «Completo» ni
  «Poco» en verde, ámbar y rojo; la diferencia va en neutro con ícono.
- «Rechazar» va como botón de texto; el rojo queda para confirmar en la hoja.
- Sin el nombre ni el peso del archivo de la factura.
- La hoja de rechazo y la vista de vincular no salieron de Stitch; se armaron con los tokens.
- Quién registró cada entrada no lo devolvía la API; el plan del ciclo 2 lo agrega.
