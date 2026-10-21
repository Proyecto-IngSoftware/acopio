---
title: "P3 · Directorio de causas · diseño en Stitch"
type: diseno
tags: [diseno, stitch, portal, causas]
estado: vigente
actualizado: 2026-10-21
---

# P3 · Directorio de causas · diseño en Stitch

| | |
|---|---|
| Proyecto | ACOPIO DISEÑO (`10306891818878200068`), tema «Acopio · sistema de diseño» (`assets/3694704229522762996`) |
| Pantalla | `fc223c5e88554eb584160f20c2e1eaf4`, generada con `GEMINI_3_5_FLASH_LITE` |
| Exportada | 2026-10-17 |
| Archivos | [captura.png](captura.png) · [pantalla.html](pantalla.html) |
| Maqueta | [maqueta.html](maqueta.html) (<https://claude.ai/artifact/RGCjCvMDq98rsddGa1iH6d>), con P4 en el mismo archivo |
| Aprobación | Joseph la aprobó el 2026-10-17 |
| Construida | Todavía no. Se construye con la pieza C ([#48](https://github.com/Proyecto-IngSoftware/acopio/issues/48)) |

## Qué muestra

El directorio público de causas, en `/causas`, el enlace que ya tiene la barra inferior. Cubre
la parte pública de HU-02 y RF-RED-008.

- Solo aparecen causas de entidades verificadas. Cada tarjeta lleva imagen, categoría, título,
  entidad y el sello con su fecha («Verificada el 12 de agosto de 2026»). La tarjeta entera
  abre la ficha (P4).
- Arriba, el aviso permanente de que Acopio no recibe dinero.
- Filtros por categoría: personas, animales, adultos mayores, personas desaparecidas y
  rescatistas.
- Personas desaparecidas siempre está, al final de «Todas» y sola en su filtro. No tiene causas
  ni formularios: solo enlaza a la UBPD, la Cruz Roja Colombiana y Medicina Legal, y dice que
  Acopio no guarda datos de personas desaparecidas.
- Al final, una fila a «Causas atendidas», las archivadas.

## Vistas de la maqueta

| Vista | De dónde sale |
|---|---|
| Todas | Stitch, con las diferencias de abajo |
| Personas desaparecidas | Armada con los tokens |
| Causas atendidas | Armada con los tokens |
| Sin causas publicadas | Armada con los tokens |

## Decisiones

Joseph las tomó al aprobar, el 2026-10-17. Quedaron en
[P-064](../../../01-requerimientos/pendientes.md) para la especificación de la pieza C.

- «Causas atendidas» es una pantalla aparte, no un filtro dentro de P3, para separar las dos
  secciones. Las archivadas conservan su sello y su fecha, y dicen cuándo cerraron.
- Mientras ninguna entidad esté verificada, el directorio muestra la vista sin causas, con la
  tarjeta de personas desaparecidas en «Todas».

## Otras plataformas e ilustraciones (2026-10-19)

Maqueta [maqueta-plataformas-y-mapa.html](maqueta-plataformas-y-mapa.html)
(<https://claude.ai/artifact/78TAzib9qjFjXkRgLJSSz3>), aprobada por Joseph el 2026-10-19. La pantalla
construida es [construida-plataformas.png](construida-plataformas.png).

- Las 9 plataformas de RedAcopio van en una sección al final de «Todas», después de Personas
  desaparecidas y antes de «Causas atendidas». No llevan sello y el aviso dice que Acopio no las
  verifica. Con un filtro de categoría la sección no se muestra. `/plataformas` lleva a
  `/causas#plataformas`; ya no hay fila en «Más» ni enlace al pie de la portada.
- Cada plataforma lleva una foto real de su sitio: la imagen de vista previa (`og:image`) o una
  captura de la portada, guardadas en `apps/api/src/seed/imagenes-plataformas/`. Joseph pidió
  fotos y no ilustraciones. Las que no tienen foto se ven con el ícono de su categoría sobre menta.
- Las causas de la demo pasan a la ilustración de la maqueta: el ícono de Material Symbols de su
  categoría sobre una baldosa blanca y un fondo de la paleta.

## Diferencias

- Cabecera pública y barra inferior de los [componentes compartidos](../_compartidos/README.md).
  Stitch quitó el recuadro de la marca y cambió los íconos de Causas y Más.
- La imagen es un espacio reservado: la sube la entidad. Stitch generó fotos con logotipos de
  la Defensa Civil, que no pueden ir en la causa de otra entidad. Siguen en `captura.png` como
  parte de la exportación, y no se usan.
- Sin el botón «Ver cómo donar» en cada tarjeta: la tarjeta entera es el enlace.
- El sello y su fecha van en una sola línea bajo la entidad, en el color de la marca.
- Personas desaparecidas lleva el ícono `person_search` en el color de la marca. Stitch puso un
  triángulo de alerta rojo, y el rojo está reservado para el inventario.
- La categoría va en una píldora neutra, igual para todas.

## Línea visual, fase 2 (2026-10-21)

Las causas sin foto muestran el mapa (rescatistas) o las cajas (las demás categorías) en lugar del ícono suelto. La lista entra escalonada al filtrar y el vacío lleva las cajas. Maqueta: el lienzo aprobado de la línea visual ([ADR-0022](../../../02-arquitectura/adr/ADR-0022-linea-visual-con-movimiento-e-ilustracion.md)). La `construida.png` todavía es la anterior; se rehace con los recorridos.
