---
title: "Sesión 2026-10-30 · Captcha con ALTCHA y cola de correo segura"
type: informe
tags: [operacion, sesion]
estado: vigente
actualizado: 2026-10-30
---

# Sesión 2026-10-30 · Captcha con ALTCHA y cola de correo segura

Joseph pidió un captcha contra el spam de registros y que la cola de correo funcionara con dos
instancias de la API (P-089). Eligió ALTCHA para el registro de Donador y las reservas sin cuenta.
Las dos cosas quedaron construidas, probadas y documentadas. También pidió el complemento de la
sustentación en PDF, revisado.

## Qué cambió

| PR o commit | Qué trae |
|---|---|
| Rama `feat/captcha-y-cola-segura` | Módulo `captcha` (reto en `GET /api/captcha/reto`, `CaptchaGuard` con `@RequiereCaptcha()`, tabla `captcha_usado` con su migración, variables `CAPTCHA_*`), los dos endpoints protegidos, `pruebaCaptcha()` en la web, `CorreoSalienteDao.reclamar` con `FOR UPDATE SKIP LOCKED`, contrato y tipos regenerados, [ADR-0024](../../02-arquitectura/adr/ADR-0024-captcha-con-altcha.md), P-089 resuelto, el complemento actualizado y su PDF |

Fuera del repositorio: el `.env` local tiene una `CAPTCHA_LLAVE` generada con
`openssl rand -hex 32`, y la contraseña local del administrador quedó igual a
`SEED_ADMIN_CONTRASENA` (solo en la base local).

## Pruebas

- Verificación completa con Node 22, código de salida 0: lint, typecheck, depcruise (248
  módulos), colores, unitarias (116 de shared, 103 de la API y 1258 de la web) e integración
  (560).
- P-089 con prueba primero: dos `NotificacionService` sobre la misma base procesan la cola a la
  vez con un servidor de correo lento. Con el código anterior salieron seis correos repetidos; con
  el reclamo, cada uno sale una vez.
- Captcha: 7 pruebas de integración (reto firmado, prueba válida, sin prueba, prueba falsa,
  solución alterada, reutilización y limpieza de vencidas). En la web, una prueba resuelve un reto
  real y el servidor verifica la solución.
- Recorridos contra el Compose con la API reconstruida: `portal-turnos.mjs` 8 de 8 y
  `donador.mjs` 8 de 8, los dos enviando formularios con captcha desde Chromium.
- PDF del complemento: 10 páginas A4, fuentes incrustadas, 6 figuras, revisado página por
  página.

## Decisiones

- Captcha con ALTCHA en el registro de Donador y las reservas sin cuenta (Joseph;
  [ADR-0024](../../02-arquitectura/adr/ADR-0024-captcha-con-altcha.md)).
- La web resuelve el reto sin mostrar ningún componente, así que las pantallas no cambian y no hace
  falta maqueta nueva (C, en el ADR).
- En las pruebas de integración el captcha queda encendido, con una llave fija y dificultad 20,
  para que la protección corra en todas las suites (C).

## Errores y correcciones

- Un script mío agregó el reto simulado en bloques equivocados de `Reservar.test.tsx`: dos pruebas
  siguieron fallando y dos tenían un reto que no usaban. Se corrigieron a mano.
- La base del Compose no tenía aplicada la migración de `captcha_usado`: el contenedor no migra al
  arrancar en desarrollo. Se aplicó con `db:migrar`.
- `donador.mjs` falló la primera vez porque el Compose de desarrollo heredaba `SMTP_SEGURO=true`
  del `.env`, que apunta a Resend, y Mailpit no habla TLS. `docker-compose.dev.yml` ahora fija las
  variables de SMTP para Mailpit.
- En el PDF del complemento, la página antes de cada diagrama apaisado quedaba casi vacía y la
  tabla de transiciones partía los nombres de método. El generador ahora lleva el título a la
  página horizontal con su diagrama, fija los anchos de las columnas en la cuadrícula de la tabla
  y deja partir `Clase.metodo` después del punto.

## Pendiente

- Joseph pone `CAPTCHA_LLAVE` en el panel de Dokploy antes de fusionar; sin ella, la API del
  servidor no arranca
  ([plan](../../05-planes/2026-10-30-captcha-y-cola-segura.md),
  [plan de acción, fila 24](../../05-planes/plan-de-accion.md)).

## Depende de Joseph

- `CAPTCHA_LLAVE` en Dokploy (`openssl rand -hex 32`), y avisar para fusionar el PR.
