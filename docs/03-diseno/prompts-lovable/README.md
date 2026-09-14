---
title: "Prompts para Lovable"
type: moc
tags: [moc, diseno]
estado: vigente
actualizado: 2026-08-20
---

# Prompts para Lovable

Un archivo por pantalla, listo para pegar.

## Cómo se usa

1. Pega **una vez por proyecto** el contenido de [`_base.md`](_base.md). Establece
   tokens, reglas y componentes compartidos.
2. Por cada pantalla, pega su archivo. Cada prompt asume que `_base.md` ya se cargó.
3. Exporta a GitHub.
4. **Sustituye la capa de datos**: Lovable genera llamadas a Supabase; se cambian
   por llamadas a nuestra API. Solo se conserva lo que toca `supabase.auth`
   (ver [ADR-0004](../../02-arquitectura/adr/ADR-0004-frontend-lovable-spa.md)).

Aisla todo acceso a datos en `src/api/`. Regenerar un componente en Lovable no
debe arrastrar la capa de datos.

## Estado

| Archivo | Pantalla | Estado |
|---|---|---|
| [`_base.md`](_base.md) | Contexto compartido | ✅ |
| [`P01-portada.md`](P01-portada.md) | Portada pública | ✅ |
| [`P05-mapa-acopios.md`](P05-mapa-acopios.md) | Mapa de acopios | ✅ |
| [`C04-entrada-rapida.md`](C04-entrada-rapida.md) | Entrada rápida ⭐ | ✅ |
| [`C11-motor-sugerencias.md`](C11-motor-sugerencias.md) | Motor de sugerencias ⭐ | ✅ |
| P02-P04, P06-P12 | Resto del home | pendiente |
| C01-C03, C05-C10, C12-C19 | Resto de la consola | pendiente |

**Los cuatro escritos son las pantallas críticas** y sirven de plantilla para el
resto: dos de la superficie pública, dos del núcleo operativo. El resto se redacta
al llegar a su bloque, siguiendo la misma estructura.

Lista completa de las 31 pantallas en la
[especificación](../../superpowers/specs/2026-08-20-acopio-design.md#9-superficies-y-pantallas).

## Estructura de un prompt

```markdown
# <ID> · <Nombre>
**Ruta:** /ruta · **Acceso:** público | rol
**Objetivo:** una frase.

## Contenido
qué muestra, en orden de jerarquía

## Interacciones
qué se puede hacer

## Estados
vacío · carga · error · offline

## Datos
qué endpoint alimenta qué

## Móvil
lo que cambia bajo 640 px
```

Las cuatro secciones de estados no son opcionales. Una pantalla sin estado vacío
definido lo improvisa, y lo improvisado sale mal.
