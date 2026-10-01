---
title: "C16 · Matriz de acceso y selector de ubicación · maqueta"
type: diseno
tags: [diseno, stitch, consola]
estado: vigente
actualizado: 2026-10-01
---

# C16 · Matriz de acceso y selector de ubicación · maqueta

| | |
|---|---|
| Proyecto | ACOPIO DISEÑO (`10306891818878200068`), tema «Acopio Field Command» |
| Pantalla de Stitch | Ninguna. La generación se cortó por tiempo dos veces el 2026-10-01 sin dejar pantalla |
| Maqueta | [maqueta.html](maqueta.html), publicada en <https://claude.ai/artifact/SRgo8R1cQNii6EvSXAaYoP> |
| Aprobación | Joseph la aprobó el 2026-10-01 |
| Construida | [construida-360.png](construida-360.png), [construida-1280.png](construida-1280.png) y [construida-selector.png](construida-selector.png), en Chromium |

La maqueta usa los tokens del tema de Stitch, la cabecera con sesión y la barra inferior de
los [componentes compartidos](../../_compartidos/README.md). Tiene cuatro vistas: la matriz
por ubicación a 360 px, la hoja del selector de la cabecera, «Más» del Operador con la
ubicación activa y la tabla de la matriz desde 768 px.

Cubre RF-IDE-010 (selector) y RF-IDE-011 (matriz). Las decisiones de fondo están en el
[plan del ciclo 2](../../../../05-planes/2026-10-01-bloque-1-interfaz-ciclo-2.md), J-01 a J-08.

Si después se genera la pantalla en Stitch, se guardan aquí su captura y su HTML, y esta
nota anota las diferencias con la maqueta.

## Diferencias al construir

- Con el conmutador, la cabecera muestra solo el logo en un teléfono; la palabra «Acopio» vuelve desde 640 px. Con la marca completa, el nombre de la ubicación se cortaba en «Acopi…».
- El Auditor también tiene conmutador cuando tiene dos ubicaciones o más, porque la API le exige al menos una.
- La tabla de escritorio se desplaza con el teclado al recibir foco (axe lo pedía).

