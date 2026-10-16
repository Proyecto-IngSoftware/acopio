---
title: "Servidor de pruebas · plan de trabajo"
type: plan
tags: [plan, despliegue, operacion]
estado: vigente
actualizado: 2026-10-16
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
| 1 Factura servida por la API (P-041, ADR-0017) | ⬜ | Todo |
| 2 Demo con contraseña por variable y cuentas en Supabase | ⬜ | Todo |
| 3 Sembrar la demo en el servidor | ⬜ | Espera a 1 y 2 desplegadas |
| 4 Recorridos y pruebas manuales contra el servidor | ⬜ | Espera a 3 |
| 5 Runbook con el proyecto de Supabase | ⬜ | Revisar si el cambio ya existe fuera del repositorio |
| 6 Decisiones abiertas (P-056, P-057) | ⬜ | Joseph decide P-056; P-057 se vigila en #58 |

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

### Task 3: Sembrar la demo en el servidor

Con las tareas 1 y 2 fusionadas y desplegadas: definir `DEMO_CONTRASENA` en Dokploy con un
valor nuevo, que no esté en el repositorio, y correr la demo una vez. Comprobar con el MCP de
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
