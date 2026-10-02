---
title: "Bloque 2 · Interfaz, ciclo 3: captura sin conexión · plan"
type: plan
tags: [plan, interfaz, bloque-2]
estado: borrador
bloque: 2
actualizado: 2026-10-02
---

# Bloque 2 · Interfaz, ciclo 3: captura sin conexión · plan

**Objetivo:** que un Operador registre entradas en C4 sin red y que se envíen solas al
volver la señal. Es el criterio 3 del bloque: «Sin red, registra tres entradas; la cabecera
dice "3 sin sincronizar". Al volver la señal se envían solas y el historial las muestra con
la hora en que ocurrieron y la hora en que llegaron».

**Especificación:** [Bloque 2](../superpowers/specs/2026-10-01-bloque-2-inventario-design.md),
§6 («Captura sin conexión»), §8 (pruebas) y V-07.
[ADR-0016](../02-arquitectura/adr/ADR-0016-service-worker-con-vite-plugin-pwa.md) fija el
service worker con `vite-plugin-pwa`; [ADR-0005](../02-arquitectura/adr/ADR-0005-offline-solo-movimientos.md),
que sin red solo se capturan movimientos.

Borrador escrito al cerrar el ciclo 2, para retomar en la sesión siguiente. Se aprueba
antes de empezar la tarea 1.

## Lo que ya existe

- C4 manda un `id` del navegador en cada entrada (E-04 del ciclo 1) y la API acepta
  `ocurridoEn` y `origenOffline`. Un `id` repetido con el mismo contenido devuelve 200 con el
  movimiento original, así que reenviar no duplica.
- `ocurridoEn` admite hasta 7 días atrás; lo más viejo vuelve con 422
  `FECHA_FUERA_DE_RANGO`.
- El Historial ya marca lo registrado sin conexión con sus dos horas.
- `GET /categorias/vigentes` es público y sirve para la copia local de categorías.
  `GET /acopios/:id/no-recibir` y `GET /acopios/:id/saldos` ya los usa C4.

## Decisiones para aprobar

| # | Decisión propuesta | Por qué |
|---|---|---|
| O-01 | La cola y los datos locales van en IndexedDB con `idb` (envoltorio pequeño de promesas); las pruebas usan `fake-indexeddb` | §8 de la especificación pide `fake-indexeddb` |
| O-02 | La cola es por usuario y guarda el cuerpo completo de cada entrada con su `id` y su `ocurridoEn` | Si otra persona entra en el mismo teléfono no envía lo ajeno |
| O-03 | Se envía en orden, de a una, con el evento `online`, al abrir la aplicación y al volver a C4; los reintentos esperan cada vez más, hasta 5 minutos | §6 de la especificación |
| O-04 | Un 401 detiene el envío, conserva la cola y pide volver a entrar. Un 429 o un error de red reintenta. Otro 4xx marca esa entrada como rechazada con su motivo y sigue con la siguiente | §6; un rechazo no debe trabar las demás |
| O-05 | La web recuerda el último usuario (nombre, rol y asignaciones, nunca el token) para dejar capturar sin red | §6 |
| O-06 | Sin red, C4 busca en la copia local sin tildes ni mayúsculas; la tolerancia a errores de tipeo queda para cuando hay conexión | §6 |
| O-07 | El saldo sin red es el último conocido más lo pendiente, marcado «estimado» | §6 |
| O-08 | Sin red, el escáner solo reconoce códigos ya vistos en el teléfono y no aprende nuevos | §6 y P-037 |
| O-09 | Salida, conteo y umbrales siguen pidiendo red; sin ella muestran un aviso | V-07: una salida sin red podría dejar un saldo negativo |

## Tareas

1. **Diseños:** pedir a Stitch la pastilla «3 sin sincronizar» de la cabecera, C4 sin
   conexión (aviso, saldo estimado, búsqueda local), la lista de pendientes y rechazados
   con «Corregir» y «Descartar», y el aviso de versión nueva del service worker. Maqueta y
   aprobación de Joseph antes de escribir código.
2. **Datos locales:** `idb` y `fake-indexeddb`; almacén de categorías vigentes, «no
   recibir» del acopio, últimos saldos y códigos vistos, guardado al abrir C4 con red.
3. **Cola:** guardar, listar, enviar en orden, reintento con espera creciente, 401, 429,
   rechazo con motivo e idempotencia. Pruebas con `fake-indexeddb` y `responderSegun`.
4. **Sesión sin red:** recordar el último usuario sin token y dejar entrar a C4 sin red.
5. **C4 sin conexión:** registrar en la cola, saldo estimado, búsqueda local, escáner con
   códigos vistos, aviso en C5, C6 y C7.
6. **Pastilla y pendientes:** «N sin sincronizar» en la cabecera mientras haya pendientes;
   pantalla de pendientes y rechazados.
7. **Service worker:** `vite-plugin-pwa` con `registerType: 'prompt'`, `index.html` para
   cualquier navegación, sin guardar respuestas de `/api`, aviso de versión nueva. Revisar
   que el build siga pasando el CI y que el Compose sirva el service worker.
8. **Cierre:** recorrido en el Compose con Playwright y la red cortada
   (`context.setOffline(true)`): tres entradas, «3 sin sincronizar», volver la red, envío
   solo y el Historial con las dos horas. axe a 360 × 640, capturas, documentación y
   estado de este plan.

Cada tarea sigue el contrato de los ciclos anteriores: pruebas primero con Vitest y
Testing Library, `lint`, `typecheck`, `test`, colores, íconos y commit a `main` solo si
todo pasa. Si la tarea toca la API, también `depcruise` y `test:int`.

## Lo que más puede fallar sin que una prueba lo note

- La cola se vacía antes de que la API confirme: una entrada se pierde si la pestaña se
  cierra a mitad del envío. Se borra de la cola solo con un 2xx.
- Dos pestañas abiertas envían la misma cola a la vez. La idempotencia por `id` evita el
  duplicado, pero el contador puede quedar desfasado.
- El reloj del teléfono atrasado o adelantado: `ocurridoEn` fuera de rango vuelve como
  rechazo, y el Operador debe poder corregir la fecha.
- Un service worker viejo sirve una versión que no conoce la cola nueva.
- El Operador perdió la asignación mientras capturaba sin red: el 403 al sincronizar
  debe quedar visible como rechazo, sin reintentos infinitos.

## Para retomar

1. `git status` y `gh run list --limit 3`: `main` quedó limpio y en verde con el commit
   que agregó este plan.
2. Leer este plan, aprobar o ajustar las decisiones O-01 a O-09 y pasarlo a `aprobado`.
3. Empezar por la tarea 1: los diseños.
4. Para las pruebas de integración se levanta el PostgreSQL aparte que indica CLAUDE.md
   (`acopio-pg-pruebas` en el puerto 5439). El recorrido del cierre del ciclo 2 usó un
   script de Playwright fuera del repositorio; si se quiere repetir, conviene versionarlo
   (por ejemplo en `apps/web/recorridos/`).
5. Pendientes del bloque que siguen abiertos: P-037 (escáner en un teléfono real) y P-038
   (menores de la revisión del ciclo 2).

## Estado

| Tarea | Estado | Qué falta |
|---|---|---|
| 1 Diseños | ⬜ | |
| 2 Datos locales | ⬜ | |
| 3 Cola | ⬜ | |
| 4 Sesión sin red | ⬜ | |
| 5 C4 sin conexión | ⬜ | |
| 6 Pastilla y pendientes | ⬜ | |
| 7 Service worker | ⬜ | |
| 8 Cierre | ⬜ | |
