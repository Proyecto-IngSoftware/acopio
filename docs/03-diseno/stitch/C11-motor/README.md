---
title: "Motor de sugerencias · diseño en Stitch"
type: diseno
tags: [diseno, stitch, consola, motor]
estado: vigente
actualizado: 2026-10-21
---

# Motor de sugerencias · diseño en Stitch

| | |
|---|---|
| Proyecto | ACOPIO DISEÑO (`10306891818878200068`) |
| Pantalla | `03afd216bd074a6c82b39050d99d9fa9` («C11 Motor de sugerencias - Consola Acopio»), con el tema «Acopio · sistema de diseño» (`assets/3694704229522762996`). Stitch generó otra versión, `c74b25813e7940248773c4c6f7aad10d`, que no se usa |
| Exportada | 2026-10-14 |
| Archivos | [captura.png](captura.png) · [pantalla.html](pantalla.html) |
| Maqueta | En la [maqueta del ciclo 1](../C10-ficha-zona/maqueta.html) (<https://claude.ai/artifact/WWwc7dGhbvLUxgKj3AycUb>) |
| Aprobación | Joseph la aprobó el 2026-10-14 |
| Construida | [construida.png](construida.png) · [construida-aprobar.png](construida-aprobar.png) · [construida-pesos.png](construida-pesos.png), en Chromium a 360 × 640 (`consola-motor.mjs`) |

## Qué muestra

`/consola/motor`, para el Administrador, desde «Más».

- «Recalcular», la hora de la última ronda y cuántas sugerencias dejó, con enlaces a «Pesos» y «Descartes».
- Filtros por estado, zona, acopio y categoría. Por defecto muestra las propuestas.
- Una tarjeta por sugerencia, ordenadas por puntaje. Cada una tiene la ruta del acopio a la zona, la categoría y la cantidad, el puntaje y la justificación que arma el motor, además de cuatro barras con criticidad, urgencia, proximidad y magnitud.
- «Aprobar» abre una hoja donde se edita la cantidad, con el máximo que se puede mandar, y avisa a qué remisión en borrador se suma o si se crea una nueva.
- «Descartar» abre una hoja que pide un motivo de 10 caracteres o más y avisa que el par no se vuelve a sugerir en 24 horas. Trae atajos con motivos frecuentes.
- Una sugerencia ya decidida muestra el código de su remisión o el motivo del descarte en lugar de los botones.

En la misma maqueta están los pesos (`/consola/motor/pesos`), con cuatro deslizadores que deben sumar 1, la cantidad mínima y la vista previa del ranking, y el informe de descartes, con conteos por motivo, categoría y acopio y los descartes recientes.

## Diferencias

- La tercera tarjeta lleva la justificación real del motor. Stitch había puesto una frase inventada.
- La cabecera y la barra inferior son las de la consola.
- Las hojas de aprobar y descartar, los pesos y el informe de descartes no salieron de Stitch. Los armé con los tokens.
- La hoja de aprobar no dice de antemano a qué remisión se suma: la API lo responde al aprobar y el aviso lo muestra. Tampoco muestra el máximo hasta que la API responde que la cantidad lo pasa; entonces ofrece «Usar N».
- La especificación no pide los atajos de motivo. Los agregué para que el informe agrupe motivos iguales, y el texto sigue siendo libre.

## Línea visual, fase 3 (2026-10-21)

«Recalcular» gira mientras espera. El motor sin traslados y los descartes vacíos llevan las cajas. Maqueta: el lienzo aprobado de la línea visual ([ADR-0022](../../../02-arquitectura/adr/ADR-0022-linea-visual-con-movimiento-e-ilustracion.md)). La `construida.png` todavía es la anterior; se rehace con los recorridos.
