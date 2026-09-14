---
title: "ADR-0006 · El color semántico está reservado"
type: adr
tags: [arquitectura, adr]
estado: vigente
adr: 6
decision: aceptada
actualizado: 2026-08-20
---

# ADR-0006 · El color semántico está reservado

**Fecha:** 2026-08-20 · **Estado:** aceptada

## Contexto

El sistema comunica estado de existencias mediante un semáforo: escaso, atención,
suficiente, saturado. Es la información que el operador lee decenas de veces al
día y de un vistazo.

La paleta habitual de una organización de ayuda humanitaria es roja —Cruz Roja— o
verde —esperanza, sostenibilidad—.

## Decisión

**Rojo, ámbar, verde y morado quedan reservados para significado de estado. La
marca no puede usarlos.**

```
rojo    #DC2626   escaso · crítico
ámbar   #D97706   atención
verde   #16A34A   suficiente
morado  #7C3AED   saturado · no recibir

marca   teal-700  #0F6E6E   primario
neutros stone     gris cálido
```

## Razón

Si el botón primario es verde, el verde deja de significar «hay suficiente» y pasa
a significar «esto es un botón». El operador pierde la lectura instantánea del
semáforo, que es precisamente lo que el sistema existe para darle.

El mismo argumento vale para el rojo: si el color de la marca es rojo, una tarjeta
en rojo deja de gritar «esto está crítico».

El costo es renunciar a la paleta obvia. El beneficio es que el estado se lee sin
pensar.

## Alternativas consideradas

**Marca roja con semáforo desplazado** —naranja, amarillo, azul— para no colisionar.
Descartada: el semáforo rojo-ámbar-verde es una convención universal, y romperla
obliga a aprender un código nuevo justo en la pantalla que más rápido debe leerse.

**Marca en escala de grises.** Coherente, pero deja la portada sin identidad.

## Consecuencias

### A favor
- El estado se lee de un vistazo, sin competencia visual
- El teal profundo tiene suficiente contraste sobre neutros cálidos para cumplir
  AAA
- La marca se distingue del montón de organizaciones rojas o verdes

### En contra
- Se renuncia a la asociación cromática con la Cruz Roja y con la iconografía
  humanitaria habitual
- El equipo tiene que resistir la tentación en cada pantalla nueva

### Regla derivada, no negociable

**El color nunca es el único portador de significado** (RNF-11).

Todo estado de semáforo lleva, además del color, un **ícono** y un **texto**.
Alrededor del 8 % de los hombres tiene alguna deficiencia en la visión del rojo y
el verde; en un sistema donde leer mal el estado significa mandar agua al lugar
equivocado, eso no es un detalle de accesibilidad sino un defecto funcional.
