---
title: "Sesión 2026-10-18 · Resumen de la jornada"
type: informe
tags: [operacion, sesion, resumen]
estado: vigente
actualizado: 2026-10-18
---

# Sesión 2026-10-18 · Resumen de la jornada

Resumen de todo lo que se hizo el 18 de octubre, en orden, con el informe de cada parte. Se
fusionaron siete pull requests, del #128 al #134, todos con el CI en verde y desplegados en el
servidor de pruebas.

## Qué se hizo

| PR | Qué trae | Informe |
|---|---|---|
| #128 | Cierre del Bloque 5 y de la pieza C: HU-03, HU-02 y HU-15 revisadas en el servidor; menores de P-066, P-068 y P-069; el arreglo de dos ediciones simultáneas de una jornada | [cierre del Bloque 5](2026-10-18-cierre-bloque-5.md) |
| #130 | Plan de acción con `scripts/revisar-plan.mjs` y el hook que recuerda actualizarlo; issues al día (#129 nuevo, #35 y #55 cerrados, cuatro cambiados de semana) | [plan de acción](2026-10-18-plan-de-accion.md) |
| #131 | Word del Avance 5: nota fuente, `generar-avance-05.py`, capturas y documento unificado; P-072 resuelto | [Word del Avance 5](2026-10-18-avance-5-documento.md) |
| #132 | Diagrama de paquetes con turnos, PNG de todos los diagramas regenerados y más pantallas en el Word; P-073 encontrado | [Word del Avance 5](2026-10-18-avance-5-documento.md) |
| #133 | Word revisado renderizado en un contenedor de LibreOffice: galerías de capturas y retrospectiva dictada por Joseph | [Word del Avance 5](2026-10-18-avance-5-documento.md) |
| #134 | Balance de la portada conectado (P-073), causas de la demo con imagen y `CAPTURAS_WORD` en los recorridos; el Word con 22 capturas | [portada y capturas](2026-10-18-portada-y-capturas.md) |

Fuera del repositorio: la demo de turnos del servidor se restauró después de un recorrido que
falló, el servidor sembró al arrancar las imágenes de las causas, y al cerrar se detuvieron
los contenedores locales de Acopio (los volúmenes siguen).

## Cómo quedó el proyecto

- Bloques 0 a 5 y la pieza C, cerrados. Quedan las piezas D y E del Bloque 1 y el Bloque 6.
- El Word del Avance 5 está generado, revisado renderizado y unido al documento de avances.
- La demo del servidor muestra el balance de la portada y las causas con imagen; el diagrama
  de paquetes está al día para la sustentación del 23.
- La verificación completa pasó en cada PR; la última: web 942, API 71, shared 104 e
  integración 447.

## Pendiente

Todo está ordenado en el [plan de acción](../../05-planes/plan-de-accion.md). Lo inmediato:

- Las capturas del tablero del Sprint 2 y del seguimiento, regenerar el Word y subirlo a
  OneDrive ([#47](https://github.com/Proyecto-IngSoftware/acopio/issues/47), fila 2 del plan).
- La sustentación del viernes 23 (fila 4).
- La ronda de pruebas en el servidor ([#58](https://github.com/Proyecto-IngSoftware/acopio/issues/58)).
- Los menores de las revisiones ([#129](https://github.com/Proyecto-IngSoftware/acopio/issues/129),
  P-070 y P-071).

## Depende de Joseph

Las dos capturas del Avance 5 y subir el documento a OneDrive
([#47](https://github.com/Proyecto-IngSoftware/acopio/issues/47)).
