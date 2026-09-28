---
title: "Diseño — índice"
type: moc
tags: [moc, diseno]
estado: vigente
actualizado: 2026-09-28
---

# Diseño — índice

| Nota | Qué guarda |
|---|---|
| [sistema-diseno.md](sistema-diseno.md) | Tokens, componentes, reglas móviles, accesibilidad |
| [flujos.md](flujos.md) | Los seis recorridos críticos, de punta a punta |
| [prompts-lovable/](prompts-lovable/) | Un archivo por pantalla, listo para pegar en Lovable |
| [prompt-video-donacion.md](prompt-video-donacion.md) | Guion y prompts del video animado: cómo donar, paso a paso |
| [api/](api/README.md) | **Contrato de la API para el frontend**: sesión, invitaciones, errores y endpoints por pantalla. La interfaz se hace con Google Stitch ([ADR-0011](../02-arquitectura/adr/ADR-0011-interfaz-con-stitch.md)) |

## Las dos reglas que gobiernan todo lo visual

**1 · El color semántico está reservado.** Rojo, ámbar, verde y morado significan
estado de existencias. Por eso la marca es teal.
Ver [ADR-0006](../02-arquitectura/adr/ADR-0006-color-semantico-reservado.md).

**2 · Móvil primero, sin excusas.** Se usa de pie, con guantes, bajo sol, con el
celular al 12 %. Cada decisión —48 px de área táctil, 16 px de piso tipográfico,
antigüedad visible en todo dato— sale de esa frase.

## Prompts escritos

[_base.md](prompts-lovable/_base.md) se pega una vez por proyecto. Después, una
pantalla por archivo: [P01](prompts-lovable/P01-portada.md) ·
[P05](prompts-lovable/P05-mapa-acopios.md) ·
[C04](prompts-lovable/C04-entrada-rapida.md) ·
[C11](prompts-lovable/C11-motor-sugerencias.md).

Las 27 pantallas restantes se redactan al llegar a su bloque, siguiendo la misma
estructura.

## Relacionado

- [Actores](../00-contexto/actores.md) — de aquí salen las condiciones de uso
- [RNF](../01-requerimientos/no-funcionales.md) — accesibilidad y rendimiento
- [ADR-0004](../02-arquitectura/adr/ADR-0004-frontend-lovable-spa.md) — por qué Vite y no Next
