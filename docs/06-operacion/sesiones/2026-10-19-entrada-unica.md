---
title: "Sesión 2026-10-19 · Una sola pantalla para entrar"
type: informe
tags: [operacion, sesion, identidad]
estado: vigente
actualizado: 2026-10-19
---

# Sesión 2026-10-19 · Una sola pantalla para entrar

En la ronda por rol, Joseph escribió `admin` en la pantalla de entrada del Donador y el navegador
le pidió un «@». Decidió que haya una sola pantalla de inicio de sesión para todas las cuentas
([P-079](../../01-requerimientos/pendientes.md)) y que la migración de `identidad` a DAO fuera
en el mismo cambio. Quedó hecho, con los doce recorridos en verde en local.

## Qué cambió

| PR o commit | Qué trae |
|---|---|
| Rama `entrada-unica` | `identidad` a DAO: cinco DAO nuevos, y el guard, los servicios y el proveedor local ya no inyectan Prisma ([ADR-0019](../../02-arquitectura/adr/ADR-0019-dao-sobre-prisma.md)). `POST /api/auth/sesion` acepta un correo o un nombre de usuario para cualquier cuenta y sale `POST /api/auth/donador/sesion`. C01 «Entrar a Acopio» para todos; P13 sin sesión solo crea la cuenta de donador. El correo «Ya tienes una cuenta» enlaza a `/entrar`. Contrato, tipos, recorridos, requisitos, guía de escenarios y los README de C01 y P13 |

Fuera del repositorio: las maquetas de C01 y P13 se publicaron en sus páginas de siempre, y
Joseph las aprobó el mismo día.

La especificación es
[2026-10-19-entrada-unica-design.md](../../superpowers/specs/2026-10-19-entrada-unica-design.md)
y el plan,
[2026-10-19-entrada-unica.md](../../superpowers/plans/2026-10-19-entrada-unica.md).

## Pruebas

- Integración completa, contra el contenedor del puerto 5439: 503 de 503 después de la
  migración y otra vez después del cambio de la API.
- Web: 1029 de 1029.
- Recorridos en local, con la API reconstruida: los doce en verde (detalle en
  [recorridos.md](../recorridos.md#últimos-resultados)).
- Lint, tipos, depcruise y colores, antes del PR.

## Decisiones

- Joseph: una sola entrada, «Crear cuenta» solo para el Donador (las cuentas del equipo siguen
  naciendo de una invitación) y la migración de `identidad` en el mismo cambio. Están en
  [P-079](../../01-requerimientos/pendientes.md) y en la especificación.
- Claude: con `?volver=` la pantalla de entrada devuelve a quien venía de una página protegida,
  solo a rutas internas. Un Donador con sesión que abre `/entrar` va a su destino, como ya hacía
  C01. Quedó en «Cambios al construir» de la especificación.

## Errores y correcciones

- Al cambiar en los recorridos la etiqueta «Nombre de usuario» por la nueva, el reemplazo tocó
  también el formulario de invitar, que sigue llamándose así. `validacion-general.mjs` dio 56 de
  60 hasta corregirlo.
- La revisión final de la rama, que hizo Claude sin un revisor aparte, encontró dos fallas que
  se arreglaron con prueba: una cuenta del equipo que abría `/donar` quedaba en un bucle entre
  `/donar` y `/entrar`, y `?volver=` aceptaba una ruta que empieza con barra invertida.

## Pendiente

- Comprobar en el servidor, cuando se despliegue, que `admin`, `operador1` y
  `donador1@demo.acopio.local` entran por `/entrar` (fila 4 del
  [plan de acción](../../05-planes/plan-de-accion.md)).

## Depende de Joseph

- Ensayar la presentación con la entrada nueva (fila 4 del
  [plan de acción](../../05-planes/plan-de-accion.md)).
