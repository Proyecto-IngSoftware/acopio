---
title: "C01 · Activar cuenta · diseño en Stitch"
type: diseno
tags: [diseno, stitch, acceso]
estado: vigente
actualizado: 2026-10-21
---

# C01 · Activar cuenta · diseño en Stitch

| | |
|---|---|
| Proyecto | ACOPIO DISEÑO (`10306891818878200068`), tema «Acopio Field Command» |
| Pantalla | `ddd5c11f85bc4b4ba47f5d4d41b9273f`, «C01 Activar cuenta - Consola Acopio» |
| Exportada | 2026-09-30 |
| Archivos | [captura.png](captura.png) · [pantalla.html](pantalla.html) · [maqueta.html](maqueta.html) |
| Maqueta | <https://claude.ai/artifact/MZtcsQwsak2Tsje9D5vb7C>, aprobada por Joseph el 2026-09-30 |
| Construida | [construida.png](construida.png), en Chromium a 360 × 640 |

Segunda parte de C01 (RF-IDE-003): la persona abre el enlace de invitación, ve sus datos
y define la contraseña. Sale con la cabecera de acceso de
[componentes compartidos](../_compartidos/README.md).

## Diferencias previstas al construir

- Stitch la generó en formato de escritorio aunque se pidió móvil; el código es móvil
  primero.
- Los datos de la invitación salen de `GET /api/invitaciones/:token`. Con un enlace
  vencido, usado o inexistente, la pantalla muestra el mensaje único de la API en lugar
  del formulario.
- Los errores de contraseña muestran el `mensaje` que devuelve la API (422
  `CONTRASENA_DEBIL`).
- Al activar, lleva al acceso con el nombre de usuario ya escrito.
- El pie «Respuesta Oficial Caldas 2026» que puso Stitch no va.

## Línea visual, fase 3 (2026-10-21)

El botón gira mientras activa la cuenta. Maqueta: el lienzo aprobado de la línea visual ([ADR-0022](../../../02-arquitectura/adr/ADR-0022-linea-visual-con-movimiento-e-ilustracion.md)). La `construida.png` todavía es la anterior; se rehace con los recorridos.
