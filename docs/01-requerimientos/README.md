---
title: "Requerimientos — índice"
type: moc
tags: [moc, requerimientos]
estado: vigente
actualizado: 2026-09-28
---

# Requerimientos — índice

La carpeta que más se mueve. Se revisa **cada semana**.

| Nota | Qué guarda |
|---|---|
| [funcionales/](funcionales/) | 60 requerimientos `RF` numerados, un archivo por módulo |
| [no-funcionales.md](no-funcionales.md) | 13 `RNF`, cada uno con su forma de verificación |
| [historias/](historias/) | Historias de usuario, complemento de los `RF` |
| [pendientes.md](pendientes.md) | **Bandeja de entrada.** Todo lo nuevo aterriza aquí |
| [catalogo-inicial.md](catalogo-inicial.md) | Las 39 categorías del *seed* y la primera canasta estándar |

## Funcionales por módulo

| Archivo | Prefijo | Bloque |
|---|---|---|
| [funcionales/identidad.md](funcionales/identidad.md) | `RF-IDE` | 0 |
| [funcionales/catalogo.md](funcionales/catalogo.md) | `RF-CAT` | 0 |
| [funcionales/red.md](funcionales/red.md) | `RF-RED` | 1 |
| [funcionales/home.md](funcionales/home.md) | `RF-HOM` | 1 |
| [funcionales/inventario.md](funcionales/inventario.md) | `RF-INV` | 2 |
| [funcionales/comprobantes.md](funcionales/comprobantes.md) | `RF-CMP` | 3 |
| [funcionales/motor.md](funcionales/motor.md) | `RF-MOT` | 4 |
| [funcionales/turnos.md](funcionales/turnos.md) | `RF-TUR` | 5 |

## Regla de numeración

Un número asignado **no se reutiliza jamás**, aunque el requerimiento se elimine.
Los planes, las pruebas y los commits los citan: reciclar un número reescribe la
historia de otra cosa.

## Ritual semanal

Vaciar [pendientes.md](pendientes.md). Cada entrada sale por una de cuatro puertas:
requerimiento formal, [backlog](../99-futuro/backlog.md),
[fuera de alcance](../00-contexto/fuera-de-alcance.md), o
[ADR](../02-arquitectura/adr/) si resultó ser una decisión de arquitectura.

## Relacionado

- [Actores](../00-contexto/actores.md) — quién pide qué y en qué condiciones
- [Tablero de requerimientos](../tableros/tablero-requerimientos.base)
