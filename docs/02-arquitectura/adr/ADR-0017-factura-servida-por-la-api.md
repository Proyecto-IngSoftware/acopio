---
title: "ADR-0017 · La API sirve la foto de la factura y Garage no se expone"
type: adr
tags: [arquitectura, adr, almacenamiento, custodia]
estado: vigente
adr: 17
decision: aceptada
actualizado: 2026-10-06
---

# ADR-0017 · La API sirve la foto de la factura y Garage no se expone

**Fecha:** 2026-10-06 · **Estado:** aceptada · **Precisa:**
[ADR-0012](ADR-0012-almacenamiento-garage.md) · **Resuelve:**
[P-041](../../01-requerimientos/pendientes.md)

## Contexto

`GET /api/comprobantes/{folio}/factura` devuelve dos URL firmadas de Garage, la de la
foto y la de su miniatura, que vencen a los cinco minutos. El navegador las abre
directamente, así que el host de la firma tiene que ser uno que el navegador alcance.
En desarrollo eso se resolvió con `S3_URL_PUBLICA` (`http://localhost:3900`).

En producción la [vista general](../vista-general.md) dice que el almacenamiento nunca
se expone. Para que esas URL funcionen habría que publicar al menos la ruta de lectura
de Garage detrás de Caddy, con un subdominio propio.

Se compararon dos salidas:

1. Exponer solo la lectura de Garage. Es lo más simple y los bytes no pasan por la
   API, pero deja una parte de Garage en internet y suma un subdominio y su
   certificado.
2. Que la API entregue la imagen. Garage sigue en la red interna y el permiso se
   revisa en un solo lugar. Cada foto pasa por la API.

## Decisión

**La API entrega los bytes de la foto y de la miniatura. Garage no se publica en
ningún entorno.**

- Un endpoint de la API lee el objeto de Garage y lo devuelve con su `Content-Type`
  (`image/webp`) y `Cache-Control: private, no-store`. Revisa el mismo permiso que hoy
  revisa la URL firmada: el Donador dueño, o el Auditor o el Administrador con
  alcance sobre el acopio.
- La web pide la imagen con la cookie de sesión, como cualquier otra petición a
  `/api`, y la muestra desde un `blob:`.
- `S3_URL_PUBLICA` y el segundo cliente S3 que firma con ese host se retiran cuando
  el endpoint nuevo reemplace a las URL firmadas.

## Consecuencias

- La subida admite hasta 8 MB y la foto se guarda convertida a WebP, así que pasarla
  por la API cuesta poco para el volumen esperado.
- El contrato OpenAPI cambia: el endpoint de la factura deja de devolver URL. Se
  regeneran el contrato y los tipos de la web.
- El cambio de código queda en
  [#26](https://github.com/Proyecto-IngSoftware/acopio/issues/26), antes del primer
  despliegue. Hasta entonces, en desarrollo siguen las URL firmadas.
