---
title: "ADR-0020 · Grises piedra en los fondos y bordes, e íconos por grupo de categoría"
type: adr
tags: [arquitectura, adr, diseno, color]
estado: vigente
adr: 20
decision: aceptada
actualizado: 2026-10-18
---

# ADR-0020 · Grises piedra en los fondos y bordes, e íconos por grupo de categoría

**Fecha:** 2026-10-18 · **Estado:** aceptada · **Ajusta:**
[ADR-0013](ADR-0013-estetica-desde-stitch.md) (la paleta sale de Stitch) · **Deriva de:** la
ficha del punto de RedAcopio que Stitch generó para la pieza E
([#49](https://github.com/Proyecto-IngSoftware/acopio/issues/49))

## Contexto

El tema «Acopio Field Command» de Stitch usa fondos y bordes con un tinte azul violeta
(`#faf8ff`, `#eaedff`, `#bfc9c5`). Junto al verde bosque de la marca, la app se veía fría,
más de oficina que de terreno. Al generar la ficha del punto de RedAcopio, Stitch cambió por su
cuenta a grises cálidos tipo piedra, y a Joseph esa pantalla le pareció más cálida.

En la misma revisión salió que la app casi no usa íconos fuera del menú Más: el inventario, el
catálogo y la bitácora eran listas de solo texto.

## Decisión

1. Los fondos y bordes pasan a grises piedra. Se cambian solo los valores en
   `packages/ui-tokens/src/tokens.css`; los nombres de los tokens y las pantallas quedan igual:

   | Token | Antes | Ahora |
   |---|---|---|
   | `--background`, `--surface` | `#faf8ff` | `#fafaf9` |
   | `--surface-container-low`, `--surface-container` | `#f2f3ff`, `#eaedff` | `#f5f5f4` |
   | `--surface-container-high` | `#e2e7ff` | `#e7e5e4` |
   | `--surface-container-highest` | `#dae2fd` | `#d6d3d1` |
   | `--outline-variant` (bordes) | `#bfc9c5` | `#d6d3d1` |
   | `--inverse-surface`, `--inverse-on-surface` | `#283044`, `#eef0ff` | `#292524`, `#f5f5f4` |

2. Se quedan como estaban, por decisión de Joseph: el verde bosque `#085046`, el texto
   secundario `#3f4946`, los radios de 8 px, la cabecera con el logo, la barra inferior y la
   fuente Inter.
3. Los bordes usan `#d6d3d1` y no el `#e7e5e4` de Stitch: con el más claro las tarjetas casi
   desaparecen sobre el fondo, y el sistema de diseño pide lectura a pleno sol.
4. Cada grupo de categoría tiene un ícono, tomado de los que Stitch usó para esas categorías
   en sus pantallas (`ICONO_GRUPO` en `apps/web/src/api/catalogo.ts`, pieza `IconoGrupo`). La
   bitácora lleva un ícono por tipo de acción.

## Consecuencias

- La prueba de contraste de los tokens pasa: texto principal en AAA y el resto en AA.
- Las maquetas exportadas de Stitch conservan su paleta vieja. Cuando la maqueta y la app no
  coincidan en el color de los fondos, manda este ADR.
- Las capturas del Avance 5 que se tomaron antes del cambio ya no coinciden con la app; se
  vuelven a tomar con `CAPTURAS_WORD` antes de subir el Word.
- `scripts/iconos.mjs` reconoce ahora los mapas `ICONO_*`, para que los íconos de los grupos
  se descarguen con la fuente.
