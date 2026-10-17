---
title: "Servidor de pruebas · plan de trabajo"
type: plan
tags: [plan, despliegue, operacion]
estado: vigente
actualizado: 2026-10-17
---

# Servidor de pruebas · plan de trabajo

> **Para agentes:** este plan dice qué falta y en qué orden. Las tareas 1 y 2 cambian código:
> antes de escribirlo, cada una pasa por superpowers:brainstorming si hay una decisión abierta
> y por superpowers:writing-plans para los pasos con sus pruebas. Las dos van en una sola rama
> y un solo PR (P-051).

**Objetivo:** que el servidor de pruebas sirva para la primera ronda del equipo (#58) y para
la sustentación del 23 de octubre. Hacen falta tres cosas: que muestre las facturas, que
tenga los datos de la demo con cuentas por rol y que los recorridos pasen contra él.

**Dónde está:** https://acopio.josephqaz.dev, en Dokploy (app `acopio-app-yrtfbo`, servicio
Compose sobre `infra/docker-compose.yml`). La autenticación es el proyecto de Supabase
`acopio` (`seqhaiuhfzvobfmljhzy`, `us-east-1`). En el panel están `MIGRAR_AL_ARRANCAR=true`,
`SEMBRAR_AL_ARRANCAR=true` y `CORREO_ACTIVO=false`. Cómo se configuró está en
[despliegue.md](../06-operacion/despliegue.md).

