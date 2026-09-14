---
title: "Requerimientos funcionales"
type: moc
tags: [moc, requerimientos]
estado: vigente
actualizado: 2026-08-20
---

# Requerimientos funcionales

Un archivo por módulo. Numeración `RF-<MÓDULO>-<###>`, estable: **un número
asignado no se reutiliza jamás**, aunque el requerimiento se elimine. Los planes,
las pruebas y los commits los citan.

| Archivo | Prefijo | Módulo | Bloque |
|---|---|---|---|
| [identidad.md](identidad.md) | `RF-IDE` | Usuarios, invitaciones, roles, asignaciones | 0 |
| [catalogo.md](catalogo.md) | `RF-CAT` | Categorías, unidades, canasta, códigos de barras | 0 |
| [red.md](red.md) | `RF-RED` | Acopios, zonas, entidades, causas, mapa | 1 |
| [inventario.md](inventario.md) | `RF-INV` | Movimientos, saldos, umbrales, no recibir | 2 |
| [comprobantes.md](comprobantes.md) | `RF-CMP` | Carga, conciliación, folio, seguimiento | 3 |
| [motor.md](motor.md) | `RF-MOT` | Déficit, superávit, sugerencias, remisiones | 4 |
| [turnos.md](turnos.md) | `RF-TUR` | Jornadas, cupos, reservas | 5 |
| [home.md](home.md) | `RF-HOM` | Portada, directorio, transparencia, legal | 1 |

## Formato

```markdown
### RF-XXX-001 · Título
**Actor:** quién
**Prioridad:** DEBE | DEBERÍA | PODRÍA
**Descripción:** qué hace el sistema.
**Criterios de aceptación:**
- [ ] verificable, no interpretable
**Depende de:** RF-YYY-002
```

`DEBE` es lo que sin ello el módulo no existe. `DEBERÍA` es lo que se recorta si el
calendario aprieta. `PODRÍA` es lo primero que cae.

Un criterio de aceptación que no se pueda verificar mirando la pantalla o
ejecutando una prueba está mal escrito.
