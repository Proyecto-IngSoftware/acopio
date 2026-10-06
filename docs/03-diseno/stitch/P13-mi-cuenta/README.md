---
title: "P13 · Mi cuenta de Donador · diseño en Stitch"
type: diseno
tags: [diseno, stitch, portal, donador]
estado: vigente
actualizado: 2026-10-06
---

# P13 · Mi cuenta de Donador · diseño en Stitch

| | |
|---|---|
| Proyecto | ACOPIO DISEÑO (`10306891818878200068`), tema «Acopio · sistema de diseño» (`assets/3694704229522762996`) |
| Pantallas | Sin sesión `1bd475b19d9946759f1293fc60345ec2` · con sesión `c3f0598e8fda4a1d872909111bc953ec` |
| Exportada | 2026-10-06 |
| Archivos | [captura-sin-sesion.png](captura-sin-sesion.png) · [pantalla-sin-sesion.html](pantalla-sin-sesion.html) · [captura-con-sesion.png](captura-con-sesion.png) · [pantalla-con-sesion.html](pantalla-con-sesion.html) |
| Maqueta | [maqueta.html](maqueta.html), publicada en <https://claude.ai/artifact/QUu3kH8bmgNnLTFDHKfNCy>. Reúne las once vistas del ciclo 1 |
| Aprobación | Joseph la aprobó el 2026-10-06 |

Las capturas son el HTML de Stitch abierto a 390 px de ancho. Stitch entregó varias pantallas
en formato de escritorio aunque se pidieron para teléfono.

## Qué muestra

Sin sesión, dos pestañas. «Crear cuenta» pide nombre y correo; la contraseña se elige al
confirmar el correo (P-040). «Entrar» pide correo y contraseña. Tras crear la cuenta queda un
aviso que es igual exista o no el correo.

Con sesión, «Mis donaciones»: el botón para preparar una, el aviso de los 7 días, el filtro por
estado y una tarjeta por donación con folio, estado, acopio, antigüedad y resumen. Las
preparadas tienen «Ver folio» y «Cancelar donación»; todas tienen «Seguir».

## Diferencias

Aplicadas en la maqueta y aprobadas con ella. Valen para todas las pantallas del ciclo:

- Neutros en lugar del verde, el ámbar y el morado, que son del semáforo.
- Sin flechas al final de los botones, sin rótulos encima de los títulos y sin etiquetas en
  mayúsculas.
- Sin textos que la API no tiene («Regla RN-05», «auditada y conforme», «verificada en
  báscula»).
- La barra inferior es la del portal, con cinco destinos. Stitch dibujó tres.
- «Cancelar donación» va aparte, en rojo, y pide confirmación.
- La pestaña «Entrar» no salió de Stitch: se armó con los tokens.
