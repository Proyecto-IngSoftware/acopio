---
title: "Especificaciones — índice"
type: moc
tags: [moc, spec]
estado: vigente
actualizado: 2026-10-06
---

# Especificaciones — índice

Documentos de diseño formales. Uno general y, después, uno por bloque de
construcción.

| Especificación | Alcance | Estado |
|---|---|---|
| [2026-08-20 · Diseño de Acopio](2026-08-20-acopio-design.md) | Sistema completo: alcance, arquitectura, dominio, identidad, motor, pantallas, despliegue | Aprobada |
| [2026-09-28 · Bloque 0 · Cimientos](2026-09-28-bloque-0-cimientos-design.md) | Monorepo, Docker, Prisma, identidad, catálogo | Aprobada |
| [2026-09-30 · Interfaz · Ciclo 1](2026-09-30-interfaz-ciclo-1-portada-design.md) | Flujo con Stitch, `apps/web`, tokens, componentes base y la Portada | Aprobada |
| [2026-09-30 · Interfaz · Ciclo 2](2026-09-30-interfaz-ciclo-2-acceso-design.md) | Sesión en cookie, C01 Entrar y Activar cuenta, cabeceras compartidas | Aprobada |
| [2026-09-30 · Bloque 1 · Red](2026-09-30-bloque-1-red-design.md) | Acopios, zonas, entidades, mapa, home | Aprobada · construido |
| [2026-10-01 · Bloque 2 · Inventario](2026-10-01-bloque-2-inventario-design.md) | Movimientos, saldos, umbrales, entrada rápida, captura sin conexión | Aprobada · construido |
| [2026-10-05 · Bloque 3 · Custodia](2026-10-05-bloque-3-custodia-design.md) | Donador, comprobantes con folio, factura en Garage, recepción, conciliación, seguimiento | Aprobada · construido |
| [2026-10-06 · Bloque 4 · Motor](2026-10-06-bloque-4-motor-design.md) | Necesidad, déficit, sugerencias, remisiones, recepción en zona, reporte de necesidad, simulador | Aprobada |
| Bloque 5 · Turnos | Jornadas, reservas, aforo | ⬜ pendiente |
| Bloque 6 · Extras | Bitácora enriquecida, transparencia, publicaciones | ⬜ pendiente |

## Cadena de trabajo

```
especificación  →  plan de implementación  →  código
```

Cada bloque recorre la cadena completa. La especificación general ya cubre los
siete; cada bloque necesita además la suya de detalle antes de su
[plan](../../05-planes/README.md).

## Convención de nombres

`AAAA-MM-DD-tema-design.md`. La fecha es la de aprobación, no la de última edición.
