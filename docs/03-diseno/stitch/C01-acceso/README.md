---
title: "C01 · Acceso · diseño en Stitch"
type: diseno
tags: [diseno, stitch, acceso]
estado: vigente
actualizado: 2026-09-30
---

# C01 · Acceso · diseño en Stitch

| | |
|---|---|
| Proyecto | ACOPIO DISEÑO (`10306891818878200068`), tema «Acopio Field Command» |
| Pantalla | `1edc7a6b37d84d07aa624bf77980680f`, «C01 Acceso - Consola Interna» |
| Exportada | 2026-09-30 |
| Archivos | [captura.png](captura.png) · [pantalla.html](pantalla.html) · [maqueta.html](maqueta.html) |
| Maqueta | <https://claude.ai/artifact/Sztyamh6A3wsLkhLzuLXiQ>, pendiente de aprobación |

Cubre el inicio de sesión con nombre de usuario (RF-IDE-004). Falta la segunda parte de
C01: canjear la invitación y definir la contraseña (RF-IDE-003).

## Diferencias previstas entre el diseño y lo que se construye

- La cabecera no muestra «Sincronizado», igual que en la Portada.
- El enlace «Ayuda» lleva a `#soporte`, que no existe. Se quita o se decide a dónde lleva.
- El mensaje de error solo aparece cuando el inicio de sesión falla, siempre con el mismo
  texto, y también cubre el límite de intentos (429).
