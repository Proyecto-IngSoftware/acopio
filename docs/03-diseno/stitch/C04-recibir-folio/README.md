---
title: "Recibir por folio · diseño en Stitch"
type: diseno
tags: [diseno, stitch, consola, custodia]
estado: vigente
actualizado: 2026-10-30
---

# Recibir por folio · diseño en Stitch

| | |
|---|---|
| Proyecto | ACOPIO DISEÑO (`10306891818878200068`) |
| Pantalla | `cdca04ba49e6404f9b352cf0856ffdd0` («C4b Recibir donación con folio - Consola Acopio»), con el tema «Acopio · sistema de diseño» (`assets/3694704229522762996`) |
| Exportada | 2026-10-06 |
| Archivos | [captura.png](captura.png) · [pantalla.html](pantalla.html) |
| Maqueta | En la [maqueta del ciclo 2](../C08-comprobantes/maqueta.html) (<https://claude.ai/artifact/PHHhK2wyZjCj8bJZ1P3QRJ>) |
| Aprobación | Joseph la aprobó el 2026-10-06 |
| Construida | [construida-buscar.png](construida-buscar.png) · [construida.png](construida.png) · [construida-hecho.png](construida-hecho.png), en Chromium a 360 × 640 |

## Qué muestra

`/consola/acopios/:id/recibir`, desde la tarjeta «Recibir por folio» de C4. Solo el Operador.

1. Buscar: el folio escrito o leído del QR.
2. Confirmar: cada línea con lo declarado y un control − / + con lo que llegó. Si llega menos,
   pregunta qué pasó; en cero queda «No llegó». Las perecederas sin fecha piden el vencimiento.
   Avisa si el folio era de otro acopio y qué categorías no recibe este.
3. Hecho: «Recibido», con las entradas creadas, «Recibir otro folio» y la vuelta a C4.

## Diferencias

- Stitch marcó la diferencia en ámbar («Poco −1 kg») y lo completo en verde («Bien»). Esos
  colores son del semáforo (ADR-0006): la diferencia y «No llegó» van en neutro con ícono.
- La cabecera es la de la consola, con volver y el avatar.
- Las vistas de buscar y de «Recibido» no salieron de Stitch; se armaron con los tokens.
- El total del botón cuenta las líneas con cantidad mayor que cero.
- Sin red, la pantalla muestra `NecesitaRed` con la indicación de registrar en C4.

## Códigos propuestos en la recepción (2026-10-20)

Pendiente de revisión por Joseph. Parte de la [maqueta de la idea](../../../superpowers/specs/2026-10-20-presentaciones-codigos-design.md).

| | |
|---|---|
| Proyecto | ACOPIO DISEÑO (`10306891818878200068`) |
| Pantalla | `cdca04ba49e6404f9b352cf0856ffdd0`, editada |
| Exportada | 2026-10-20 |
| Archivos | [captura-presentaciones.jpg](captura-presentaciones.jpg) (Stitch) · [pantalla-presentaciones.html](pantalla-presentaciones.html) · [render-presentaciones.png](render-presentaciones.png) (el HTML en Chromium a 360 px, página completa) |
| Aprobación | Pendiente de Joseph |

### Diferencias

- La captura de Stitch salió en baja resolución (487 px) y puede estar desactualizada; el render del HTML es la referencia.
- La línea «Agua potable» trae el chip «Código propuesto», lo que dijo el donador, «Declaradas: 24 · Recibidas: 24» y los botones «Corregir» y «Es correcto». «Arroz · Bolsa 500 g» lleva el chip «Validado».

### Ajustes de la segunda ronda (2026-10-20)

- El botón final dice «Registrar recepción (2 entradas)», igual que el real en `RecibirFolio.tsx` (`Registrar recepción (N entradas)`). La idea decía «Terminar recepción»; se queda el texto de la app.
- Los chips «Código propuesto» y «Validado» van en neutro con ícono, sin ámbar, como «Sin revisar» y «Revisado» en `PestanaCodigos.tsx`.
- «Corregir» y «Es correcto» tienen 48 px de alto como mínimo. «Declaradas» y «Recibidas» suben a 14 px.
- Se quitó una tarjeta duplicada que Stitch había dejado arriba y se puso una de folio simple.
- Vista «Corregir», hecha a mano como hoja inferior: [pantalla-corregir.html](pantalla-corregir.html) · [render-corregir.png](render-corregir.png). Trae buscador arriba y las presentaciones agrupadas por categoría, con una elegida. Se guarda con «Guardar corrección».

## Línea visual, fase 3 (2026-10-21)

Al registrar, el círculo con check pasa a ser el sello animado «Donación recibida». Los botones «−» inhabilitados van en gris sólido. Maqueta: el lienzo aprobado de la línea visual ([ADR-0022](../../../02-arquitectura/adr/ADR-0022-linea-visual-con-movimiento-e-ilustracion.md)). La `construida.png` todavía es la anterior; se rehace con los recorridos.
