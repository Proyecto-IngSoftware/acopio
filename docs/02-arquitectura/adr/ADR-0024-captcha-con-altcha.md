---
title: "ADR-0024 · Captcha con ALTCHA en los formularios públicos"
type: adr
tags: [arquitectura, adr, seguridad, identidad, turnos]
estado: vigente
adr: 24
decision: aceptada
actualizado: 2026-10-30
---

# ADR-0024 · Captcha con ALTCHA en los formularios públicos

**Fecha:** 2026-10-30 · **Estado:** aceptada · **Decidió:** Joseph ·
**Plan:** [2026-10-30-captcha-y-cola-segura](../../05-planes/2026-10-30-captcha-y-cola-segura.md)

## Contexto

Dos endpoints públicos crean filas y mandan correo: el registro de Donador
(`POST /api/auth/registro`) y la reserva de turno sin cuenta
(`POST /api/turnos/jornadas/:id/reservas`). Desde que el correo quedó encendido con Resend
(P-055), un bot que los llamara en bucle llenaría la base de cuentas y reservas falsas y gastaría
el envío de correo del dominio. Hasta ahora solo los protegía un límite de 5 peticiones por minuto
por IP, que vive en la memoria de cada instancia y no frena a quien cambia de IP.

## Decisión

Los dos endpoints exigen una prueba de ALTCHA en el encabezado `X-Captcha`:

- La API firma un reto con su llave (`CAPTCHA_LLAVE`) en `GET /api/captcha/reto`. La llave no
  sale de la API.
- La web pide un reto al enviar el formulario, lo resuelve en el navegador con `altcha-lib`
  (prueba de trabajo con SHA-256, alrededor de un segundo con la dificultad por defecto) y manda
  la prueba. No se agrega ningún componente visible.
- El guard `CaptchaGuard`, que se pone con `@RequiereCaptcha()`, verifica la firma, la solución y
  el vencimiento (10 minutos). Si algo falla responde 400 `CAPTCHA_INVALIDO`.
- Cada prueba sirve una vez: su `nonce` queda en la tabla `captcha_usado`, y un segundo uso choca
  con la llave primaria. Como el registro está en la base, vale también con varias instancias.
- `CAPTCHA_ACTIVO` lo apaga, y `CAPTCHA_DIFICULTAD` fija el contador más alto que puede tocar
  resolver. Con el captcha encendido y sin llave, la API no arranca.

El módulo `captcha` es una hoja del grafo: no importa ningún módulo de dominio, y lo importan
`identidad` y `turnos`.

## Alternativas consideradas

- **Cloudflare Turnstile.** Es más fuerte contra bots y gratis, pero necesita una cuenta en
  Cloudflare con dos llaves, carga un script de Cloudflare en el portal y obliga a la API a
  consultar a Cloudflare en cada envío.
- **Google reCAPTCHA v3.** Es invisible y da un puntaje de riesgo, pero necesita cuenta de Google y
  Google ve el tráfico de quienes usan el portal.
- **El componente web de ALTCHA (`altcha-widget`).** Muestra la casilla «No soy un robot». Habría
  cambiado las pantallas del registro y la reserva, que ya tienen maqueta aprobada, para algo que
  la web puede hacer sin mostrar nada.

## Consecuencias

### A favor

- No hay cuenta externa, cookies ni rastreo, y la verificación no depende de ningún servicio.
- Cada registro o reserva le cuesta al bot alrededor de un segundo de cómputo, y no puede reusar
  una prueba.
- Las pantallas no cambiaron.

### En contra

- Una prueba de trabajo frena bots baratos, pero no a un atacante dispuesto a pagar el cómputo.
  El límite por IP sigue activo como segunda barrera.
- En un teléfono lento, enviar el formulario tarda un segundo más.
- La llave es un secreto más que hay que poner en cada entorno (en el servidor, en el panel de
  Dokploy).
