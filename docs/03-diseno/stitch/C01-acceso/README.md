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

## Diferencias con la pantalla de Stitch

Ya aplicadas en la maqueta, a pedido de Joseph el 2026-09-30:

- Sin el indicador «Sincronizado» en la cabecera, igual que en la Portada.
- Sin el enlace «Ayuda», que llevaba a `#soporte` y no existe.

Al construir:

- El mensaje de error solo aparece cuando el inicio de sesión falla o se supera el
  límite de intentos (429), siempre con el mismo texto.
- La pantalla de Stitch usa algunos colores genéricos de Tailwind (`stone`, `emerald`) y
  dos hexadecimales sueltos. En `apps/web` se pasan a los tokens de `packages/ui-tokens`.
