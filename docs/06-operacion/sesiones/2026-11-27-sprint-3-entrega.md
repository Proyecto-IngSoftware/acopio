---
title: "Sesión 2026-11-27 · Sprint 3: lo que faltaba de la guía y el Avance 6"
type: informe
tags: [operacion, sesion]
estado: vigente
actualizado: 2026-11-27
---

# Sesión 2026-11-27 · Sprint 3: lo que faltaba de la guía y el Avance 6

Se cruzó la [guía del Sprint 3](../../entregas/guias/Avance%20de%20Proyecto%20Sprint%203%20–%20IS1.pdf)
con el repositorio, se hizo lo que dependía del código y de la documentación, y quedó el
[Avance 6](../../entregas/avance-6-sprint-3/avance-06-sprint3.md) en borrador. Lo que falta
depende de Joseph y del equipo: la configuración del despliegue, la reunión de seguimiento y la
prueba con personas.

## Qué cambió

| PR o commit | Qué trae |
|---|---|
| #197 | `/api/salud` con la versión, que pasa a 1.0.0. JUnit de las cuatro suites como artifact del CI. `entrega.yml`: etiqueta, verificación, imágenes de la versión, aprobación del environment `produccion`, despliegue en Dokploy y comprobación posterior. `despliegue.md` con la entrega, la vuelta atrás y los datos persistentes |
| `2f2f7b0` | ADR-0026 (el ADR-003 del curso), vista de componentes y conectores y diagrama de despliegue, con su exportador. `vista-general.md` al día: trece módulos y lo que corre hoy |
| `8af18bc` | `carga-acopio.mjs` con `ACOPIO_CARGA_CLIENTES` y `ACOPIO_CARGA_MAX_VUS`, `codo-carga.py` y la evidencia de la carga y de la restauración |
| `ed58131` | Salida de los recorridos `validacion-general` (57/57) y `donador` (7/7) |
| `5f39c63` | Guion de usabilidad, tareas, cuestionario SUS y hoja de registro |
| este PR | Avance 6 y su generador, P-092 resuelto (filas del seguimiento en las notas de los avances 4 y 5, los dos Word y el unificado regenerados), P-093, plan de acción e índice de entregas |

Fuera del repositorio no se cambió nada: ni el servidor, ni Dokploy, ni la configuración de
GitHub.

## Pruebas

- Verificación completa en la rama de #197: lint, typecheck, depcruise, revisar-colores, test y
  test:int con código 0. La prueba de `salud.int.test.ts` estuvo en rojo antes del cambio. El CI
  de `main` tras la fusión dejó el artifact con 104, 116, 1258 y 567 pruebas sin fallas.
- El contenedor de la API recién construido responde `"version":"1.0.0"` en `/api/salud`.
- Carga en el Compose local: dos rampas, con el codo entre 900 y 1000 peticiones por segundo. La
  calibración mostró 902 respuestas 429 de 2703 sin repartir clientes y ninguna repartiéndolos.
  `codo-carga.py` se calibró con datos sintéticos de resultado conocido.
- Restauración de un `pg_dump` en un PostgreSQL vacío: seis cifras iguales antes y después, y la
  bitácora sigue siendo solo de inserción para `acopio_app`.
- Recorridos contra el Compose con la versión 1.0.0 y `SIN_CORREO=1`, porque el correo está
  apagado en el `.env` local (P-055).
- Avance 6 renderizado a PDF con `render.Dockerfile` y revisado página por página. Los Word
  regenerados de los avances 4 y 5 y el unificado conservan cada bloque de texto de los
  originales.
- No se probó `entrega.yml` de punta a punta: necesita el environment y los secretos.

## Decisiones

- Joseph (al planear la sesión): CI/CD con etapa de despliegue manual aprobada; Claude prepara
  la prueba de usabilidad y Joseph la corre con personas; el equipo hace una reunión real para
  el seguimiento; P-092 se cierra antes de regenerar el unificado.
