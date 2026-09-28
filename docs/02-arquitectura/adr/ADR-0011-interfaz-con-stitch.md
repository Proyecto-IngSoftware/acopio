---
title: "ADR-0011 · Interfaz diseñada con Google Stitch"
type: adr
tags: [arquitectura, adr, diseno]
estado: vigente
adr: 11
decision: aceptada
actualizado: 2026-09-28
---

# ADR-0011 · Interfaz diseñada con Google Stitch

**Fecha:** 2026-09-28 · **Estado:** aceptada · **Reemplaza a:**
[ADR-0009](ADR-0009-mockups-claude-design.md)

## Contexto

[ADR-0009](ADR-0009-mockups-claude-design.md) fijó el 2026-09-14 que las pantallas se
diseñaban en Claude Design y el equipo las programaba a mano, sin ningún generador de
código entre el diseño y el repositorio.

El 2026-09-28 se decidió que el desarrollo del frontend se trabaja con **Google
Stitch**, que genera diseños de pantalla y también su código de interfaz (HTML con
Tailwind). Ese mismo día quedó terminado el backend del Bloque 0, con su contrato
OpenAPI publicado en [docs/03-diseno/api/](../../03-diseno/api/).

## Decisión

**Las pantallas se diseñan en Google Stitch. El código que genera es el punto de
partida de cada pantalla, que el equipo adapta a componentes de React con Vite,
TypeScript y Tailwind dentro de `apps/web`.**

Lo que el frontend respeta, venga de donde venga el código:

- **Los datos salen solo de nuestra API**, según el
  [contrato OpenAPI](../../03-diseno/api/openapi.json). Nada de datos de ejemplo
  incrustados que después haya que sustituir
- **Los colores salen de `packages/ui-tokens`.** CI rechaza colores hexadecimales en
  `apps/web` ([ADR-0006](ADR-0006-color-semantico-reservado.md)): el código de Stitch
  se pasa a tokens antes de entrar al repositorio
- **Móvil primero y accesible** ([RNF-01](../../01-requerimientos/no-funcionales.md),
  RNF-03, RNF-11): cada pantalla se revisa en 360 × 640 px y con axe-core
- La autenticación pasa por la interfaz `ClienteAuth` (Bloque 0, D-06), nunca por
  llamadas sueltas en las pantallas

De ADR-0009 se conserva: SPA sin render en servidor, portal público y consola en la
misma aplicación, y metadatos Open Graph para WhatsApp.

## Alternativas consideradas

**Seguir con Claude Design y programar a mano.** Descartada por decisión del equipo:
Stitch entrega diseño y código en el mismo paso, y el tiempo que ahorra va a las
pantallas que más importan.

**Usar el código de Stitch tal cual, sin adaptarlo.** Descartada: traería colores
escritos a mano y datos de ejemplo, y rompería las reglas de arriba. Es la misma
razón por la que salió Lovable ([ADR-0004](ADR-0004-frontend-lovable-spa.md)).

## Consecuencias

### A favor
- Diseño y primer código de cada pantalla en un solo paso
- El backend ya está listo y documentado: el frontend empieza sobre un contrato
  estable, no sobre suposiciones

### En contra
- **El código generado hay que revisarlo y adaptarlo** a tokens, componentes y
  contrato. Sin esa disciplina vuelve el problema de Lovable
- Dependencia de una herramienta externa. Los diseños de cada pantalla se guardan en
  el repositorio, igual que se hizo con los lienzos de Claude Design

### Efecto sobre otras decisiones
- Los lienzos de [canvas-base/](../../03-diseno/canvas-base/) quedan como referencia
  de contenido y de sistema visual
- El detalle del flujo de trabajo —cómo se exporta desde Stitch y dónde se guardan los
  diseños— se fija en la especificación del bloque de interfaz
