---
title: "ADR-0007 · El Donador es una excepción controlada al modelo de roles"
type: adr
tags: [arquitectura, adr]
estado: vigente
adr: 7
decision: aceptada
actualizado: 2026-09-12
---

# ADR-0007 · El Donador es una excepción controlada al modelo de roles

**Fecha:** 2026-09-12 · **Estado:** aceptada

## Contexto

[ADR-0003](ADR-0003-rol-global-alcance-multiple.md) fijó, el 2026-08-20, que «nadie
se auto-registra ni modifica su propio alcance» y listó el rol como `ADMIN |
OPERADOR | AUDITOR | RECEPTOR`. Esa decisión sigue vigente para esos cuatro roles:
el rol es global por usuario, el alcance es múltiple, y solo el administrador crea
accesos internos.

El 2026-09-12 el equipo decidió (P-016, P-017) que cualquier persona pueda
registrarse sola como **Donador** para preparar una donación con seguimiento —sin
eso, un folio sin cuenta detrás se pierde y nadie tiene dónde recuperarlo. Esa
persona nunca entra a la consola ni gestiona una ubicación: solo elige a qué
acopio entregar, en cada donación.

ADR-0003 no se edita —una decisión aceptada no se reescribe—, pero su frase «nadie
se auto-registra» y su enum quedaron incompletos frente a esta pieza nueva. Este
ADR no la revierte: la acota.

## Decisión

**El Donador es una quinta entrada del rol, con una sola excepción a cada regla de
ADR-0003 que le aplicaba, y ninguna otra.**

```
usuario
  rol  ADMIN | OPERADOR | AUDITOR | RECEPTOR | DONADOR
```

| Regla de ADR-0003 | Para los 4 roles internos | Para Donador |
|---|---|---|
| Quién crea la cuenta | El Administrador, por invitación | La propia persona, `signUp` público (RF-IDE-013) |
| Alcance | Una o varias ubicaciones fijas, asignadas | Ninguna fija — elige acopio en cada donación |
| Inicio de sesión | `username` | `correo` |
| Filas en `usuario_asignacion` | Una por ubicación asignada | Ninguna |

**Todo lo demás de ADR-0003 sigue exactamente igual**: el rol sigue siendo global
por usuario, no por asignación; las autorizaciones de los cuatro roles internos
siguen sin cachearse en el token; Supabase Auth sigue emitiendo el token y nada
más ([ADR-0001](ADR-0001-supabase-solo-auth.md)).

## Por qué no una tabla aparte

Una tabla `donador` separada de `usuario` evitaría tocar el enum, pero duplicaría
`RF-CMP-008` (historial), la autenticación y el guard de sesión, para un caso que
solo difiere en cuatro columnas. El costo de una fila más en un `CHECK` es menor
que el de un segundo sistema de sesión.

## Consecuencias

### A favor
- Un solo guard de autorización, un solo flujo de sesión, para los cinco roles
- La excepción queda escrita una vez, en un lugar, en vez de repetida como
  comentario en cada archivo que toca `usuario.rol`

### En contra
- El guard de RF-IDE-005 necesita una excepción explícita para el endpoint que crea
  la fila de un Donador recién registrado (RF-IDE-013) — es la única grieta
  controlada en «toda autorización se resuelve contra `public.usuario`»

### Volumen de usuarios

ADR-0001 asumió «pocas decenas» de usuarios de Supabase Auth, pensando solo en los
cuatro roles internos. Con auto-registro público, el número de Donadores puede
crecer mucho más — sigue sin costo mientras quepa en el plan gratuito de Supabase,
pero es un supuesto a vigilar, no una garantía. Ver
[pendientes.md](../../01-requerimientos/pendientes.md), P-019.
