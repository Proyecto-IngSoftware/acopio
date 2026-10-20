---
title: "P7 · Voluntariado · diseño en Stitch"
type: diseno
tags: [diseno, stitch, portal, turnos]
estado: vigente
actualizado: 2026-10-20
---

# P7 · Voluntariado · diseño en Stitch

| | |
|---|---|
| Proyecto | ACOPIO DISEÑO (`10306891818878200068`), tema «Acopio · sistema de diseño» (`assets/3694704229522762996`) |
| Pantallas | Listado `9a82d0483cde4a30a41009fe31e274c7` · reservar `af8c59b6757946d48d89fad64cebd40f`, generadas con `GEMINI_3_5_FLASH_LITE` |
| Exportada | 2026-10-17 |
| Archivos | [captura-listado.png](captura-listado.png) · [pantalla-listado.html](pantalla-listado.html) · [captura-reservar.png](captura-reservar.png) · [pantalla-reservar.html](pantalla-reservar.html) |
| Maqueta | [maqueta.html](maqueta.html) (<https://claude.ai/artifact/4qBiCjCtfUUtCHo9HW63rW>) |
| Aprobación | Joseph la aprobó el 2026-10-17 |
| Vista de mapa | La maqueta del [mapa de necesidades](../P05-mapa/maqueta-necesidades.html) (<https://claude.ai/artifact/EekofY8Z5Ky2VprW6FXLe4>), aprobada por Joseph el 2026-10-20. Construida: [construida-mapa.png](construida-mapa.png) (`portal-turnos.mjs`) |
| Construida | Bloque 5 ([plan de la interfaz](../../../05-planes/2026-10-17-bloque-5-interfaz.md), tareas 3 y 4) |

## Qué muestra

El listado público de jornadas en `/voluntariado` y la reserva en `/voluntariado/:id`, según el
§6 de la [especificación del Bloque 5](../../../superpowers/specs/2026-10-17-bloque-5-turnos-design.md).

- Jornadas agrupadas por día, con filtros de lugar, día y perfil. Cada filtro abre una hoja.
- Cada tarjeta lleva título, lugar, hora y «N de M cupos reservados». Las llenas y las cerradas
  siguen en la lista con su marca, y la que tuvo ajuste manual dice «Ajustado hace 2 h».
- La reserva muestra la labor, qué llevar, los requisitos y el aviso de que puede haber gente
  sin reserva. Pide nombre, correo, teléfono opcional, la casilla del perfil cuando la jornada
  lo pide y la del consentimiento con enlace a P12.
- Un 409 por cupo agotado sale encima del botón y no borra lo escrito. Una jornada cancelada
  muestra el motivo y una cerrada por plazo lo explica; ninguna de las dos tiene formulario.

## Vista de mapa (2026-10-20)

Especificación: [mapa de necesidades](../../../superpowers/specs/2026-10-20-mapa-de-necesidades-design.md),
sección «Voluntariado en mapa». Sale de la pantalla de Stitch «Voluntariado - Mapa de Jornadas
y Reserva de Cupos».

- P7 tiene las pestañas «Lista» y «Mapa», como P5. La lista sigue siendo la vista por defecto
  y los filtros de lugar, día y perfil aplican a las dos.
- Cada lugar con coordenadas es un círculo con `groups` y, encima, la etiqueta de su jornada
  más urgente: «FALTAN N PERSONAS» si está ocupado menos de la mitad del cupo, «QUEDAN N
  CUPOS» si no, o «LLENA». Con varias jornadas suma «+N». Al tocarlo salen debajo sus
  jornadas.
- En el mapa solo salen las jornadas que aceptan reservas o están llenas. Las que no tienen
  ubicación quedan en la lista, y un aviso bajo el mapa dice cuántas son.
- Los chips «Todas», «Falta gente» y «Con cupos» cuentan jornadas, filtran mapa y lista y van
  en la URL (`estado=`).

Diferencias con Stitch: el listado aprobado el 2026-10-17 no tenía mapa, y la vista de mapa
sale de la maqueta del 2026-10-20. Cada lugar es un círculo sin nombre, como los acopios de P5;
el nombre va en el `title` del marcador y en el encabezado de sus jornadas.

## Diferencias

- Cabecera pública y barra inferior de los [componentes compartidos](../_compartidos/README.md).
  Stitch puso flecha de volver y avatar en una pantalla sin sesión.
- Sin la pastilla «Disponible». Solo se marcan las llenas y las cerradas, en tono neutro, porque
  el verde y el ámbar están reservados para el inventario.
- La tarjeta llena no lleva el botón inactivo «Cupo completo»: la tarjeta entera abre la jornada.
- El aviso de gente sin reserva suma la frase de RF-TUR-006 sobre reservas y personas presentes.
- Armadas con los tokens, sin Stitch: la hoja de filtros, el error de cupo, la jornada cancelada
  y la cerrada por plazo.
