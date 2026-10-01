---
title: "ADR-0016 · La captura sin conexión usa un service worker de vite-plugin-pwa"
type: adr
tags: [arquitectura, adr, web, offline]
estado: vigente
adr: 16
decision: aceptada
actualizado: 2026-10-01
---

# ADR-0016 · La captura sin conexión usa un service worker de vite-plugin-pwa

**Fecha:** 2026-10-01 · **Estado:** aceptada · **Precisa:**
[ADR-0005](ADR-0005-offline-solo-movimientos.md)

## Contexto

RF-INV-009 pide que C4 Entrada rápida funcione sin red en un teléfono donde ya se
inició sesión. Para eso la web tiene que abrir sin conexión, lo que exige un service
worker que guarde el build y responda las navegaciones. El
[Bloque 2](../../superpowers/specs/2026-10-01-bloque-2-inventario-design.md) (V-07)
limita la captura sin conexión a las entradas.

## Decisión

**Un service worker generado con `vite-plugin-pwa` guarda el build y responde
`index.html` a cualquier navegación.** Los datos que C4 necesita sin red (categorías,
«no recibir», últimos saldos y EAN escaneados) y la cola de movimientos van en
IndexedDB, fuera del service worker.

- `registerType: 'prompt'`: una versión nueva se anuncia y la web recarga cuando el
  Operador acepta, nunca a mitad de una captura.
- El service worker no guarda respuestas de `/api`. La cola sincroniza desde la página.
- Sin conexión solo se capturan entradas: nunca dejan un saldo negativo.

## Alternativas consideradas

**Service worker escrito a mano.** Sin dependencia nueva, pero hay que mantener la
lista de archivos del build, el versionado de la caché y la limpieza de versiones
viejas, que es justo lo que el plugin resuelve.

**Sin service worker, solo IndexedDB.** La cola funcionaría si la pestaña ya está
abierta, pero un Operador que abre la aplicación sin red vería un error del navegador.

## Consecuencias

### A favor

- La lista de archivos del build y el versionado los genera el plugin en cada `build`.
- La aplicación abre sin red y C4 captura igual que con conexión.

### En contra

- Dependencia nueva en la web, con Workbox por debajo.
- Un service worker mal configurado puede servir una versión vieja. `registerType:
  'prompt'` y una prueba del flujo de actualización en el cierre lo mitigan.
- En producción exige HTTPS, que ya está previsto con Traefik.
