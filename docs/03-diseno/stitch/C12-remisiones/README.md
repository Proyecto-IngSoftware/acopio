---
title: "Remisiones · diseño en Stitch"
type: diseno
tags: [diseno, stitch, consola, motor, remisiones]
estado: vigente
actualizado: 2026-10-21
---

# Remisiones · diseño en Stitch

| | |
|---|---|
| Proyecto | ACOPIO DISEÑO (`10306891818878200068`), tema «Acopio · sistema de diseño» (`assets/3694704229522762996`) |
| Pantallas | Lista `3e10431b72ec4857ab95d37dda77d695`, borrador `699b7582f6cb4ec297b566df25225fff` y documento `0cbe666fc39b4a729833536d04237055`, generadas con `GEMINI_3_5_FLASH_LITE` |
| Exportada | 2026-10-15 |
| Archivos | [captura-lista.png](captura-lista.png) · [lista.html](lista.html) · [captura-borrador.png](captura-borrador.png) · [borrador.html](borrador.html) · [captura-documento.png](captura-documento.png) · [documento.html](documento.html) |
| Maqueta | [maqueta.html](maqueta.html) (<https://claude.ai/artifact/EPL5kAQSdgTLx18oRmLT2F>) |
| Aprobación | Joseph la aprobó el 2026-10-15 |
| Construida | [construida-lista.png](construida-lista.png) · [construida-borrador.png](construida-borrador.png) · [construida-despachar.png](construida-despachar.png) · [construida-documento.png](construida-documento.png), en Chromium a 360 × 640 (`consola-remisiones.mjs`) |

## Qué muestra

C12 Remisiones, para el Operador del acopio de origen y el Administrador, según el
[plan del ciclo 2](../../../05-planes/2026-10-15-bloque-4-interfaz-ciclo-2.md).

- `/consola/remisiones`: la lista con chips de estado (por defecto, los borradores), filtro
  por zona y «Nueva remisión».
- `/consola/remisiones/nueva`: destino, responsable opcional y el editor de líneas con lo
  que se puede mandar de cada categoría.
- `/consola/remisiones/:codigo`: el borrador con el mismo editor, «Despachar» y «Cancelar
  remisión»; en tránsito, «Imprimir documento» y «Cancelar remisión»; recibida o cancelada,
  solo para leer, con las fotos o el motivo.
- La hoja de despachar pide quién lleva el envío si falta y deja marcar folios
  conciliados. La de cancelar pide un motivo de 10 a 280 caracteres.
- `/consola/remisiones/:codigo/documento`: el documento en tamaño carta, con las líneas, los
  folios, el QR con el código debajo y las firmas de quien entrega y quien recibe.
- En «Más», la sección «Mi acopio» del Operador tiene la fila «Remisiones», que dice cuántos
  borradores esperan despacho.

## Diferencias

- Lista: cabecera y barra de la consola. Los chips no se desbordan y el filtro de zona va
  debajo.
- Borrador: sin las etiquetas «Bien» y «Escaso» en las líneas, porque esos colores son del
  estado del inventario (ADR-0006). La cantidad va al lado de lo que se puede mandar, y el
  error `LINEA_EXCEDE_MOVIBLE` aparece en la fila que lo causa, con «Usar N».
- Documento: sin «Compartir», sin rótulos en mayúsculas y sin el número de documento que
  Stitch inventó para quien entrega. El QR va a unos 3 cm para que se lea impreso.
- Sin Stitch, armadas con los tokens en la maqueta: nueva remisión, la hoja de despachar,
  en tránsito, cancelar, recibida y la fila de «Más».
- Al construir, el número de borradores de «Más» va en el recuadro del ícono de la fila (la prop `distintivo` de `FilaMenu`), no a la derecha como en la maqueta.
- El QR guarda la dirección de recepción de Acopio con el token de la remisión. Hasta el
  ciclo 3 esa dirección muestra la página de no encontrada.

## Línea visual, fase 3 (2026-10-21)

Las remisiones entran escalonadas al cambiar de estado o de zona, y los vacíos llevan la caja con folio. Tras despachar aparece el sello «Remisión despachada». Cancelar y descartar pasan a `Boton` con su borde rojo. Maqueta: el lienzo aprobado de la línea visual ([ADR-0022](../../../02-arquitectura/adr/ADR-0022-linea-visual-con-movimiento-e-ilustracion.md)). La `construida.png` todavía es la anterior; se rehace con los recorridos.
