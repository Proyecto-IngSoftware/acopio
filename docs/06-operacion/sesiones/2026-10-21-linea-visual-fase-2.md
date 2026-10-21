---
title: "Sesión 2026-10-21 · Línea visual, fase 2"
type: informe
tags: [operacion, sesion, web, diseno, portal]
estado: vigente
actualizado: 2026-10-21
---

# Sesión 2026-10-21 · Línea visual, fase 2

Con la fase 1 ya en `main`, tocaba llevar sus piezas al portal. Escribí el plan de la fase 2, lo construí tarea por tarea con el lienzo aprobado como maqueta y se fusionó el mismo día con el PR 179, a pedido de Joseph. Los recorridos no se corrieron: esta sesión en la nube no tiene Docker.

## Qué cambió

| PR o commit | Qué trae |
|---|---|
| [PR 179](https://github.com/Proyecto-IngSoftware/acopio/pull/179), rama `claude/beautiful-faraday-11mzwz` ([#177](https://github.com/Proyecto-IngSoftware/acopio/issues/177)) | `FilaJornada` en la Portada y en P7, tira de días en P7, franja de la Portada con la cifra real, balance con barras y píldora, «¿Cómo apoyar?» con detalle, vacíos ilustrados, sello en P8, P9 y confirmar correo, botones que giran mientras esperan y listas que entran escalonadas |
| Misma rama, documentos | [Plan de la fase 2](../../05-planes/2026-10-21-linea-visual-fase-2.md), «Cambios al construir» de la [especificación](../../superpowers/specs/2026-10-21-linea-visual-design.md), catálogo de patrones, una sección en la nota de cada pantalla que cambió y la fila 22 del [plan de acción](../../05-planes/plan-de-accion.md) |

Fuera del repositorio:

- Comentario en el issue [#177](https://github.com/Proyecto-IngSoftware/acopio/issues/177) con lo probado y lo que falta.
- Al fusionar, Dokploy despliega la fase 2 en el servidor de pruebas.
- El lienzo se leyó, no se editó.

## Pruebas

- Verificación completa con salida 0: lint, typecheck, depcruise, `revisar-colores.sh`, 116 pruebas de `shared`, 100 de la API, 1248 de la web y 552 de integración. La integración corrió contra un PostgreSQL 16 local en el puerto 5439, porque no había Docker.
- Capturas a 360 px con Playwright de P1, P7, Reservar y P10, con la web construida y la API simulada, con «reducir movimiento» encendido y apagado. No hubo scroll horizontal ni errores de página. Ahí apareció que «Quedan 10 de 15» se partía en dos líneas, y se corrigió.
- No se corrieron los recorridos de `apps/web/recorridos/` ni se rehicieron las `construida.png`: los dos necesitan la API del Compose.
- El CI del PR pasó completo (lint, tipos y pruebas, imágenes de la API y la web, CodeQL). CodeQL no encontró alertas nuevas en el código del PR. La API de code scanning respondió 403 a esta sesión, así que la revisión de P-088 se hizo con el resumen de ese check.
- La revisión final de la rama la hice yo, sin un revisor aparte. Encontró un defecto: si un acopio marca «no recibir» una categoría que tiene bajo el mínimo, el título decía «Hoy falta 1 categoría en 0 acopios.». Quedó corregido con su prueba.

## Decisiones

Todas quedaron en «Cambios al construir» de la especificación:

- Las barras del balance se miden contra la categoría que falta en más acopios, porque `necesidades` no lista todos los acopios abiertos.
- Las dos cifras del título salen de `necesidades`, para que no se contradigan.
- La fila de jornada sigue al lienzo: sin borde, «Reservar» a la derecha y la barra corta junto a los cupos. La desactivada no lleva barra.
- El texto con «N de M cupos reservados» y el ajuste manual quedan solo en el detalle de la jornada.
- La tira de días va en las dos vistas de P7, desde hoy hasta la última jornada, entre 7 y 30 días.
- Textos nuevos: el sello «Correo confirmado», el vacío de la Portada sin emergencias y «Escribe tu folio» en P10.
- Claude propuso esperar a después de la sustentación del 23 para fusionar, porque la Portada del servidor cambia y los recorridos no se corrieron. Joseph pidió fusionar el 21, y así quedó en la fila 22 del plan de acción.

## Errores y correcciones

- `scripts/iconos.mjs` tomaba el `nombre` de `<Ilustracion>` como un ícono y metió `cajas`, `calendario` y `mapa` en el enlace de Google Fonts. Ahora quita esas etiquetas antes de buscar, y `iconos.test.ts` lo revisa.
- Docker no estaba disponible para las pruebas de integración. Se levantó un PostgreSQL local con `initdb` en `/var/lib/postgresql/acopio-pruebas`, fuera del repositorio.

## Pendiente

- Correr los 13 recorridos contra el Compose y rehacer las `construida.png` de P01, P03, P05, P07, P08, P09, P10 y P13 ([#177](https://github.com/Proyecto-IngSoftware/acopio/issues/177)).
- Plan y construcción de la fase 3, la consola ([#177](https://github.com/Proyecto-IngSoftware/acopio/issues/177), fila 22 del [plan de acción](../../05-planes/plan-de-accion.md)).

## Depende de Joseph

- Recorrer la demo del servidor antes de presentarla el 23, ahora con las fases 1 y 2. Cambiaron la Portada, P7, reservar, mi reserva, el folio de P9, confirmar correo, mis donaciones, P10 y las causas sin foto ([#177](https://github.com/Proyecto-IngSoftware/acopio/issues/177)).
