---
title: "ADR-0026 · Los componentes colaboran por interfaces inyectadas"
type: adr
tags: [arquitectura, adr]
estado: vigente
adr: 26
decision: aceptada
actualizado: 2026-11-27
---

# ADR-0026 · Los componentes colaboran por interfaces inyectadas

**Fecha:** 2026-11-27 · **Estado:** aceptada · **Es el «ADR-003» del curso**, que pide
justificar una decisión sobre la organización, la colaboración o la integración de los
componentes ([guía del Sprint 3](../../entregas/guias/Avance%20de%20Proyecto%20Sprint%203%20–%20IS1.pdf)).
**Deriva de:** [ADR-0008](ADR-0008-arquitectura-stack-inicial.md) (monolito modular) y
[ADR-0023](ADR-0023-organizacion-en-paquetes.md) (paquetes y capas). **Diagrama:**
[componentes-y-despliegue.html](../diagramas/componentes-y-despliegue.html), con los PNG
`arquitectura-05-componentes-y-conectores.png` y `arquitectura-06-despliegue.png` en
[assets/diagramas](../../assets/diagramas).

ADR-0023 dice dónde vive cada pieza de código. Este registro dice cómo se hablan los
componentes de la versión 1.0.0: entre ellos, con la web y con los sistemas externos.

## Contexto

La API depende de seis servicios que no controla el equipo: Supabase Auth, el SMTP de
Hostinger, Nominatim, RedAcopio, Garage y PostgreSQL. Cuatro hechos pesaron:

- Las pruebas de integración (unas 560) corren en CI sin red hacia afuera. Si un módulo llamara
  a Nominatim o a Supabase directamente, cada prueba dependería de que ese servicio respondiera.
- Hay dos formas de autenticar: cuentas locales en desarrollo y Supabase en el servidor. La
  regla de negocio es la misma en los dos casos.
- `identidad` tiene que validar que una asignación apunte a un acopio o una zona que existen,
  pero `acopios` ya depende de `identidad`. Importarlo directo crearía un ciclo, y RNF-13 prohíbe
  los ciclos entre módulos.
- La web y la API cambian juntas. Si los tipos de las respuestas se copian a mano, la web
  compila contra una forma que la API ya no devuelve.

## Decisión

Cada colaboración que cruza un límite pasa por una interfaz con nombre:

| Interfaz | La ofrece | La requiere | Adaptadores |
|---|---|---|---|
| REST `/api` con contrato `openapi.json` | API (controladores) | Navegador (SPA) | tipos generados en `apps/web/src/api/esquema.d.ts` |
| `ProveedorIdentidad` (token `PROVEEDOR_IDENTIDAD`) | `identidad` | guards de sesión, `identidad` | `local` y `supabase`, elegido con `AUTH_PROVEEDOR` |
| `Almacen` (token `ALMACEN`) | `almacenamiento` | `acopios`, `comprobantes`, `motor`, `importacion` | Garage por S3 y memoria |
| `Geocodificador` (token `GEOCODIFICADOR`) | `acopios` | `acopios` | Nominatim y uno falso para pruebas |
| `FuenteAcopios` (token `FUENTE_ACOPIOS`) | `importacion` | la tarea programada, el controlador y el script `importar-redacopio.ts` | RedAcopio |
| `VerificadorUbicaciones` (token `VERIFICADOR_UBICACIONES`) | `acopios` | `identidad` | `UbicacionesService` |
| `NotificacionService.encolar` y `BitacoraService` | `notificaciones` y `auditoria` | los módulos de dominio | uno solo, dentro de la transacción de quien llama |

