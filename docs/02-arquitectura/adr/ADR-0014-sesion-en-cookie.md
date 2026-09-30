---
title: "ADR-0014 · La sesión viaja en una cookie HttpOnly"
type: adr
tags: [arquitectura, adr, seguridad]
estado: vigente
adr: 14
decision: aceptada
actualizado: 2026-09-30
---

# ADR-0014 · La sesión viaja en una cookie HttpOnly

**Fecha:** 2026-09-30 · **Estado:** aceptada · **Ajusta:** D-06 del
[Bloque 0](../../superpowers/specs/2026-09-28-bloque-0-cimientos-design.md#3-decisiones-de-este-bloque)
y el contrato de sesión de [api/README.md](../../03-diseno/api/README.md)

## Contexto

La API del Bloque 0 devuelve el token de acceso en el cuerpo de `POST /api/auth/sesion`
y lo lee de la cabecera `Authorization: Bearer`. Eso obliga a la web a guardar el token
en algún lugar que JavaScript pueda leer (memoria, `sessionStorage` o `localStorage`).
Si un script malicioso llegara a correr en la página, se podría llevar la sesión.

Al empezar el ciclo 2 de la interfaz todavía no había código de la web que manejara el
token, así que cambiar el mecanismo costaba poco.

## Decisión

**La API entrega la sesión en una cookie `HttpOnly` y la web nunca ve el token.**

- `POST /api/auth/sesion` responde con la cookie `acopio_sesion`: `HttpOnly`,
  `SameSite=Strict`, `Path=/api`, `Max-Age` igual a la vida del token (8 horas) y
  `Secure` en producción. El cuerpo trae los datos del usuario y cuándo vence la
  sesión, sin el token.
- `POST /api/auth/salir` borra la cookie. No exige sesión, para que cerrar sesión
  funcione aunque el token ya haya vencido.
- El guard toma el token de la cookie y, si no hay cookie, de `Authorization: Bearer`.
  El Bearer queda para pruebas y herramientas como curl.
- Protección contra peticiones falsificadas desde otro sitio: `SameSite=Strict` y,
  como segunda barrera, la API rechaza con 403 cualquier escritura (`POST`, `PUT`,
  `PATCH`, `DELETE`) que llegue con cookie y con una cabecera `Origin` distinta de
  `APP_URL`.
- La web y la API comparten origen: en producción Traefik sirve `/` y `/api` desde el
  mismo dominio; en desarrollo Vite reenvía `/api` a la API.

`ClienteAuth` (D-06) sigue siendo la única puerta de la web a la autenticación:
`iniciarSesion`, `cerrarSesion` y `usuarioActual` (que llama a `GET /api/auth/yo`).

## Alternativas consideradas

**Token en `sessionStorage`.** Menos cambios en la API, pero el token queda al alcance
de cualquier script de la página.

**Token en `localStorage`.** Igual que la anterior y además persiste en el dispositivo,
que puede ser compartido entre voluntarios.

## Consecuencias

### A favor
- El token no es legible desde JavaScript
- La sesión sobrevive a recargas sin código en la web
- Cambiar de proveedor (ADR-0001) sigue siendo cambiar el adaptador: el inicio de sesión
  ya pasa por la API también con Supabase (P-028), así que la API puede poner la cookie
  en los dos casos

### En contra
- Hay que cuidar el origen: una web servida desde otro dominio que la API no funcionaría
  con `SameSite=Strict`
- Con Supabase habrá que guardar el token de renovación en otra cookie `HttpOnly` y
  renovarlo desde la API
- Las pruebas de integración leen el token de la cabecera `Set-Cookie` en vez del cuerpo
