---
title: "Confirmar correo del Donador · diseño en Stitch"
type: diseno
tags: [diseno, stitch, portal, donador]
estado: vigente
actualizado: 2026-10-06
---

# Confirmar correo del Donador · diseño en Stitch

| | |
|---|---|
| Proyecto | ACOPIO DISEÑO (`10306891818878200068`) |
| Pantalla | `826b7e35bd5a460e8b8574cdffcfcae0` |
| Exportada | 2026-10-06 |
| Archivos | [captura.png](captura.png) · [pantalla.html](pantalla.html) |
| Maqueta | En la [maqueta del ciclo 1](../P13-mi-cuenta/maqueta.html) |
| Aprobación | Joseph la aprobó el 2026-10-06 |

## Qué muestra

Se abre desde el enlace del correo (`/donador/confirmar/:token`). Si el enlace sirve, muestra
el correo, el nombre editable y los dos campos de contraseña; «Guardar y entrar» activa la
cuenta e inicia la sesión. Si el enlace no existe, ya se usó o pasaron sus 48 horas, muestra el
error y lleva a crear la cuenta otra vez.

## Diferencias

- «Correo verificado» pasa de verde a neutro. En la maqueta el correo va dentro del texto y
  no en una tarjeta aparte.
- El error dice 48 horas; Stitch puso 24.
- Sin el pie de «Plataforma oficial…».
