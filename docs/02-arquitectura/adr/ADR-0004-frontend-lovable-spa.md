---
title: "ADR-0004 · Frontend SPA generado con Lovable"
type: adr
tags: [arquitectura, adr]
estado: vigente
adr: 4
decision: reemplazada por ADR-0009
actualizado: 2026-09-14
---

# ADR-0004 · Frontend SPA generado con Lovable

**Fecha:** 2026-08-20 · **Estado:** reemplazada por
[ADR-0009](ADR-0009-mockups-claude-design.md) el 2026-09-14 — Lovable sale; la SPA
sin render en servidor se conserva

## Contexto

El equipo usa Lovable como herramienta de diseño y generación de interfaz. Lovable
produce React + Vite + TypeScript + Tailwind + shadcn/ui.

El diseño inicial contemplaba Next.js por el render en servidor de la portada.

## Decisión

**El frontend es una SPA de React con Vite, generada con Lovable**, servida por
nginx como archivos estáticos. Sin render en servidor.

Ambas superficies —home público y consola autenticada— viven en la misma
aplicación, separadas por rutas y por guardas de sesión.

## Alternativas consideradas

**Next.js con render en servidor.** Mejor indexación y primer pintado. Descartada
porque obligaría a reescribir a mano todo lo que Lovable genera, perdiendo la razón
de usarlo.

**Dos aplicaciones separadas**, una estática para el home y una SPA para la
consola. Descartada por duplicación de tokens, componentes y configuración de
compilación, para un beneficio que el proyecto no necesita.

## Consecuencias

### A favor
- El equipo itera la interfaz en Lovable y exporta
- Una sola configuración de compilación, un solo conjunto de componentes
- La consola, que es el 80 % del trabajo, es exactamente el caso de uso de una SPA

### En contra
- **Se pierde el render en servidor.** Para una vitrina de causa eso cuesta
  indexación en buscadores
- El primer pintado depende de descargar y ejecutar JavaScript

### Mitigación

La indexación en buscadores importa menos de lo que parece aquí: **el canal real
de difusión en Colombia es WhatsApp**, y lo que WhatsApp necesita son metadatos
Open Graph correctos, no HTML renderizado en servidor.

Por tanto:

- Metadatos Open Graph y Twitter Card estáticos en `index.html`, y por ruta cuando
  aplique
- Imagen de vista previa por tipo de página
- **Criterio de verificación real:** pegar el enlace en WhatsApp muestra título,
  descripción e imagen
- Si más adelante la indexación resulta necesaria, se agrega `vite-plugin-ssg`
  solo para las rutas públicas, sin tocar la consola

### Nota sobre la capa de datos

Lovable genera llamadas a Supabase para los datos. **Se sustituyen por llamadas a
nuestra API.** Solo se conserva lo que toca `supabase.auth`, conforme a
[ADR-0001](ADR-0001-supabase-solo-auth.md).

Esta sustitución es trabajo recurrente cada vez que se regenera una pantalla en
Lovable. Conviene aislar todo acceso a datos en una carpeta `src/api/` para que la
regeneración de componentes no lo arrastre.
