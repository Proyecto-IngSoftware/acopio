---
title: "P4 · Ficha de causa · diseño en Stitch"
type: diseno
tags: [diseno, stitch, portal, causas]
estado: vigente
actualizado: 2026-10-17
---

# P4 · Ficha de causa · diseño en Stitch

| | |
|---|---|
| Proyecto | ACOPIO DISEÑO (`10306891818878200068`), tema «Acopio · sistema de diseño» (`assets/3694704229522762996`) |
| Pantallas | Ficha `b4201a1c526c4ea689fcdbd6eba4b46f` · con la hoja de salida `a050a3861f9c4995a5bb1c40563d424c`, generadas con `GEMINI_3_5_FLASH_LITE` |
| Exportada | 2026-10-17 |
| Archivos | [captura.png](captura.png) · [pantalla.html](pantalla.html) · [captura-salida.png](captura-salida.png) · [pantalla-salida.html](pantalla-salida.html) |
| Maqueta | En la [maqueta de P3](../P03-causas/maqueta.html) (<https://claude.ai/artifact/RGCjCvMDq98rsddGa1iH6d>), vistas «P4» |
| Aprobación | Joseph la aprobó el 2026-10-17 |
| Construida | Todavía no. Se construye con la pieza C ([#48](https://github.com/Proyecto-IngSoftware/acopio/issues/48)) |

Stitch dibujó primero la ficha con la hoja de salida abierta encima, y la hoja tapaba los
pasos. La ficha sola salió de editar esa pantalla. Las dos quedan guardadas.

## Qué muestra

La ficha pública de una causa. Cubre el criterio 2 de HU-02 y RF-RED-008.

- Imagen, categoría y título.
- La entidad responsable con su logotipo, el sello con su fecha y una nota: Acopio revisó un
  documento soporte y la verificación se renueva cada 6 meses.
- «Sobre la causa» y «Cómo donar», con los pasos numerados.
- El aviso de que Acopio no recibe dinero y el botón «Ir al sitio oficial».
- Al tocar el botón aparece una hoja inferior con «Vas a salir de Acopio» y el dominio de
  destino. «Continuar al sitio» abre otra pestaña; «Quedarme aquí» la cierra.

## Vistas de la maqueta

| Vista | De dónde sale |
|---|---|
| Ficha de causa | Stitch, pantalla `b4201a1c…` |
| Al tocar «Ir al sitio oficial» | Stitch, pantalla `a050a386…`, con la hoja sobre la ficha recortada |
| Causa atendida | Armada con los tokens |

## Decisiones

Joseph decidió al aprobar, el 2026-10-17, que la ficha de una causa atendida mantiene el
enlace al sitio oficial. Quedó en [P-064](../../../01-requerimientos/pendientes.md). En la
maqueta va como botón secundario, con la fecha de cierre arriba y el aviso de que puede que la
entidad ya no reciba donaciones para esa causa. Los pasos se titulan «Cómo se donaba».

## Diferencias

- Cabecera pública de los [componentes compartidos](../_compartidos/README.md), con la flecha
  atrás a la izquierda. Stitch escribió «Causas» junto a la flecha, y a 360 px no cabe con la
  marca y «Entrar».
- La imagen es un espacio reservado, como en P3, porque la foto de Stitch trae logotipos de la
  Defensa Civil.
- El sello y su fecha van en una línea bajo el nombre de la entidad.
- En la hoja de salida, el dominio de destino va en negrita.
