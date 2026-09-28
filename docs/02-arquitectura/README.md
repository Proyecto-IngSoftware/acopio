---
title: "Arquitectura — índice"
type: moc
tags: [moc, arquitectura]
estado: vigente
actualizado: 2026-09-28
---

# Arquitectura — índice

| Nota | Qué responde |
|---|---|
| [vista-general.md](vista-general.md) | Cómo encajan las piezas: C4, contenedores, módulos, dependencias |
| [modelo-datos.md](modelo-datos.md) | Qué tablas hay, qué invariantes se hacen cumplir y dónde |
| [adr/](adr/) | Por qué se decidió cada cosa |

## Decisiones registradas

| ADR | Decisión |
|---|---|
| [0001](adr/ADR-0001-supabase-solo-auth.md) | Supabase solo para autenticación |
| [0002](adr/ADR-0002-saldo-derivado.md) | El saldo se deriva, no se guarda |
| [0003](adr/ADR-0003-rol-global-alcance-multiple.md) | Rol global, alcance múltiple |
| [0004](adr/ADR-0004-frontend-lovable-spa.md) | Frontend SPA generado con Lovable · reemplazada por 0009 |
| [0005](adr/ADR-0005-offline-solo-movimientos.md) | Offline limitado a movimientos |
| [0006](adr/ADR-0006-color-semantico-reservado.md) | El color semántico está reservado |
| [0007](adr/ADR-0007-donador-excepcion-rol.md) | El Donador, excepción controlada al modelo de roles |
| [0008](adr/ADR-0008-arquitectura-stack-inicial.md) | Arquitectura y selección tecnológica inicial — el «ADR-001» del curso |
| [0009](adr/ADR-0009-mockups-claude-design.md) | Mockups con Claude Design, interfaz implementada por el equipo · reemplazada por 0011 |
| [0010](adr/ADR-0010-varias-emergencias-activas.md) | Varias emergencias activas; el acopio no pertenece a ninguna |
| [0011](adr/ADR-0011-interfaz-con-stitch.md) | Interfaz diseñada con Google Stitch |
| [0012](adr/ADR-0012-almacenamiento-garage.md) | Almacenamiento de objetos con Garage, en lugar de MinIO |

## La decisión de la que cuelga todo lo demás

[ADR-0002](adr/ADR-0002-saldo-derivado.md). El saldo derivado de movimientos
inmutables es lo que hace posible la explicabilidad, la auditoría y la
sincronización sin conflictos. [ADR-0005](adr/ADR-0005-offline-solo-movimientos.md)
depende directamente de ella.

## Regla

**Las decisiones aceptadas no se editan.** Si una cambia, se escribe otra que la
reemplace y la anterior conserva su historia. Plantilla en
[plantillas/plantilla-adr.md](../plantillas/plantilla-adr.md).

## Relacionado

- [Especificación de diseño](../superpowers/specs/2026-08-20-acopio-design.md)
- [Despliegue](../06-operacion/despliegue.md)
- [Tablero de ADR](../tableros/tablero-adr.base)
