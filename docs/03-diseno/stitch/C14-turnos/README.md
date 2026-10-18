---
title: "C14 · Turnos · diseño en Stitch"
type: diseno
tags: [diseno, stitch, consola, turnos]
estado: vigente
actualizado: 2026-10-17
---

# C14 · Turnos · diseño en Stitch

| | |
|---|---|
| Proyecto | ACOPIO DISEÑO (`10306891818878200068`), tema «Acopio · sistema de diseño» (`assets/3694704229522762996`) |
| Pantalla | Lista `84e428c79bfe4e7984629cc552b0ec3d`, generada con `GEMINI_3_5_FLASH_LITE` |
| Exportada | 2026-10-17 |
| Archivos | [captura-lista.png](captura-lista.png) · [pantalla-lista.html](pantalla-lista.html) |
| Maqueta | [maqueta.html](maqueta.html) (<https://claude.ai/artifact/3YgcFw74EwKdbFQRaKWFrY>) |
| Aprobación | Joseph la aprobó el 2026-10-17 |
| Construida | Bloque 5 ([plan de la interfaz](../../../05-planes/2026-10-17-bloque-5-interfaz.md), tareas 7 y 8) |

## Qué muestra

La consola de jornadas en `/consola/turnos`, a la que el Operador y el Administrador llegan
desde «Más». Cubre el §6 de la
[especificación del Bloque 5](../../../superpowers/specs/2026-10-17-bloque-5-turnos-design.md).

- Pestañas «Próximas», «En curso» y «Pasadas». Cada fila lleva estado, título, fecha, lugar y
  cupos reservados de los totales, con las personas sin reserva si hubo ajuste.
- El formulario crea una o varias fechas con las mismas horas, marcadas en un calendario. Pide
  lugar, título, labor, qué llevar, cupos, perfil y requisitos, y recuerda el cierre de 12 horas.
- Solo el Administrador elige «Una entidad», que pide la entidad (solo verificadas), la
  dirección y el municipio. Un error de la API sale junto al horario.
- Al abrir una jornada: cupos, el contador de gente sin reserva, los inscritos con «Copiar» y la
  asistencia. En «Acciones», editar, cerrar o reabrir, cancelar con motivo obligatorio y borrar
  si nunca tuvo reservas.

## Diferencias

- Cabecera de consola de los [componentes compartidos](../_compartidos/README.md), con «Volver»
  debajo, y la barra con «Más» activo.
- Filas compactas como en [C22](../C22-causas/README.md), sin la barra de porcentaje ni los
  botones «Editar» y «Ver inscritos» en cada tarjeta. La fila abre la jornada.
- «Abierta» va en el tono de la marca y «Cerrada» o «Llena» en neutro. Stitch pintó «Abierta» de
  verde y «Cancelada» de rojo, colores reservados para el inventario.
- Pestañas con el segmentado de C22.
- Armadas con los tokens, sin Stitch: el formulario con el calendario, la jornada de entidad, el
  detalle con inscritos y asistencia, las acciones y la cancelación. Stitch respondió dos veces
  que había generado el formulario y el detalle, pero no devolvió las pantallas, y no aparecen
  en el proyecto.
