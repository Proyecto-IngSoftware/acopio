---
title: "Reportar necesidad · diseño en Stitch"
type: diseno
tags: [diseno, stitch, consola, motor, reportes]
estado: vigente
actualizado: 2026-10-16
---

# Reportar necesidad · diseño en Stitch

| | |
|---|---|
| Proyecto | ACOPIO DISEÑO (`10306891818878200068`), tema «Acopio · sistema de diseño» (`assets/3694704229522762996`) |
| Pantalla | `321a84638cff440288f55f9a05c47110`, generada con `GEMINI_3_5_FLASH_LITE` |
| Exportada | 2026-10-16 |
| Archivos | [captura.png](captura.png) · [pantalla.html](pantalla.html) |
| Maqueta | En la [maqueta de C13](../C13-recepcion/maqueta.html) (<https://claude.ai/artifact/6zQs3346hig6iEcbqiRLHF>), vistas «C20» |
| Aprobación | Joseph la aprobó el 2026-10-16 |
| Construida | [construida.png](construida.png), en Chromium a 360 × 640 (`consola-recepciones.mjs`) |

## Qué muestra

C20 Reportar necesidad, para el Receptor y el Administrador, en
`/consola/zonas/:id/reportar`. Se abre desde el botón «Reportar necesidad» de la ficha de la
zona (C10).

- «Falta» o «Ya se resolvió», en un control de dos opciones.
- Con «Falta», las categorías de la zona con buscador, para marcar una o varias.
- Con «Ya se resolvió», solo las categorías que hoy están reportadas como faltantes.
- El aviso de que la nota se ve en el mapa público, antes del campo de la nota.
- Al enviar vuelve a la ficha con un aviso, y los reportes nuevos salen en «Lo que reporta
  el Receptor».

## Diferencias

- Sin íconos por categoría, porque el catálogo no los tiene, y sin el chip «Rol Receptor».
- Los reportes recientes van en la ficha de la zona, adonde se vuelve al enviar, y no debajo
  del formulario.
- Cabecera de la consola, sin la barra que inventó Stitch.
