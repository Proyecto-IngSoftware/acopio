---
title: "Sesión 2026-10-19 · Plataformas en Causas y mapa por tipo"
type: informe
tags: [operacion, sesion, pieza-e, portal]
estado: vigente
actualizado: 2026-10-19
---

# Sesión 2026-10-19 · Plataformas en Causas y mapa por tipo

Joseph vio la pieza E en el servidor y pidió tres cambios: llevar las otras plataformas a Causas,
darles imagen real y hacer que el mapa distinga los puntos. Quedaron hechos con la maqueta
aprobada, fusionados en #143 y desplegados en el servidor de pruebas.

## Qué cambió

| PR o commit | Qué trae |
|---|---|
| #143 | Plataformas al final de Causas con foto; `imagen_key` en `plataforma` y `GET /api/publico/plataformas/{id}/imagen`; fotos de 5 sitios en el seed; causas de la demo con la ilustración nueva; mapa con grupos por tipo y pines tipo píldora |
| Logos de las fundaciones | Cruz Roja Colombiana y UNICEF Colombia, las entidades de las causas de la demo, llevan su logo real bajado de su sitio (`apps/api/src/seed/logos-entidades/`) en vez del corazón abstracto. Lo pidió Joseph |

Fuera del repositorio: la maqueta se publicó en <https://claude.ai/artifact/78TAzib9qjFjXkRgLJSSz3>.
Dokploy desplegó #143 y el servidor sirve las 5 fotos de las plataformas.

## Pruebas

- `lint`, `typecheck`, `depcruise`, `test`, `test:int` (502 de 502, contra el PostgreSQL de
  pruebas) y `revisar-colores.sh` pasan.
- En local, con la API reconstruida: `referenciados.mjs` 6 de 6 (ahora revisa la sección de
  Causas y la redirección de `/plataformas`), `portal-causas.mjs` 4 de 4 y
  `validacion-general.mjs` 60 de 60.
- Contra el servidor de pruebas, `referenciados.mjs` dio 6 de 6.
- `seed:demo` subió las 5 fotos de las plataformas y las ilustraciones nuevas de las causas.

## Decisiones

- Joseph eligió en la sesión: plataformas como sección al final de Causas, grupos del mapa por
  tipo y, para las plataformas, fotos reales de cada sitio en vez de ilustraciones. Quedó escrito
  en las notas de [P03](../../03-diseno/stitch/P03-causas/README.md) y
  [P05](../../03-diseno/stitch/P05-mapa/README.md).
- La zona del mapa dice cuántas cosas faltan, porque la API pública no trae su nombre (nota de P05).
- `importacion` puede usar `almacenamiento` para servir las fotos; está en la tabla de
  [vista general](../../02-arquitectura/vista-general.md) y en `.dependency-cruiser.cjs`.

## Errores y correcciones

- La edición en Stitch se cortó por tiempo y no apareció en el proyecto; la maqueta se armó a mano
  con las clases de Stitch.
- La migración salió primero con una fecha anterior a la que crea `plataforma` y falló en las
  pruebas; se renombró a `20261022100000_plataforma_imagen`.
- Los grupos del mapa se veían cuadrados porque `rounded-full` del tema vale 0.75rem; los
  marcadores usan `rounded-[999px]`.

## Pendiente

- Cuatro plataformas no tienen foto: Donando Talento y Colombia Te Amo no respondieron, Mapa de
  Emergencia daba «Page not found» y Puntos en Google Maps es un mapa de Google. Se ven con el ícono
  de su categoría. Si sus sitios vuelven, la foto se agrega en
  `apps/api/src/seed/imagenes-plataformas/` ([P-078](../../01-requerimientos/pendientes.md#p-078--fotos-de-las-plataformas-sin-sitio-disponible)).

## Siguientes pasos

Quedan en el [plan de acción](../../05-planes/plan-de-accion.md), en orden:

- Antes de la sustentación del 23 (fila 4): ensayar el recorrido de la demo en el servidor y
  regenerar el diagrama de paquetes, que se midió el 18 y no tiene el módulo `importacion`.
- Avance 5 (fila 2, [#47](https://github.com/Proyecto-IngSoftware/acopio/issues/47)): volver a
  tomar con `CAPTURAS_WORD` las capturas del mapa y de Causas, que cambiaron hoy, y subir el Word.
- Ronda de pruebas por rol en el servidor (fila 5,
  [#58](https://github.com/Proyecto-IngSoftware/acopio/issues/58)) y cierre del Sprint 2 (fila 6).
- Después del 23 (fila 8): P-076, P-077 y P-078, antes de prender la lectura programada de
  RedAcopio.
