---
title: "C6 · Conteo físico · diseño en Stitch"
type: diseno
tags: [diseno, stitch, consola, inventario]
estado: vigente
actualizado: 2026-10-02
---

# C6 · Conteo físico · diseño en Stitch

| | |
|---|---|
| Proyecto | ACOPIO DISEÑO (`10306891818878200068`) |
| Pantalla | `d2e574def9ff482e9221494d209e2bf0` («C6 Conteo físico - Consola Acopio»), con el tema «Acopio · sistema de diseño» (`assets/3694704229522762996`) |
| Exportada | 2026-10-02 |
| Archivos | [captura.png](captura.png) · [pantalla.html](pantalla.html) |
| Maqueta | Junto a C5 en <https://claude.ai/artifact/GuEoCx3sSNuoVo9HCGUYNW> ([maqueta.html](../C05-salida/maqueta.html)) |
| Aprobación | Joseph la aprobó el 2026-10-02, con las diferencias de abajo |

La generación se cortó por tiempo en la herramienta; la pantalla quedó en el proyecto y
Joseph pasó su identificador.

## Qué muestra

Buscador de categoría con «Escanear», tarjeta con lo que dice el sistema y el último
movimiento, cantidad contada grande con teclado sin coma (la categoría va en unidades),
una franja con la diferencia y el saldo que queda, el motivo obligatorio con contador,
el aviso de que los ajustes no se borran y «Registrar ajuste» fijo abajo.

## Diferencias

Aprobadas por Joseph el 2026-10-02:

- Sin la etiqueta «Auditando» en la tarjeta: no corresponde a ningún estado del modelo.
- «Cantidad contada» en tipo normal, sin mayúsculas sostenidas.
- La franja de la diferencia va en neutro, con el signo y una flecha. Stitch la pintó en
  ámbar, que es el color de «Poco» en el semáforo.
- Sin «Obligatorio según regla RN-03». El contador dice cuántos caracteres faltan
  mientras haya menos de 10 y desaparece al llegar.
- Si la cantidad contada es igual al saldo, la franja dice «Coincide con el sistema» y
  el botón queda inactivo (422 `SIN_DIFERENCIA` en la API).
