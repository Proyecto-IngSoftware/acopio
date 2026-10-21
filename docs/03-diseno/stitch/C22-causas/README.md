---
title: "C22 · Causas · diseño en Stitch"
type: diseno
tags: [diseno, stitch, consola, causas]
estado: vigente
actualizado: 2026-10-21
---

# C22 · Causas · diseño en Stitch

| | |
|---|---|
| Proyecto | ACOPIO DISEÑO (`10306891818878200068`), tema «Acopio · sistema de diseño» (`assets/3694704229522762996`) |
| Pantallas | Lista `768328f56a6c41afbb94ffcbe0ba2a0c` · formulario `00d0b836ec314adca5392dc3cba85e8f`, generadas con `GEMINI_3_5_FLASH_LITE` |
| Exportada | 2026-10-17 |
| Archivos | [captura-lista.png](captura-lista.png) · [pantalla-lista.html](pantalla-lista.html) · [captura-formulario.png](captura-formulario.png) · [pantalla-formulario.html](pantalla-formulario.html) |
| Maqueta | [maqueta.html](maqueta.html) (<https://claude.ai/artifact/9ATaVZKYFvQQgVQPUjKYHe>), con los cambios de [C15](../C15-entidades/README.md) |
| Aprobación | Joseph la aprobó el 2026-10-17 |
| Construida | Pieza C ([plan](../../../05-planes/2026-10-17-pieza-c-causas.md), tarea 11) |

## Qué muestra

La consola de causas del Administrador, en `/consola/causas`, a la que se llega desde «Más».
Cubre RF-RED-007 y RF-RED-010 según la
[especificación de la pieza C](../../../superpowers/specs/2026-10-17-pieza-c-causas-design.md).

- Pestañas «Activas», «Por cerrar» (las que cierran en 15 días, con su número) y «Atendidas».
  Cada fila lleva categoría, título, entidad y fecha de cierre; las que cierran pronto llevan
  «Cierra en N días».
- Al tocar una fila: «Renovar» con una fecha nueva, «Editar», «Archivar ahora» y «Ver la ficha
  pública». En una atendida, «Reactivar».
- El formulario pide entidad (solo verificadas), categoría (sin personas desaparecidas), título,
  descripción, imagen opcional, pasos reordenables, enlace oficial y fecha de cierre con el tope
  de 6 meses a la vista.
- Publicar, renovar o reactivar abre una confirmación con la entidad y el dominio de destino.
  Si el dominio no es el de la entidad, lo advierte.

## Diferencias

- Las categorías son las de la especificación. Stitch inventó «Educación» y «Agua».
- «Cierra en 10 días» va en el tono claro de la marca. Stitch la pintó ámbar, y el ámbar está
  reservado para el inventario; lo mismo con la X roja para quitar un paso.
- Cabecera de consola de los [componentes compartidos](../_compartidos/README.md), con
  «Volver» debajo.
- Armadas con los tokens, sin Stitch: la pestaña de atendidas, la vista de una causa y la
  confirmación de publicar.

## Línea visual, fase 3 (2026-10-21)

Los vacíos llevan las cajas. Los botones que esperan una respuesta giran mientras tanto y lo inhabilitado va en gris sólido. Maqueta: el lienzo aprobado de la línea visual ([ADR-0022](../../../02-arquitectura/adr/ADR-0022-linea-visual-con-movimiento-e-ilustracion.md)). La `construida.png` todavía es la anterior; se rehace con los recorridos.
