---
title: "Especificaciones — índice"
type: moc
tags: [moc, spec]
estado: vigente
actualizado: 2026-09-30
---

# Especificaciones — índice

Documentos de diseño formales. Uno general y, después, uno por bloque de
construcción.

| Especificación | Alcance | Estado |
|---|---|---|
| [2026-08-20 · Diseño de Acopio](2026-08-20-acopio-design.md) | Sistema completo: alcance, arquitectura, dominio, identidad, motor, pantallas, despliegue | Aprobada |
| [2026-09-28 · Bloque 0 · Cimientos](2026-09-28-bloque-0-cimientos-design.md) | Monorepo, Docker, Prisma, identidad, catálogo | Aprobada |
| [2026-09-30 · Interfaz · Ciclo 1](2026-09-30-interfaz-ciclo-1-portada-design.md) | Flujo con Stitch, `apps/web`, tokens, componentes base y la Portada | Aprobada |
| [2026-09-30 · Interfaz · Ciclo 2](2026-09-30-interfaz-ciclo-2-acceso-design.md) | Sesión en cookie, C01 Entrar y Activar cuenta, cabeceras compartidas | Propuesta |
| Bloque 1 · Red | Acopios, zonas, entidades, mapa, home | ⬜ pendiente |
| Bloque 2 · Inventario | Movimientos, saldos, umbrales, entrada rápida | ⬜ pendiente |
| Bloque 3 · Custodia | Comprobantes, conciliación, folios | ⬜ pendiente |
| Bloque 4 · Motor | Déficit, sugerencias, remisiones | ⬜ pendiente |
| Bloque 5 · Turnos | Jornadas, reservas, aforo | ⬜ pendiente |
| Bloque 6 · Extras | Offline, bitácora, transparencia | ⬜ pendiente |

## Cadena de trabajo

```
especificación  →  plan de implementación  →  código
```

Cada bloque recorre la cadena completa. La especificación general ya cubre los
siete; cada bloque necesita además la suya de detalle antes de su
[plan](../../05-planes/README.md).

## Convención de nombres

`AAAA-MM-DD-tema-design.md`. La fecha es la de aprobación, no la de última edición.
