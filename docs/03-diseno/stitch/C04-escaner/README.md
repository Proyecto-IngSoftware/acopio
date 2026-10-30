---
title: "C4 · Escáner y código nuevo · maqueta"
type: diseno
tags: [diseno, stitch, consola, inventario]
estado: vigente
actualizado: 2026-10-30
---

# C4 · Escáner y código nuevo · maqueta

| | |
|---|---|
| Proyecto | ACOPIO DISEÑO (`10306891818878200068`) |
| Pantallas de Stitch | Ninguna. «C4 Escáner» y «C4 Código nuevo» se cortaron por tiempo el 2026-10-02 y no aparecieron en el proyecto |
| Maqueta | En la [maqueta de C7](../C07-umbrales/maqueta.html), publicada en <https://claude.ai/artifact/K8XcgLGe2sZ4LREuUSyy15> |
| Aprobación | Joseph la aprobó el 2026-10-02 |
| Construida | [construida.png](construida.png), con la cámara falsa de Chromium a 360 × 640 |

El botón «Escanear» está en el buscador de categoría que comparten C4, C5 y C6.

- La cámara se abre a pantalla completa, con «Cerrar» y «Buscar por nombre».
- Un código conocido llena la categoría. Si trae contenido, C4 cuenta presentaciones
  («12 × 0,6 L = 7,2 L») y deja volver a escribir en la unidad base. En C5 y C6 solo
  llena la categoría.
- Un código nuevo se asocia a una categoría en una hoja inferior, con contenido
  opcional, y queda sin revisar para el Administrador (C18).
- Sin permiso de cámara o sin red, un aviso neutro y la búsqueda por nombre sigue igual.
  Sin red no se aprenden códigos.

## Código nuevo y Nueva presentación (2026-10-20)

Pendiente de revisión por Joseph. Las dos hojas parten de la [maqueta de la idea](../../../superpowers/specs/2026-10-20-presentaciones-codigos-design.md).

| | |
|---|---|
| Proyecto | ACOPIO DISEÑO (`10306891818878200068`) |
| Código nuevo | `9622e2a1ac594a77806de2e00ced1ba3` («C4 Código nuevo - Consola Acopio»), editada. Archivos: [captura-codigo-nuevo.png](captura-codigo-nuevo.png) · [pantalla-codigo-nuevo.html](pantalla-codigo-nuevo.html) · [render-codigo-nuevo.png](render-codigo-nuevo.png) |
| Nueva presentación | `40e6abc5e30040beb11dfc5701771a14` («Nueva presentación - Consola Acopio»), generada con el tema «Acopio · sistema de diseño». Archivos: [captura-nueva-presentacion.png](captura-nueva-presentacion.png) · [pantalla-nueva-presentacion.html](pantalla-nueva-presentacion.html) |
| Exportada | 2026-10-20 |
| Aprobación | Pendiente de Joseph |

### Diferencias

- Código nuevo: la edición de Stitch no llegó al HTML ni a la captura exportados (siguen mostrando la hoja vieja con «Cada paquete trae»). Se aplicó a mano en el HTML lo que Stitch devolvió, y el render sale de ese HTML. La lista de presentaciones es de radios, con «Nueva presentación» como botón secundario y «Asociar y seguir» como primario.
- Código nuevo: el HTML a mano no repite la etiqueta «Predeterminado» ni la nota del administrador que Stitch había añadido.

### Ajustes de la segunda ronda (2026-10-20)

- «Nueva presentación» pasa a ser una hoja inferior sobre el flujo del escáner, como «Código nuevo». Stitch la había dado como pantalla completa ([pantalla-nueva-presentacion.html](pantalla-nueva-presentacion.html), se conserva como salida original). Las hojas se armaron a mano sobre el HTML de «Código nuevo», con clases de token:
  - Paquete: [pantalla-nueva-presentacion-paquete.html](pantalla-nueva-presentacion-paquete.html) · [render](render-nueva-presentacion-paquete.png)
  - Suelta, agua (ml o L, tope 50 L): [pantalla-nueva-presentacion-suelta-agua.html](pantalla-nueva-presentacion-suelta-agua.html) · [render](render-nueva-presentacion-suelta-agua.png)
  - Suelta, arroz (g o kg, tope 50 kg): [pantalla-nueva-presentacion-suelta-arroz.html](pantalla-nueva-presentacion-suelta-arroz.html) · [render](render-nueva-presentacion-suelta-arroz.png)
- El selector «Suelta | Paquete» y el selector de unidad tienen 48 px de alto. Se quitaron «unidades» y «Elemento base seleccionado» que Stitch había añadido, y el verde propio de Stitch: el botón usa el teal de los tokens.

### Diferencias al construir (2026-10-20)

- El buscador de categoría dice «Busca: arroz…» y no el texto largo de la maqueta, para caber
  entero a 360 px junto a «Escanear». En la hoja «Código nuevo» el campo conserva «Busca: arroz,
  pañal, agua…».
- La vista de la cámara tiene una acción más, «Escribir el número», para el Operador y el
  Administrador. No está en la maqueta aprobada. El Donador no la ve.
- «Código nuevo» no preselecciona ninguna presentación; la maqueta marcaba la primera.
- «Corregir el código» reutiliza «Código nuevo» y se abre sobre la categoría y la presentación
  del código propuesto.

## Línea visual, fase 3 (2026-10-21)

Los botones que esperan una respuesta giran mientras tanto y lo inhabilitado va en gris sólido. Maqueta: el lienzo aprobado de la línea visual ([ADR-0022](../../../02-arquitectura/adr/ADR-0022-linea-visual-con-movimiento-e-ilustracion.md)). La `construida.png` todavía es la anterior; se rehace con los recorridos.
