---
title: "ADR-0009 · Mockups con Claude Design, interfaz implementada por el equipo"
type: adr
tags: [arquitectura, adr, diseno]
estado: reemplazada
adr: 9
decision: reemplazada por ADR-0011
actualizado: 2026-09-28
---

# ADR-0009 · Mockups con Claude Design, interfaz implementada por el equipo

**Fecha:** 2026-09-14 · **Estado:** reemplazada por [ADR-0011](ADR-0011-interfaz-con-stitch.md) el 2026-09-28 · **Reemplaza a:**
[ADR-0004](ADR-0004-frontend-lovable-spa.md)

## Contexto

[ADR-0004](ADR-0004-frontend-lovable-spa.md) fijó el 2026-08-20 un frontend SPA de
React con Vite **generado con Lovable**. En la práctica el equipo pasó a diseñar con
**Claude Design**: el lienzo base —portada, mapa de 33 pantallas y seis pantallas
clave— existe desde el 2026-09-13 en [canvas-base/](../../03-diseno/canvas-base/).

Claude Design produce mockups en un lienzo editable, con un consumo de tokens mucho
menor que regenerar pantallas en Lovable, y su resultado se traslada directo a
componentes con Tailwind y TypeScript. Lovable, en cambio, generaba llamadas a
Supabase para los datos que había que sustituir por llamadas a la API cada vez que
se regeneraba una pantalla (nota de ADR-0004).

## Decisión

**Las pantallas se diseñan como mockups en Claude Design y el equipo las implementa a
mano en React con Vite, TypeScript y Tailwind.** Ningún generador de código entra en
el camino entre el diseño y el repositorio.

De ADR-0004 **se conserva todo lo que no depende de Lovable**:

- SPA sin render en servidor, servida por nginx como archivos estáticos
- Portal público y consola en la misma aplicación, separados por rutas y guardas de
  sesión
- Metadatos Open Graph para WhatsApp como mitigación de la indexación, con el mismo
  criterio de verificación

## Alternativas consideradas

**Seguir con Lovable.** Descartada: cada iteración de una pantalla consume muchos
tokens, obliga a sustituir de nuevo la capa de datos de Supabase, y entrega código
que el equipo no escribió y aun así tiene que revisar y mantener.

**Programar la interfaz directo, sin mockups.** Descartada: se pierde la revisión
visual con el equipo antes de programar. [RNF-01](../../01-requerimientos/no-funcionales.md)
y RNF-03 —área táctil, contraste, legibilidad bajo sol— se revisan mejor sobre una
pantalla dibujada que sobre código a medio hacer.

## Consecuencias

### A favor
- El cliente habla solo con nuestra API y con `supabase.auth`, desde el primer día:
  desaparece la sustitución recurrente de la capa de datos
- Todo el código de interfaz lo escribe el equipo y se revisa en pull requests
- Los mockups son rápidos y baratos de iterar, y los tokens de diseño
  ([sistema de diseño](../../03-diseno/sistema-diseno.md)) se aplican desde el
  lienzo

### En contra
- **Implementar cada pantalla a mano cuesta más horas** que exportarla de un
  generador. Se compensa con componentes reutilizables desde las primeras pantallas
- La fidelidad entre mockup y código depende de disciplina: cada pantalla se revisa
  contra su lienzo antes de cerrarse
- Claude Design está en vista previa. Los lienzos se guardan como archivos en el
  repositorio ([canvas-base/](../../03-diseno/canvas-base/)), así que el diseño no se
  pierde si la herramienta cambia

### Efecto sobre otras decisiones
- [ADR-0001](ADR-0001-supabase-solo-auth.md) sigue vigente. Uno de sus argumentos
  contra la autenticación propia —conservar las pantallas de acceso de Lovable— deja
  de aplicar, pero los demás se mantienen: recuperación de contraseña, verificación
  de correo y rotación de sesiones siguen siendo trabajo conocido y sin aporte
  académico
- La carpeta `prompts-lovable/` queda como referencia del contenido de cada pantalla,
  no como herramienta de generación. *(Se borró el 2026-10-06; los diseños viven en
  [03-diseno/stitch/](../../03-diseno/stitch/README.md).)*
