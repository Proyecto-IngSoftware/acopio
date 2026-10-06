---
title: "Bloque 2 · Interfaz, ciclo 3: captura sin conexión · plan"
type: plan
tags: [plan, interfaz, bloque-2]
estado: aprobado
bloque: 2
actualizado: 2026-10-05
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

Aprobado por Joseph el 2026-10-05, con O-01 a O-09 sin cambios y tres agregados (O-10 a
O-12).

## Lo que ya existe

- C4 manda un `id` del navegador en cada entrada (E-04 del ciclo 1) y la API acepta
  `ocurridoEn` y `origenOffline`. Un `id` repetido con el mismo contenido devuelve 200 con el
  movimiento original, así que reenviar no duplica.
- `ocurridoEn` admite hasta 7 días atrás; lo más viejo vuelve con 422
  `FECHA_FUERA_DE_RANGO`.
- El Historial ya marca lo registrado sin conexión con sus dos horas.
- `GET /categorias/vigentes` es público y sirve para la copia local de categorías.
  `GET /acopios/:id/no-recibir` y `GET /acopios/:id/saldos` ya los usa C4.

## Decisiones

| # | Decisión | Por qué |
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
| O-10 | Dentro de la tarea 5 se arreglan dos menores de P-038 en `EntradaRapida.tsx`: elegir otra categoría limpia la fecha de vencimiento, y C4 pide el teclado numérico en las categorías por unidades | P-038 los deja para cuando se vuelva a tocar el archivo, y la tarea 5 lo reescribe |
| O-11 | El script de Playwright del recorrido de cierre se versiona en `apps/web/recorridos/` | El del ciclo 2 quedó fuera del repositorio y no se puede repetir |
| O-12 | «Salir» con entradas sin enviar avisa cuántas son antes de cerrar la sesión. Al salir se borra el usuario recordado; la cola se conserva y se envía cuando esa persona vuelva a entrar | O-05 recuerda al último usuario y no fija qué pasa con su cola al salir |

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
   «Salir» con pendientes (O-12).
5. **C4 sin conexión:** registrar en la cola, saldo estimado, búsqueda local, escáner con
   códigos vistos, aviso en C5, C6 y C7. Los dos menores de P-038 (O-10).
6. **Pastilla y pendientes:** «N sin sincronizar» en la cabecera mientras haya pendientes;
   pantalla de pendientes y rechazados.
7. **Service worker:** `vite-plugin-pwa` con `registerType: 'prompt'`, `index.html` para
   cualquier navegación, sin guardar respuestas de `/api`, aviso de versión nueva. Revisar
   que el build siga pasando el CI y que el Compose sirva el service worker.
8. **Cierre:** recorrido en el Compose con Playwright (script en `apps/web/recorridos/`, O-11) y la red cortada
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

1. `git status` y `gh run list --limit 3`.
2. La tabla de estado de abajo dice qué tarea sigue.
3. Para las pruebas de integración se levanta el PostgreSQL aparte que indica CLAUDE.md
   (`acopio-pg-pruebas` en el puerto 5439).
4. Pendientes del bloque que siguen abiertos: P-037 (escáner en un teléfono real) y P-038
   (menores de la revisión del ciclo 2).

## Estado

| Tarea | Estado | Qué falta |
|---|---|---|
| 1 Diseños | ✅ | Stitch generó la lista de pendientes y cortó por tiempo las otras tres pantallas, que se armaron con los tokens del tema en la [maqueta](../03-diseno/stitch/C04-sin-conexion/README.md). Joseph la aprobó el 2026-10-05 |
| 2 Datos locales | ✅ | `src/sin-conexion/datos-locales.ts`, con `idb`. C4 guarda la copia cada vez que abre con red (`useCopiaLocal`) y `consultarCodigo` guarda cada código que la API reconoce. Si el navegador no deja usar IndexedDB, guardar no hace nada y leer vuelve vacío, así que con red nada cambia |
| 3 Cola | ✅ | `src/sin-conexion/cola.ts`, en la misma base local, que pasa a la versión 2 (`base-local.ts`). La cola es por usuario y guarda el cuerpo listo para enviar, con `ocurridoEn` y `origenOffline`. Dos envíos seguidos desde una pestaña se juntan en uno; entre pestañas, la idempotencia por `id` evita el duplicado. Si el teléfono no deja guardar en la cola, `encolar` falla y C4 tiene que avisarlo (la copia local, en cambio, lo ignora). `esperaReintento` calcula la espera creciente; quién programa los envíos (evento `online`, abrir la app, volver a C4) va con la tarea 5 |
| 4 Sesión sin red | ✅ | `sesion/recordada.ts` guarda en localStorage id, usuario, nombre y rol, nunca el token. Al arrancar sin red (ErrorApi con estado 0) la sesión sigue con el recordado; un 401 o «Cerrar sesión» lo olvidan. Las asignaciones se guardan por usuario cada vez que llegan con red y se usan sin ella. O-12 va en `useSalida`, que usan «Más» y el menú de la cuenta; si la cola no se puede leer, cierra sin preguntar. Las pruebas de cerrar sesión que ya había ahora esperan con `waitFor`, porque cerrar mira la cola antes |
| 5 C4 sin conexión | ✅ | En cinco partes. `Sincronizador` envía la cola al abrir la app, con el evento `online`, cuando C4 lo pide y en los reintentos; `useEnLinea` sigue al navegador. C4 se porta como sin red si el navegador lo dice o si los saldos fallan por red: aviso, búsqueda en la copia, saldo estimado, «no recibir» guardado y «Guardar … en el teléfono». Si la red se cae al registrar con red, la entrada también va a la cola. El escáner reconoce sin red los códigos ya vistos. C5, C6 y C7 sin red muestran `NecesitaRed`, con «Ir a Entrada rápida» solo para el Operador. Quedaron resueltos los dos menores de P-038 (O-10). Las consultas a IndexedDB usan `networkMode: 'always'`, porque TanStack Query pausa las demás sin red |
| 6 Pastilla y pendientes | ✅ | `PastillaCola` va en la cabecera con sesión y dice «N sin sincronizar», «Enviando X de N» o «N rechazada(s)»; sin cola no aparece. El avance lo publica el `Sincronizador`, que al terminar refresca la consulta `['cola']`. La pantalla es `/consola/sin-sincronizar`, solo para el Operador: aviso con «Enviar ahora» (activo con red), lo que espera con nombre, cantidad y hora, y las rechazadas con su motivo. «Corregir» aparece solo si el rechazo es por la fecha; con otro motivo solo queda «Descartar». Nombres y unidades salen de la copia local de categorías |
| 7 Service worker | ✅ | `vite-plugin-pwa` 2.0.0 con `registerType: 'prompt'`, `injectRegister: false` y sin manifiesto. Precarga el build (68 archivos), responde `index.html` a cualquier navegación menos `/api` y no guarda respuestas de la API. Los íconos de Material Symbols bajan de Google Fonts, así que se guardan en tiempo de ejecución; sin esa caché no se verían sin red. `AvisoVersion` anuncia la versión nueva con «Actualizar». Probado con `vite preview` (nuevo en `vite.config.ts`, con el proxy de `/api`) y Playwright: con la red cortada abren `/`, `/mas` y la consola, y la fuente de íconos está disponible. Lo de «que el Compose sirva el service worker» no se pudo hacer porque el Compose todavía no tiene servicio `web`; queda para el despliegue (P-032) |
| 8 Cierre | ⬜ | |
