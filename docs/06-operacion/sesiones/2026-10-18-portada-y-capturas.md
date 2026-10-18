---
title: "Sesión 2026-10-18 · Balance de la portada, imágenes de la demo y capturas de los recorridos"
type: informe
tags: [operacion, sesion, portada, demo, recorridos, entrega]
estado: vigente
actualizado: 2026-10-18
---

# Sesión 2026-10-18 · Balance de la portada, imágenes de la demo y capturas de los recorridos

Joseph pidió corregir los dos fallos que salieron al armar el Avance 5 y que los recorridos
dejaran más capturas para el Word. Quedaron el balance de la portada conectado, la demo con
imágenes en las causas y los recorridos guardando capturas del alto de la pantalla.

## Qué cambió

| PR o commit | Qué trae |
|---|---|
| Rama `portada-y-capturas` | `GET /api/publico/balance` con su prueba de integración, contrato y tipos de la web; el bloque «Balance de recepción» de la portada conectado, con sus pruebas; `seed/imagenes-demo.ts` y su prueba; `CAPTURAS_WORD` en nueve recorridos; el Word del Avance 5 con 22 capturas tomadas por los recorridos; P-073 resuelto |

## Pruebas

- Balance: tres pruebas de integración (cuenta acopios por categoría, no cuenta un acopio
  cerrado ni una marca vencida) y cuatro de la web (lista, «No traigan», vacío y error). Las
  dos tandas se vieron fallar antes de implementar.
- Imágenes de la demo: dos pruebas de integración (cada causa con imagen y su entidad con
  logotipo, servidos por la API; una segunda corrida no cambia nada), vistas fallar primero.
  El seed de la demo contra el Compose subió 6 imágenes.
- Recorridos en local, con la API reconstruida y `CAPTURAS_WORD` activo: los siete en verde
  (detalle en [recorridos.md](../recorridos.md#últimos-resultados)).
- El Word se revisó renderizado en el contenedor de LibreOffice. La única corrección fue un
  título que quedaba solo al pie de una página.
- Verificación completa con código 0: web 942, API 71, shared 104 e integración 447.

## Decisiones

- «Qué hace falta» son las categorías con semáforo `BAJO` (saldo por debajo del mínimo) en
  algún acopio que no esté cerrado; «No traigan», las marcas vigentes de «no recibir». El
  endpoint solo cuenta acopios: no dice cuáles ni cuánto tiene cada uno. Muestra hasta seis
  categorías por pestaña.
- La etiqueta dice «Falta en N acopios» y no el nivel de la maqueta («CRÍTICO»), porque el
  inventario no tiene niveles de urgencia. Quedó anotado en la nota de diseño de P1.
- Las imágenes de la demo son ilustraciones geométricas generadas con `sharp`, sin texto y sin
  emblemas de las organizaciones reales. Si el almacenamiento no responde, el seed avisa y
  sigue.

## Errores y correcciones

- Las pruebas del balance pasaban solas y fallaban en la suite completa: usaban categorías del
  catálogo a las que otra suite ya les había puesto umbrales en los mismos acopios, y la base
  de pruebas es compartida. Ahora crean sus propias categorías, con un nombre que las deja
  primero entre las que empatan.
- Dos recorridos fallaron al entrar por el límite de 5 inicios de sesión por minuto; pasaron
  al esperar. Quedó escrito en `recorridos.md`.
- Un comando que borraba renders anteriores con `rm` y una variable fue bloqueado por el
  chequeo de seguridad; se repitió sin borrar, en una carpeta nueva.

## Pendiente

- Desplegar: el servidor sube las imágenes de la demo en el próximo arranque, porque tiene
  `SEMBRAR_DEMO_AL_ARRANCAR=true` ([despliegue.md](../despliegue.md)).
- Las dos capturas del Avance 5 que dependen de Joseph siguen en la fila 2 del
  [plan de acción](../../05-planes/plan-de-accion.md).

## Depende de Joseph

Las capturas del tablero del Sprint 2 y del seguimiento
([#47](https://github.com/Proyecto-IngSoftware/acopio/issues/47)).