- Claude: la versión sale de `package.json` y no del SHA, porque Dokploy no pasa el commit a la
  construcción y cambiar su `.env` por API desde el CI arriesgaba los secretos del servidor.
  Para que lo desplegado sea el commit verificado, Dokploy construye una rama `produccion` que
  solo mueve el workflow ([despliegue](../despliegue.md#entrega-de-una-versión)).
- Claude: el ADR-003 del curso es el ADR-0026, porque los números anteriores ya estaban usados.

## Errores y correcciones

- Supuse que el límite de peticiones cortaría la carga a 20 por segundo. La calibración lo
  desmintió: el límite es por ruta y por cliente. Se repitió a 120 por segundo, donde sí corta,
  y solo entonces se usó el reparto de clientes.
- Los recorridos fallaron dos veces por configuración: la contraseña del administrador no
  estaba en el entorno, y las cuentas de la demo de esta base usan la contraseña por defecto de
  desarrollo. Con eso corregido pasaron.
- `donador.mjs` sobrescribió seis capturas `construida*.png` de `docs/03-diseno/stitch/`. No
  entraron en ningún commit y siguen modificadas en el árbol de trabajo, porque descartarlas lo
  bloqueó el modo automático. Lo decide Joseph ([P-093](../../01-requerimientos/pendientes.md)).
- La primera comparación de los Word contra las notas marcó bloques que sí estaban, por cómo se
  normalizaba el código entre comillas invertidas. Se revisó a mano y lo único escrito solo en
  Word eran las filas del seguimiento.

## Pendiente

- Seguimiento del equipo antes del 4 de diciembre, con captura, y retrospectiva ajustada
  ([plan de acción, filas 7 y 11](../../05-planes/plan-de-accion.md), [#51](https://github.com/Proyecto-IngSoftware/acopio/issues/51)).
- Prueba de usabilidad con personas y su SUS ([plan de acción, fila 16](../../05-planes/plan-de-accion.md), [#25](https://github.com/Proyecto-IngSoftware/acopio/issues/25)).
- Primer run de `entrega.yml` con la etiqueta `v1.0.0` y su captura ([plan de acción, fila 18](../../05-planes/plan-de-accion.md), [#26](https://github.com/Proyecto-IngSoftware/acopio/issues/26)).
- Carga contra los recursos del servidor ([P-090](../../01-requerimientos/pendientes.md)).
- Recorridos que sobrescriben capturas versionadas ([P-093](../../01-requerimientos/pendientes.md)).
- Filas vencidas del plan de acción que avisa `revisar-plan.mjs` (piezas D y E, presentaciones,
  bloque 6, deuda, #39 y #41): Joseph decide si se recortan o se reprograman
  ([plan de acción](../../05-planes/plan-de-accion.md), [#52](https://github.com/Proyecto-IngSoftware/acopio/issues/52)).
- Regenerar el Avance 6 y el unificado cuando lleguen las capturas, y subirlo a OneDrive
  ([#52](https://github.com/Proyecto-IngSoftware/acopio/issues/52)).

## Depende de Joseph

- En GitHub, Settings, Environments: crear `produccion`, ponerse como aprobador y cargar
  `DOKPLOY_URL`, `DOKPLOY_TOKEN` y `DOKPLOY_COMPOSE_ID`. En Dokploy: rama `produccion` y
  despliegue automático apagado. Después, `git tag v1.0.0 cca65b6 && git push origin v1.0.0`
  y aprobar el run ([despliegue](../despliegue.md#entrega-de-una-versión)).
- Las capturas `tablero.png`, `seguimiento.png` y `entrega.png` en
  `docs/entregas/avance-6-sprint-3/evidencia/`.
- Decidir qué hacer con las seis capturas modificadas de `docs/03-diseno/stitch/` (P-093).
- Los cambios sin commit que venían de otra sesión (`.claude/settings.json`, `package.json`,
  `AGENTS.md`, el hook antislop y su informe del 2026-11-18) siguen en el árbol de trabajo, fuera
  de estas ramas.
