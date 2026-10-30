---
title: "Captcha en los formularios públicos y cola de correo con varias instancias · plan"
type: plan
tags: [plan, identidad, turnos, notificaciones, api, web]
estado: vigente
actualizado: 2026-10-30
---

# Captcha en los formularios públicos y cola de correo con varias instancias · plan

> **Para agentes:** se ejecuta con superpowers:executing-plans, tarea por tarea, con pruebas
> primero (superpowers:test-driven-development). Los pasos usan casillas (`- [ ]`).

**Objetivo:** que un bot no pueda llenar de cuentas y reservas falsas el registro de Donador y la
reserva de turno sin cuenta, y que la cola `correo_saliente` no envíe un correo dos veces cuando
corran dos instancias de la API ([P-089](../01-requerimientos/pendientes.md)).

**Decisiones de Joseph (30 de octubre):** el captcha es ALTCHA y protege los dos formularios
públicos que crean filas y mandan correo: `POST /api/auth/registro` y
`POST /api/turnos/jornadas/:id/reservas`.

**Diseño:**

- ALTCHA es una prueba de trabajo. La API firma un reto con una llave propia (`CAPTCHA_LLAVE`),
  el navegador lo resuelve y manda la prueba; la API la verifica sin consultar a nadie. No hay
  cuenta externa, cookies ni rastreo. Se usa `altcha-lib` (protocolo v2) en los dos lados.
- La web no muestra ningún componente nuevo. Al enviar el formulario pide el reto, lo resuelve con
  `solveChallenge` y manda la prueba en el encabezado `X-Captcha`. Como la pantalla no cambia, no
  hace falta una maqueta nueva. Si la prueba falla, el formulario muestra el error de la API como
  cualquier otro.
- Una prueba sirve una sola vez: la API guarda el `nonce` del reto en la tabla `captcha_usado`
  con su vencimiento, y un segundo uso choca con la llave primaria. Al estar en la base, vale
  también con varias instancias.
- La cola se reclama de forma atómica. Un solo `UPDATE … WHERE id IN (SELECT … FOR UPDATE SKIP
  LOCKED)` toma el lote y corre su `enviar_despues_de` cinco minutos, como un préstamo. Otra
  instancia salta las filas bloqueadas y, cuando las ve libres, ya no están listas. Si la
  instancia que las tomó se cae, el préstamo vence y se reintentan.

## Estado

| Tarea | Estado |
|---|---|
| 1. Cola con varias instancias (P-089) | ✅ `CorreoSalienteDao.reclamar` con `FOR UPDATE SKIP LOCKED`; la prueba de dos instancias falló antes (seis correos repetidos) y pasa ahora |
| 2. Retos y verificación en la API | ✅ Módulo `captcha`, tabla `captcha_usado`, variables y 7 pruebas de integración |
| 3. Proteger registro y reservas | ✅ `@RequiereCaptcha()` en los dos endpoints; las pruebas que los llaman usan `reservaDeCaptchas` |
| 4. La web resuelve el reto | ✅ `pruebaCaptcha()` en el registro y la reserva; las pantallas no cambiaron |
| 5. Cierre | 🟡 ADR-0024, P-089, verificación y recorridos hechos. Falta que Joseph ponga `CAPTCHA_LLAVE` en Dokploy antes de fusionar |

## Task 1: Cola de correo segura con varias instancias (P-089)

- [ ] Prueba de integración que falla hoy: dos `NotificacionService` sobre la misma base
  procesan la cola a la vez con un transporte lento, y cada correo sale exactamente una vez.
- [ ] `CorreoSalienteDao.reclamar(maxIntentos, limite, prestamo)` con el `UPDATE` atómico; el
  servicio lo usa en lugar de `listos`.
- [ ] Las pruebas de la cola que ya existen siguen pasando.

## Task 2: Retos y verificación en la API

- [ ] `altcha-lib` en `apps/api`, versión fijada con al menos dos semanas de publicada.
- [ ] Variables `CAPTCHA_ACTIVO` (por defecto `true`) y `CAPTCHA_LLAVE` (obligatoria si está
  activo), y `CAPTCHA_COSTO`. Pruebas de `entorno`.
- [ ] Migración: tabla `captcha_usado (nonce text primary key, expira_en timestamptz)`.
- [ ] Módulo nuevo `captcha`, hoja del grafo: `CaptchaService` (crear reto, verificar),
  `CaptchaUsadoDao`, `GET /api/captcha/reto` público con límite por IP, y el guard
  `CaptchaGuard` con el decorador `@RequiereCaptcha()`. Se agrega a `vista-general.md` y a
  `.dependency-cruiser.cjs`.
- [ ] Pruebas de integración: sin encabezado, con una prueba falsa, con una vencida y con una
  reutilizada responden 400 `CAPTCHA_INVALIDO`; con una prueba válida pasa.

## Task 3: Proteger el registro y las reservas

- [ ] `@RequiereCaptcha()` en `DonadorController.registrar` y `PublicoController.reservar`.
- [ ] Las pruebas de integración de esos dos endpoints mandan una prueba válida; las demás
  suites siguen con el captcha apagado.
- [ ] Contrato OpenAPI y tipos de la web regenerados.

## Task 4: La web resuelve el reto

- [ ] `altcha-lib` en `apps/web` y `src/api/captcha.ts` con `resolverCaptcha()`.
- [ ] `registrarDonador` y `useReservar` mandan `X-Captcha`.
- [ ] Pruebas de la web: el registro y la reserva piden el reto y mandan el encabezado.

## Task 5: Cierre

- [ ] ADR-0024 (captcha con ALTCHA), P-089 resuelto, catálogo de piezas reutilizables,
  `.env.example`, Compose y la memoria del servidor.
- [ ] Antes de fusionar, Joseph pone `CAPTCHA_LLAVE` en Dokploy: con el captcha activo y sin
  llave, la API no arranca.
- [ ] Verificación completa, recorridos de registro y reserva contra el Compose, informe de sesión
  y PR.

## Registro de cambios

- 2026-10-30 · Plan creado tras las respuestas de Joseph.
