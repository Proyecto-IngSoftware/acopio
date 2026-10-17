---
title: "Recepción en zona · diseño en Stitch"
type: diseno
tags: [diseno, stitch, consola, motor, recepcion]
estado: vigente
actualizado: 2026-10-16
---

# Recepción en zona · diseño en Stitch

| | |
|---|---|
| Proyecto | ACOPIO DISEÑO (`10306891818878200068`), tema «Acopio · sistema de diseño» (`assets/3694704229522762996`) |
| Pantallas | Lista `02d2db7a69d246fc8996880763c9422e` y recibir `c186fb43e5814c01a8119647d1cd1bad`, generadas con `GEMINI_3_5_FLASH_LITE` |
| Exportada | 2026-10-16 |
| Archivos | [captura-lista.png](captura-lista.png) · [lista.html](lista.html) · [captura-recibir.png](captura-recibir.png) · [recibir.html](recibir.html) |
| Maqueta | [maqueta.html](maqueta.html) (<https://claude.ai/artifact/6zQs3346hig6iEcbqiRLHF>), compartida con [C20](../C20-reportar/README.md) |
| Aprobación | Joseph la aprobó el 2026-10-16 |
| Construida | Pendiente |

## Qué muestra

C13 Recepción, para el Receptor, según el
[plan del ciclo 3](../../../05-planes/2026-10-16-bloque-4-interfaz-ciclo-3.md).

- En «Más», la sección «Mi zona»: «Por recibir», con el número de remisiones en camino, y una
  fila por cada zona asignada, que abre su ficha (C10).
- `/consola/recepciones`: las remisiones en tránsito hacia las zonas del Receptor y los
  despachos generales, con «Escanear el QR de la remisión».
- El escáner de C04 a pantalla completa, con otro texto, para leer el QR del documento de C12.
- `/consola/recepciones/:codigo` y `/consola/recepciones/qr/:token`: lo que debería llegar,
  las fotos, una nota opcional y «Confirmar recepción», que se habilita con la primera foto.
  En un despacho general se elige antes la zona.
- Después de confirmar, la vista «recibida» con el enlace a la ficha de la zona.
- Un aviso cuando la remisión ya no está en camino a las zonas del Receptor.

## Diferencias

- Cabecera y barra de la consola, sin la marca «Acopios» ni la barra que inventó Stitch
  (Rutas, Alertas).
- El chip rojo «Sin zona» y el ámbar «En tránsito» pasan a neutros, y las líneas pierden
  «Inventario: Bien/Poco/Escaso». Esos colores son del estado del inventario (ADR-0006).
- Sin «Escribir el código»: la API busca por QR, y la lista ya muestra todas las remisiones
  en camino.
- Las miniaturas no tienen botón para quitarlas, porque la API no borra evidencia. Se puede
  agregar otra foto, hasta 5.
- Sin Stitch, armadas con los tokens en la maqueta: la sección de «Más», la ficha con el
  botón de C20, la lista vacía, el escáner, el despacho general, «recibida» y el aviso.
