---
title: "Recibir por folio · diseño en Stitch"
type: diseno
tags: [diseno, stitch, consola, custodia]
estado: vigente
actualizado: 2026-10-06
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