**Issues:** [#53](https://github.com/Proyecto-IngSoftware/acopio/issues/53) (fecha máxima:
domingo 18 de octubre) y [#26](https://github.com/Proyecto-IngSoftware/acopio/issues/26).

## Lo que ya quedó (2026-10-16)

- #91: servicio `web` (nginx con el build de Vite, que reenvía `/api`).
- #92: migraciones y seed base al arrancar el contenedor (P-054).
- #93: correo apagable con `CORREO_ACTIVO` (P-055).
- Fuera del repositorio: proyecto de Supabase, variables en Dokploy, Garage iniciado, llaves
  rotadas, contraseña del administrador fijada en Supabase, registro público desactivado y
  `APP_URL` en la configuración de Auth.
- Probado contra el servidor: HTTPS, puertos internos cerrados, cookie `Secure` y
  `SameSite=Strict`, 403 a una escritura desde otro origen, 14 pasos del portal público y 11
  pantallas de la consola con el administrador.

## Estado

| Tarea | Estado | Qué falta |
|---|---|---|
| 1 Factura servida por la API (P-041, ADR-0017) | ✅ | Hecha en local ([plan](2026-10-16-servidor-de-pruebas-factura-y-demo.md)). El 2026-10-17 el Donador de la demo subió una factura en el servidor, y la vieron él y el Auditor (`image/webp`) |
| 2 Demo con contraseña por variable y cuentas en Supabase | ✅ | Desplegada el 2026-10-17 |
| 3 Sembrar la demo en el servidor | ✅ | Sembrada el 2026-10-17: seis cuentas en Supabase y los cuatro acopios. Los cuatro roles del equipo entran con su rol y su ubicación |
| 4 Recorridos y pruebas manuales contra el servidor | 🟡 | `consola-recepciones.mjs` pasó 6/6 contra el servidor el 2026-10-17, después de dos arreglos: nginx llega a la API por `acopio-api` (#99) y la API prepara Garage al arrancar (#100). Faltan `pruebas-manuales.sh` y los demás recorridos; `donador.mjs` necesita Mailpit y no corre allá |
| 5 Runbook con el proyecto de Supabase | ✅ | El cambio no estaba en ningún lado; se escribió el 2026-10-16 con el proyecto verificado (`ACTIVE_HEALTHY`) |
| 6 Decisiones abiertas (P-056, P-057) | 🟡 | P-056 resuelto: la ronda usa `donador1@demo.acopio.local`. P-057 se vigila en #58 |

### Task 1: Factura servida por la API

**Por qué es lo primero:** en el servidor las fotos de las facturas no se ven. La API todavía
firma URL contra Garage, que no se publica, y el navegador no alcanza esa dirección.

**Qué dice ADR-0017:** la API lee el objeto de Garage y devuelve los bytes con su
`Content-Type` (`image/webp`) y `Cache-Control: private, no-store`. Revisa el mismo permiso
de hoy: el Donador dueño, o el Auditor o el Administrador con alcance sobre el acopio. La web
pide la imagen con la cookie y la muestra desde un `blob:`. Cuando el endpoint nuevo
reemplace a las URL firmadas, se retiran `S3_URL_PUBLICA` y el segundo cliente S3.

**Piezas que ya existen:** `GET /remisiones/:codigo/evidencia/:n` entrega los bytes de la
misma forma, y el puerto `Almacen` ya tiene `leer`. La factura reutiliza las dos.

**Dónde se toca:**
- API: `modulos/comprobantes/facturas.controller.ts` y `facturas.service.ts` (hoy
  `urlFirmada` en la línea 89); `modulos/almacenamiento/almacen-s3.ts` y
  `almacenamiento.service.ts` para retirar la firma con `S3_URL_PUBLICA`.
- Web: `apps/web/src/api/donaciones.ts` (`GET /api/comprobantes/{folio}/factura`, línea 98) y
  las pantallas que muestran la foto y la miniatura.
- Contrato: regenerar con `openapi` y los tipos con `api:tipos`, y versionar los dos.
- Configuración: quitar `S3_URL_PUBLICA` de `entorno.ts`, `docker-compose.dev.yml`,
  `.env.example` y `despliegue.md`. Anotar en ADR-0017 que el cambio quedó hecho.

**Verificación:** integración con el permiso (dueño, Auditor con alcance, Auditor sin
alcance, otro Donador); Vitest de la pantalla; `recorridos/consola-comprobantes.mjs` en
local; en el servidor, subir una factura y verla desde la consola.

**Cambios al construir (2026-10-16):** la web muestra la imagen con un `<img src>` contra
`/api`, como la evidencia de remisiones, en lugar de un `blob:`. La miniatura no tiene
endpoint porque ninguna pantalla la usa. Probado: integración con los cuatro permisos y la
donación sin foto, Vitest de la hoja, y en el Compose la factura vista por nginx con curl y
con Playwright. El recorrido `consola-comprobantes.mjs` no abre la factura, así que no la
cubre. Un objeto que falta en Garage da 500 (P-058).

### Task 2: Demo con contraseña por variable y cuentas en Supabase

**Por qué:** hay dos problemas, y el segundo se encontró al planear.

1. `CONTRASENA_DEMO` está escrita en `apps/api/src/seed/demo.ts:130`, y el repositorio es
   público. Con la demo sembrada en el servidor, cualquiera entraría con esas cuentas.
2. `seed:demo` solo crea las cuentas por rol y los escenarios con el login local
   (`demo.ts:619`: con otro proveedor termina después de las entidades y los acopios), y usa
   `ProveedorLocal` directamente. En el servidor, con Supabase, no quedarían cuentas ni
   inventario ni donaciones.

**Qué se hace:**
- La contraseña sale de una variable, por ejemplo `DEMO_CONTRASENA`, sin valor por defecto
  en producción. En desarrollo puede seguir siendo `demo-acopio-2026` para no romper los
  recorridos.
- La demo crea las cuentas con el proveedor que elija `AUTH_PROVEEDOR`. `seed/main.ts` ya
  elige entre `ProveedorLocal` y `ProveedorSupabase` para el administrador; también está
  `fabrica-proveedor.ts` en `identidad/proveedor/`.
- Los recorridos que fijan `'demo-acopio-2026'` en el código (`validacion-general.mjs:20`,
  `consola-comprobantes.mjs:22`, `sin-conexion.mjs:61`) leen `DEMO_CONTRASENA`, como ya hace
  `consola-remisiones.mjs`.
- Decidir cómo se corre en el servidor: con `docker exec … node dist/seed/demo.js` una vez,
  o con una variable de arranque como `SEMBRAR_AL_ARRANCAR`. La demo cambia datos, así que la
  primera opción parece más segura; se decide en el brainstorming.
- Documentar en `recorridos.md`, `despliegue.md`, `.env.example` y la línea de `seed:demo`
  del `CLAUDE.md`.

**Verificación:** prueba de integración o unitaria de que la demo usa el proveedor
configurado; en local, `seed:demo` con `DEMO_CONTRASENA` y los recorridos completos.

**Cambios al construir (2026-10-16):** se eligió sembrar al arrancar
(`SEMBRAR_DEMO_AL_ARRANCAR`), no con `docker exec`. La demo es idempotente, no imprime la
contraseña y en producción no corre sin `DEMO_CONTRASENA`. Las piezas nuevas están en
`seed/credenciales.ts`, y `seed/main.ts` también elige el proveedor con ellas. Probado:
unitarias de `credenciales`, `seed:demo` dos veces en local, y el Compose con la demo al
arrancar y un reinicio sin errores. `consola-remisiones.mjs` falló en local porque la demo de
esa base ya estaba gastada (ver [recorridos.md](../06-operacion/recorridos.md)); conviene
correrlo contra el servidor recién sembrado.

### Task 3: Sembrar la demo en el servidor

Con las tareas 1 y 2 fusionadas y desplegadas: definir `DEMO_CONTRASENA` en Dokploy con un
valor nuevo, que no esté en el repositorio, y `SEMBRAR_DEMO_AL_ARRANCAR=true`, y volver a
desplegar. Comprobar con el MCP de
Supabase que las cuentas por rol quedaron en `auth.users`, y entrar con una de ellas.

### Task 4: Recorridos y pruebas manuales contra el servidor

- `scripts/pruebas-manuales.sh` con `API=https://acopio.josephqaz.dev/api` y las
  credenciales por variable (`ACOPIO_USUARIO`, `ACOPIO_CONTRASENA`). Es la casilla que falta
  en #53.
- Los recorridos de `apps/web/recorridos/` con `WEB=https://acopio.josephqaz.dev`. Las
  limitaciones:
  - `validacion-general.mjs`, `donador.mjs` y `consola-comprobantes.mjs` leen correos en
    Mailpit, que el servidor no tiene, y el correo está apagado. Hay que saltar o adaptar esos
    pasos.
  - `consola-motor.mjs` y `consola-remisiones.mjs` gastan la demo (ver
    [recorridos.md](../06-operacion/recorridos.md)).
  - El límite de 5 inicios de sesión por minuto aplica también en el servidor: hay que dejar
    un minuto entre recorridos.
- Lo que falle se abre como issue, con la etiqueta de su bloque.

### Task 5: Runbook con el proyecto de Supabase

`runbook.md` tiene la revisión de 72 horas antes de cada demostración, pero no nombra el
proyecto `acopio` (`seqhaiuhfzvobfmljhzy`). En el plan gratuito, Supabase pausa los proyectos
inactivos. Si Joseph ya lo anotó en otro lugar, se trae al runbook. Después se marca la
casilla RTA-03 de #26.

### Task 6: Decisiones abiertas

- [P-056](../01-requerimientos/pendientes.md): con el correo apagado, un Donador nuevo no
  puede confirmar su cuenta. Decide Joseph.
- [P-057](../01-requerimientos/pendientes.md): `net::ERR_FAILED` intermitente en la consola
  del navegador. Se vigila en la ronda de pruebas (#58).

## Siguiente sesión (acordado el 2026-10-16)

La meta es que todo funcione el domingo 18 de octubre: la sustentación llega antes de lo que
parece. Orden:

1. **Joseph, en Dokploy:** fijar `DEMO_CONTRASENA` (un valor nuevo, fuera del repositorio) y
   `SEMBRAR_DEMO_AL_ARRANCAR=true`, y redesplegar. El 2026-10-16, Supabase solo tenía
   `admin@acopio.co`. Después, verificar las cinco cuentas en `auth.users`, entrar con una y
   subir y ver una factura en el servidor (tarea 3).
2. **Maquetas del ciclo 3 del motor en Stitch** (Receptor y público,
   [especificación](../superpowers/specs/2026-10-06-bloque-4-motor-design.md) §7): C13
   Recepción con escáner y foto obligatoria (HU-12), C20 Reportar necesidad con el aviso de
   que la nota es pública (HU-13), «Mi zona» como inicio del Receptor y la capa de zonas en
   P05. La API ya existe; hoy el Receptor solo tiene C10. Ninguna pantalla se escribe sin la
   maqueta aprobada por Joseph, así que esto va primero.
3. **Mientras Joseph revisa las maquetas, los escenarios de prueba por rol**
   ([#55](https://github.com/Proyecto-IngSoftware/acopio/issues/55)), en la bóveda: «entro
   como…, hago…, debería ver…», tomados de los criterios del
   [Avance 2](../entregas/avance-02-requisitos.md#historias), con las cuentas de la demo y
   `donador1@demo.acopio.local` para el Donador (P-056). Quedan como «no probar todavía»
   HU-02, HU-03, HU-15, el criterio de RedAcopio de HU-01, y HU-12 y HU-13 si el ciclo 3 no
   llega.
4. **Construir el ciclo 3** con las maquetas aprobadas: plan en `docs/05-planes/`, una rama y
   un PR.
5. **Con la demo sembrada, todo contra el servidor (tarea 4):** `pruebas-manuales.sh`, los
   recorridos sin los pasos de Mailpit y `consola-remisiones.mjs` con la demo recién
   sembrada.

Decisión del 2026-10-16 (Joseph): el ciclo 3 entra recortado. Para el domingo van C13
Recepción (HU-12) y C20 Reportar necesidad (HU-13), con la entrada del Receptor desde «Más».
«Mi zona» como pantalla propia y la capa de zonas en P05 quedan para después del domingo.
Los escenarios por rol quedaron en [escenarios-por-rol.md](../06-operacion/escenarios-por-rol.md).

## Después de este plan

- Semana 12, hasta el 25 de octubre: primera ronda de pruebas del equipo en el servidor
  ([#58](https://github.com/Proyecto-IngSoftware/acopio/issues/58)), con la demo y las
  facturas listas.
- Esta semana, en paralelo:
  [#54](https://github.com/Proyecto-IngSoftware/acopio/issues/54) (levantar Acopio en otro
  equipo con el README) y [#55](https://github.com/Proyecto-IngSoftware/acopio/issues/55)
  (escenarios de prueba por rol).
- Corte del 23 de octubre: interfaz del motor
  ([#35](https://github.com/Proyecto-IngSoftware/acopio/issues/35), ciclo 3) y sustentación
  ([#47](https://github.com/Proyecto-IngSoftware/acopio/issues/47)), con el proyecto en
  ejecución en el servidor.
