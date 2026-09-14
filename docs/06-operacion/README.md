---
title: "Operación — índice"
type: moc
tags: [moc, operacion]
estado: vigente
actualizado: 2026-09-12
---

# Operación — índice

| Nota | Cuándo se abre |
|---|---|
| [despliegue.md](despliegue.md) | Al montar el entorno o publicar una versión |
| [runbook.md](runbook.md) | Cuando algo falla, y **72 h antes de cada sustentación** |
| [github-projects.md](github-projects.md) | Al montar la organización de GitHub y el Project, o al cargar el backlog |

## Lo que no se puede olvidar

**El plan gratuito de Supabase pausa proyectos inactivos.** Si el equipo no toca el
proyecto durante una semana, el día de la sustentación nadie puede iniciar sesión.
La verificación de 72 horas antes está en la primera sección del
[runbook](runbook.md).

**La `service_role` key vive solo en el contenedor `api`.** Nunca en el frontend,
nunca en una variable `VITE_*`, nunca en el repositorio. Puede crear y borrar
cualquier usuario de Supabase.

## Responsable

Michael, según el reparto del
[Avance 1](../entregas/avance-01-sprint0.md#5-roles-iniciales-y-acuerdos-de-trabajo).
Rota cada Sprint.

## Relacionado

- [Vista general de arquitectura](../02-arquitectura/vista-general.md)
- [ADR-0001](../02-arquitectura/adr/ADR-0001-supabase-solo-auth.md)
