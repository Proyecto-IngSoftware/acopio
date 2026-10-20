---
title: "C18 · Códigos de barras · diseño en Stitch"
type: diseno
tags: [diseno, stitch, consola, catalogo]
estado: vigente
actualizado: 2026-10-20
---

# C18 · Códigos de barras · diseño en Stitch

| | |
|---|---|
| Proyecto | ACOPIO DISEÑO (`10306891818878200068`) |
| Pantalla | `2a7aa28834e34019ad1743728694eb83` («C18 Códigos de barras - Consola Acopio»), con el tema «Acopio · sistema de diseño» (`assets/3694704229522762996`) |
| Exportada | 2026-10-02 |
| Archivos | [captura.png](captura.png) · [pantalla.html](pantalla.html) |
| Maqueta | En la [maqueta de C7](../C07-umbrales/maqueta.html), publicada en <https://claude.ai/artifact/K8XcgLGe2sZ4LREuUSyy15> |
| Aprobación | Joseph la aprobó el 2026-10-02, con las diferencias de abajo |
| Construida | [construida.png](construida.png), en Chromium a 360 × 640 |

Stitch la entregó a 1280 px de ancho aunque se pidió móvil; el contenido ocupa la
columna central.

## Qué muestra

La cuarta pestaña de C18, para el Administrador. Arriba, el filtro «Sin revisar» o
«Todos». Cada tarjeta trae el código, la categoría con su unidad, el contenido por
presentación si lo hay, quién lo asoció y cuándo, y los botones «Cambiar» y «Marcar
revisado». Las revisadas solo ofrecen «Cambiar».

## Diferencias

Aprobadas por Joseph el 2026-10-02:

- Sin el subtítulo «Módulo central» ni la línea «Asociaciones hechas en terreno ·
  Pendientes de validación».
- «Categoría asignada» desaparece como rótulo en mayúsculas; la categoría se lee sola.
- La unidad va corta, como en el resto de la consola: «L», no «Litros (L)».
- «Revisado» en neutro, sin verde, que es del semáforo.
- La tarjeta revisada dice «Asociado por» y no «Validado por»: la API no guarda quién
  revisó.
- Sin la nota del pie sobre la certificación: describe un efecto que el sistema no tiene.
- Las revisadas dicen «Cambiar», igual que las pendientes.

## Presentaciones y códigos propuestos (2026-10-20)

Maqueta de la fase «presentaciones, códigos de barras y unidades». Pendiente de revisión; la idea sale de la [maqueta de la conversación del 20 de octubre](../../superpowers/specs/2026-10-20-presentaciones-codigos-design.md).

| | |
|---|---|
| Proyecto | ACOPIO DISEÑO (`10306891818878200068`) |
| Pantalla | `f373442b52634320a9ffa55cb5857272` («C18 Códigos de barras - Consola Acopio (Escritorio)»), editada desde `2a7aa28834e34019ad1743728694eb83` |
| Exportada | 2026-10-20 |
| Archivos | [captura-presentaciones.png](captura-presentaciones.png) (Stitch) · [pantalla-presentaciones.html](pantalla-presentaciones.html) · [render-presentaciones.png](render-presentaciones.png) (el HTML en Chromium a 360 px) |
| Aprobación | Pendiente de Joseph |

### Diferencias

Con la maqueta de la idea:

- Stitch puso el buscador y el botón «Agregar código», pero dejó las tarjetas por código de la versión anterior y reutilizó las pestañas del catálogo como filtro («Propuestos (4)», «Todos (38)»). No agrupó por categoría ni por presentación. La captura de Stitch muestra eso.
- El HTML se rehízo a mano con las mismas clases de Stitch: pestañas «Categorías» y «Códigos», filtro «Propuestos (3)» y «Todos», grupos «Agua potable» y «Arroz» con una fila por presentación, y «Agregar código» al pie. El render muestra ese resultado.
- Sin «Borrar». Los códigos no se borran (ver la especificación). Al abrir una presentación el Administrador podrá «Aprobar» y «Cambiar de presentación»; esa vista de detalle no tiene maqueta todavía.

Con la app:

- La captura de Stitch sigue en 2560 px de ancho; el render usa 360 px.
- Los números son de ejemplo. El buscador y el filtro todavía no existen en la API.

### Ajustes de la segunda ronda (2026-10-20)

- Detalle de una presentación, hecho a mano sobre el HTML de Stitch con las mismas clases: [pantalla-detalle-presentacion.html](pantalla-detalle-presentacion.html) · [render-detalle-presentacion.png](render-detalle-presentacion.png). Muestra cada código con quién lo asoció y su estado («Propuesto», «Por revisar», «Validado»), y las acciones «Aprobar» y «Cambiar de presentación». «Aprobar» no aparece en los validados. No hay «Borrar»: una nota al pie lo dice.
- Los chips de estado no usan ámbar, que es del inventario. «Propuesto» va en el teal de la marca con ícono; «Por revisar» y «Validado» en neutro con ícono, como «Sin revisar» y «Revisado» en `PestanaCodigos.tsx`.
- Botones de 48 px de alto como mínimo.