Las interfaces se declaran como tipos de TypeScript con un `Symbol` de token, y el contenedor
de inyección de NestJS entrega la implementación. Un módulo de dominio nunca construye su
adaptador ni importa el SDK de un servicio externo. `.dependency-cruiser.cjs` rechaza en CI
cualquier import entre módulos que no esté en la tabla «Dependencias permitidas» de la
[vista general](../vista-general.md#dependencias-permitidas).

## Alternativa considerada

Llamar al SDK o a la URL del servicio externo desde el servicio que lo necesita (por ejemplo,
`fetch` a Nominatim dentro de `AcopiosService`) y cambiar de entorno con condicionales
(`if (NODE_ENV === 'test')`). Se descartó por tres razones:

- Las pruebas tendrían que interceptar la red o depender de servicios externos, y fallarían por
  causas ajenas al código.
- Los condicionales por entorno quedarían repartidos en cada servicio, y cambiar Supabase por
  otro proveedor obligaría a tocar todos los que autentican.
- El ciclo entre `identidad` y `acopios` solo se rompía moviendo la validación de
  ubicaciones fuera de `identidad`, donde la regla pertenece.

Separar cada integración en un microservicio tampoco entró: ADR-0008 ya eligió un monolito
para un equipo de cuatro y un solo VPS.

## Justificación

- **Requisitos:** P-025 (login local en desarrollo y Supabase en el servidor, con la misma
  regla), RNF-13 (módulos sin ciclos) y la operación sin correo con `CORREO_ACTIVO=false` (P-055), que se resuelve en la
  cola y no en cada servicio.
- **Calidad:** las pruebas de integración reemplazan los adaptadores en
  `apps/api/test/app-prueba.ts` con `overrideProvider(GEOCODIFICADOR)` y
  `overrideProvider(ALMACEN)` y corren contra PostgreSQL real sin salir a Internet. Así pasan en
  CI en cada PR.
- **Restricciones:** un VPS pequeño y un equipo que aprende NestJS. La inyección de NestJS ya
  viene con el framework, así que no hay contenedor ni librería nueva.

## Consecuencias

### A favor

- Cambiar un proveedor toca un adaptador y su registro en el módulo. Pasar de cuentas locales
  a Supabase fue cambiar `AUTH_PROVEEDOR`.
- Las pruebas no dependen de la red, y los adaptadores falsos se reutilizan en todas.
- La dirección de las dependencias se ve en el diagrama y la hace cumplir una herramienta, no
  una revisión manual.

### En contra

- Cada interfaz suma un archivo, un token y un registro en el módulo. Para un solo adaptador
  (`FuenteAcopios` con RedAcopio) es más ceremonia de la necesaria hoy.
- Un error en el registro del token (`useExisting` apuntando a otra clase) solo aparece al
  arrancar la API, no al compilar.
- El adaptador falso puede divergir del real. Nominatim y Supabase solo se prueban contra el
  servicio verdadero en el servidor de pruebas y en los recorridos.
- `importacion` y `motor` dependen de cinco o seis módulos cada uno: la inyección ordena las
  dependencias, pero no las reduce.

## Evidencia

- Interfaces y tokens: `apps/api/src/modulos/identidad/proveedor/proveedor-identidad.ts`,
  `apps/api/src/modulos/almacenamiento/almacen.ts`, `apps/api/src/modulos/acopios/geocodificacion.ts`,
  `apps/api/src/modulos/importacion/fuentes/fuente-acopios.ts`,
  `apps/api/src/comun/ubicaciones/verificador-ubicaciones.ts`.
- Adaptadores: `proveedor-local.ts` y `proveedor-supabase.ts` (con `fabrica-proveedor.ts`),
  `almacen-s3.ts` y `almacen-memoria.ts`, `GeocodificadorNominatim` en `geocodificacion.ts`,
  `importacion/fuentes/redacopio/`.
- Registro: `identidad.module.ts` (`provide: PROVEEDOR_IDENTIDAD`), `almacenamiento.module.ts`
  (`provide: ALMACEN`), `acopios.module.ts` (`provide: GEOCODIFICADOR` y
  `provide: VERIFICADOR_UBICACIONES`).
- Reemplazo en pruebas: `apps/api/test/app-prueba.ts`.
- Límites: `apps/api/.dependency-cruiser.cjs`, que corre en el job `verificar` de
  `.github/workflows/ci.yml`.
- Contrato web y API: `docs/03-diseno/api/openapi.json` y `apps/web/src/api/esquema.d.ts`.
