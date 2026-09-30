---
title: "ADR-0013 · La estética sale del diseño de Stitch"
type: adr
tags: [arquitectura, adr, diseno]
estado: vigente
adr: 13
decision: aceptada
actualizado: 2026-09-30
---

# ADR-0013 · La estética sale del diseño de Stitch

**Fecha:** 2026-09-30 · **Estado:** aceptada · **Modifica:**
[ADR-0006](ADR-0006-color-semantico-reservado.md) en la paleta; conserva su regla de
fondo

## Contexto

[ADR-0011](ADR-0011-interfaz-con-stitch.md) llevó el diseño de pantallas a Google
Stitch. El proyecto «ACOPIO DISEÑO» ya tenía un tema propio, «Acopio Field Command»:
verde petróleo `#085046` como marca, superficies frías y un rojo coral para lo
urgente. La bóveda, en cambio, fijaba un teal `#0F6E6E` con neutros cálidos
([sistema-diseno.md](../../03-diseno/sistema-diseno.md) y ADR-0006).

El 2026-09-30 se probó la Portada con la paleta de la bóveda, primero en Stitch y luego
en una maqueta. No convenció: el diseño de Stitch resolvía mejor el color, la jerarquía
y la experiencia de uso. Joseph decidió quedarse con Stitch y alinear la bóveda a él.

## Decisión

**El tema de Stitch «Acopio Field Command» es la referencia de color, tipografía y
forma. `sistema-diseno.md` y `packages/ui-tokens` se escriben a partir de él, con los
mismos nombres de token que usa Stitch.**

- Marca: `#085046` (`primary-container`), con `#003730` (`primary`) para la franja
  oscura y los botones de mayor peso.
- Superficies: la escala `surface` de Stitch, de `#ffffff` a `#dae2fd`, sobre fondo
  `#faf8ff`. Texto `#131b2e`.
- Rojo coral `#d9381e` (`secondary-container`) para lo que no se debe traer y para
  acciones destructivas.
- Los tokens conservan los nombres de Stitch (`primary-container`, `surface-container-low`,
  `on-surface-variant`...). Así una pantalla nueva de Stitch pasa a código cambiando
  poco más que la estructura.

De ADR-0006 se conserva la regla de fondo: **los colores de estado significan estado**.
El verde de éxito, el ámbar y el rojo de error no decoran botones, enlaces ni fondos, y
**el color nunca es el único portador de significado**: todo estado lleva ícono y texto.

La marca verde petróleo no choca con el verde de «Suficiente» porque son tonos
distintos: uno es oscuro y apagado, el otro es un verde claro y saturado que solo
aparece en distintivos de estado.

## Alternativas consideradas

**Mantener la paleta de la bóveda y corregir Stitch.** Se probó el mismo día, aplicando
un tema nuevo a la Portada en Stitch y montando una maqueta con los tokens de la bóveda.
Se descartó: perdía lo que el diseño original ya tenía resuelto.

**Mezclar**: la marca de Stitch con el semáforo de la bóveda (morado para saturado,
nombres Escaso, Poco, Bien). Se descartó para no tener dos vocabularios visuales. La
escala de estados se define sobre la de Stitch (ver abajo).

## Consecuencias

### A favor
- Una sola estética, la que ya se ve en las catorce pantallas de Stitch
- Pasar de Stitch a código es casi mecánico: mismos nombres de color

### En contra
- Se reescriben las secciones de color, tipografía y forma de `sistema-diseno.md`
- El rojo coral aparece en acciones destructivas además de en estados. Se acepta porque
  en ambos casos significa «detente»
- Las superficies frías y levemente azuladas dejan atrás los neutros cálidos que la
  bóveda justificaba para el sol directo. El contraste de texto se mantiene por encima
  de 7:1

### Pendiente

La escala de estados del inventario. Stitch usa hoy «Crítico» y «Urgente» con el mismo
color, y la bóveda tenía otra escala. La propuesta está en
[sistema-diseno.md §2](../../03-diseno/sistema-diseno.md#escala-de-estados-propuesta-por-aprobar)
y espera la decisión de Joseph. No bloquea el primer ciclo de la interfaz, que no
muestra estados de inventario.
