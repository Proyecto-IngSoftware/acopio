---
title: "Entrada única para todas las cuentas · plan"
type: plan
tags: [plan, identidad, acceso]
estado: vigente
actualizado: 2026-10-19
---

# Entrada única para todas las cuentas · plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un solo formulario de inicio de sesión en `/entrar` para el Donador y el equipo, con
«Correo o nombre de usuario», e `identidad` migrado a DAO.

**Architecture:** `POST /api/auth/sesion` resuelve la cuenta por correo (si lleva «@») o por
nombre de usuario y llama al proveedor como hoy; sale `POST /api/auth/donador/sesion`. La web
deja un solo método de inicio de sesión en `ClienteAuth`, C01 sirve a todos y P13 queda solo
para crear la cuenta de donador. Antes, `identidad` pasa sus consultas a DAO sin cambiar
conducta.

**Tech Stack:** NestJS 11, Prisma 7.10, PostgreSQL 16, React con Vite, Vitest, Jest, Playwright.

**Spec:** [docs/superpowers/specs/2026-10-19-entrada-unica-design.md](../specs/2026-10-19-entrada-unica-design.md)

## Global Constraints

- Un solo mensaje de error para todo fallo de inicio de sesión: «Usuario o contraseña
  incorrectos» en la API (401) y el texto que ya muestra C01 en la web.
- Límite de 5 intentos por minuto por IP en `POST /api/auth/sesion`.
- `usuario` en el cuerpo: `z.string().trim().min(1).max(254)`, descrito como «Correo o nombre
  de usuario».
- Con «@» se busca por `correo` en minúsculas y recortado; sin «@», por `username` (citext).
- La cuenta entra solo si está `ACTIVO` y tiene correo, sin importar el rol.
- `?volver=` solo acepta rutas que empiezan por `/` y no por `//`.
- Textos de C01: título «Entrar a Acopio», campo «Correo o nombre de usuario», enlace «¿Vas a
  donar y no tienes cuenta? Crea tu cuenta de donador» a `/donador`.
- Texto de P13 sin sesión: «¿Ya tienes cuenta? Entrar» a `/entrar`.
- No se escribe código de C01 ni P13 sin la maqueta ajustada y aprobada por Joseph (tarea 4).
- Base de pruebas de integración compartida: ninguna prueba nueva siembra datos globales; crea
  sus propias cuentas con correo y nombre únicos.

## Review Focus

- Correo con mayúsculas o espacios alrededor («  Donador1@Demo.Acopio.Local »): debe entrar.
- `?volver=//sitio-externo.com` o `?volver=https://…`: debe ignorarse y usar el destino por rol.
- Un Donador `INVITADO` (sin confirmar el correo): mismo 401 que un correo inexistente.
- Una cuenta del equipo creada sin correo real: entra por nombre de usuario como hoy.
- Un Donador con sesión que abre `/entrar`: ve el formulario y puede entrar con otra cuenta,
  como hoy en C01.

---

### Task 1: Migrar `identidad` a DAO

Sin cambio de conducta. La red son las pruebas de integración de identidad que ya existen.

**Files:**
- Modify: `apps/api/src/modulos/identidad/dao/usuario.dao.ts`
- Create: `apps/api/src/modulos/identidad/dao/invitacion.dao.ts`,
  `verificacion-correo.dao.ts`, `asignacion.dao.ts`, `identidad-local.dao.ts`
- Modify: `sesion/sesion.service.ts`, `donador/donador.service.ts`,
  `autenticacion/autenticacion.guard.ts`, `autenticacion/alcance.service.ts`,
  `usuarios/usuarios.service.ts`, `invitaciones/invitaciones.service.ts`,
  `proveedor/proveedor-local.ts`, `identidad.module.ts`
- Modify: `apps/api/.dependency-cruiser.cjs` (agregar `'identidad'` a `MIGRADOS_A_DAO`)
- Modify: `docs/02-arquitectura/adr/ADR-0019-dao-sobre-prisma.md` (sección «Alcance»)

**Interfaces:**
- Produces: DAO con la forma de `JornadaDao`: un método por consulta, lectura con
  `bd: ClienteBd = this.prisma`, escritura con `tx: ClienteBd` obligatorio. Los servicios abren
  transacción con `Transacciones.ejecutar`.
- Produces: `UsuarioDao.paraSesion(por: { correo: string } | { username: string })` →
  `{ id, username, nombre, rol, estado, correo } | null` (lo usa la tarea 2).

- [ ] **Step 1: Correr la red antes de tocar nada**

Run: `cd apps/api && PRUEBAS_PG_URL=postgresql://acopio_owner:acopio@127.0.0.1:5439 bunx jest -c jest.int.config.cjs --runInBand src/pruebas-integracion/autenticacion.int.test.ts src/pruebas-integracion/usuarios.int.test.ts src/pruebas-integracion/donador.int.test.ts src/pruebas-integracion/registro-donador.int.test.ts src/pruebas-integracion/sesion-cookie.int.test.ts`
Expected: todo en verde (anotar el número de pruebas).

- [ ] **Step 2: Agregar `'identidad'` a `MIGRADOS_A_DAO` y ver fallar depcruise**

Run: `bun run --filter @acopio/api depcruise`
Expected: FALLA con `acceso-a-datos-por-dao` en los siete archivos de arriba.

- [ ] **Step 3: Mover cada consulta a su DAO**

Una consulta de Prisma por método, con nombres que digan qué hace (`porId`, `paraSesion`,
`crearInvitado`, `marcarCanjeada`…). Los `$queryRaw … FOR UPDATE` de `usuarios.service.ts`
pasan como `bloquear(id, tx)`, igual que `JornadaDao.bloquear`. El guard inyecta `UsuarioDao`.

- [ ] **Step 4: depcruise, tipos y la red otra vez**

Run: `bun run --filter @acopio/api depcruise && bun run typecheck` y el comando del paso 1.
Expected: depcruise y tipos en verde; las mismas pruebas que en el paso 1, todas en verde.

- [ ] **Step 5: Commit**

`git commit -m "Identidad: acceso a datos por DAO (ADR-0019)"`

### Task 2: API, un solo inicio de sesión

**Files:**
- Modify: `apps/api/src/modulos/identidad/sesion/sesion.service.ts`, `sesion.controller.ts`
- Modify: `apps/api/src/modulos/identidad/donador/donador.service.ts`, `donador.controller.ts`
  (salen `iniciarSesion` y `POST donador/sesion`)
- Test: `apps/api/src/pruebas-integracion/registro-donador.int.test.ts`,
  `autenticacion.int.test.ts`
- Modify: `docs/03-diseno/api/openapi.json`, `apps/web/src/api/esquema.d.ts` (generados)

**Interfaces:**
- Consumes: `UsuarioDao.paraSesion` (tarea 1).
- Produces: `POST /api/auth/sesion` con `{ usuario: string, contrasena: string }` →
  `SesionDto`, para cualquier rol.

- [ ] **Step 1: Reemplazar en `registro-donador.int.test.ts` el `entrar` por `POST /api/auth/sesion` con `{ usuario: correo, contrasena }` y cambiar las dos pruebas de «puerta»**

```ts
it('el Donador entra por /auth/sesion con su correo, sin importar mayúsculas ni espacios', async () => {
  // Donador activo creado en la prueba con correo único
  const r = await entrar(`  ${correo.toUpperCase()}  `, CONTRASENA);
  expect(r.status).toBe(200);
  expect(r.body.usuario.rol).toBe('DONADOR');
});
it('una cuenta del equipo también entra con su correo', async () => {
  const r = await entrar(correoOperador, contrasenaOperador);
  expect(r.status).toBe(200);
  expect(r.body.usuario.username).toBe(usernameOperador);
});
it('POST /auth/donador/sesion ya no existe', async () => {
  const r = await a.http().post('/api/auth/donador/sesion').send({ correo, contrasena: CONTRASENA });
  expect(r.status).toBe(404);
});
```

«Un pendiente da el mismo 401 que un correo inexistente» se mantiene, ahora contra
`/auth/sesion`.

- [ ] **Step 2: Ver fallar**

Run: `bunx jest -c jest.int.config.cjs --runInBand src/pruebas-integracion/registro-donador.int.test.ts`
Expected: FALLA: el Donador recibe 401 en `/auth/sesion` y la ruta vieja responde.

- [ ] **Step 3: `SesionService.iniciar(identificador: string, contrasena: string)`**

Con «@» llama `paraSesion({ correo: identificador.trim().toLowerCase() })`; si no,
`paraSesion({ username: identificador })`. Quita la condición `rol === 'DONADOR'`; el resto de
la regla y la llamada señuelo al proveedor quedan igual. El DTO pasa a `max(254)` con la
descripción de las restricciones globales. Sale `DonadorService.iniciarSesion` y su ruta.

- [ ] **Step 4: Ver pasar y correr la red de la tarea 1**

Run: el comando del paso 1 de la tarea 1.
Expected: todo en verde.

- [ ] **Step 5: Contrato y tipos**

Run: `bun run --filter @acopio/api openapi && bun run --filter @acopio/web api:tipos && git diff --stat docs/03-diseno/api/openapi.json apps/web/src/api/esquema.d.ts`
Expected: desaparece `/api/auth/donador/sesion` y cambia la descripción de `usuario`.

- [ ] **Step 6: Commit**

`git commit -m "Identidad: un solo inicio de sesión por correo o nombre de usuario"`

### Task 3: Web, una sola sesión en el cliente

**Files:**
- Modify: `apps/web/src/sesion/cliente-auth.ts`, `Sesion.tsx`, `apps/web/src/api/cliente.ts`
- Modify: `apps/web/src/donador/RequiereDonador.tsx`, `apps/web/src/pruebas/utilidades.tsx`
- Test: `apps/web/src/sesion/cliente-auth.test.ts`, `Sesion.test.tsx`

**Interfaces:**
- Produces: `ClienteAuth.iniciarSesion(identificador: string, contrasena: string): Promise<Usuario>`
  y `useSesion().entrar(identificador, contrasena)`. Salen `iniciarSesionDonador` y
  `entrarDonador`.
- Produces: `rutaDeVuelta(valor: string | null): string | null` en
  `apps/web/src/sesion/volver.ts`: devuelve el valor si empieza por `/` y no por `//`; si no,
  `null`.

- [ ] **Step 1: Pruebas que fallan**

`volver.test.ts`: `rutaDeVuelta('/donar')` → `'/donar'`; `rutaDeVuelta('//x.com')`,
`rutaDeVuelta('https://x.com')`, `rutaDeVuelta(null)` → `null`.
`Sesion.test.tsx`: cuando se pierde la sesión de un Donador, navega a `/entrar` (hoy a
`/donador`). `cliente-auth.test.ts`: `iniciarSesion('ana@x.co', 'c')` hace
`POST /api/auth/sesion` con `{ usuario: 'ana@x.co', contrasena: 'c' }`.

- [ ] **Step 2: Ver fallar**

Run: `cd apps/web && bunx vitest run src/sesion`
Expected: FALLA en las tres.

- [ ] **Step 3: Implementar**

`RequiereDonador` sin sesión de Donador navega a `/entrar?volver=<ruta actual>`.

- [ ] **Step 4: Ver pasar**

Run: `bunx vitest run src/sesion src/donador`
Expected: verde, salvo las pruebas de `AccesoDonador` y `MiCuenta` que cambian en la tarea 5.

- [ ] **Step 5: Commit** junto con la tarea 5 si sus pruebas no quedan en verde antes.

### Task 4: Maquetas de C01 y P13 ajustadas y aprobadas

**Files:**
- Modify: `docs/03-diseno/stitch/C01-acceso/maqueta.html`, `README.md`
- Modify: `docs/03-diseno/stitch/P13-mi-cuenta/maqueta.html`, `README.md`

- [ ] **Step 1:** C01 con los textos de las restricciones globales; P13 sin sesión sin las
  pestañas, solo «Crear cuenta de donador» y el enlace a `/entrar`.
- [ ] **Step 2:** Publicar cada maqueta en su página de siempre (C01:
  <https://claude.ai/artifact/Sztyamh6A3wsLkhLzuLXiQ>; P13: la del README) y pedirle a Joseph
  la aprobación. **No seguir con la tarea 5 sin ella.**
- [ ] **Step 3:** Anotar en cada README la diferencia y la fecha de aprobación.

### Task 5: Pantallas C01 y P13

**Files:**
- Modify: `apps/web/src/acceso/Entrar.tsx`, `apps/web/src/donador/AccesoDonador.tsx`,
  `apps/web/src/donador/MiCuenta.tsx`
- Test: `apps/web/src/acceso/Entrar.test.tsx`, `apps/web/src/donador/AccesoDonador.test.tsx`,
  `MiCuenta.test.tsx`

**Interfaces:**
- Consumes: `useSesion().entrar` y `rutaDeVuelta` (tarea 3).

- [ ] **Step 1: Pruebas que fallan** en `Entrar.test.tsx`:
  `heading 'Entrar a Acopio'`; campo `getByLabelText('Correo o nombre de usuario')` sin
  `type="email"`; con un Donador, tras entrar navega a `/donador`; con un Operador, a `/`; con
  `?volver=/donar`, a `/donar`; con `?volver=//x.com`, al destino por rol; el enlace «Crea tu
  cuenta de donador» lleva a `/donador`. En `AccesoDonador.test.tsx`: no hay `radiogroup` ni
  pestaña «Entrar»; está el enlace «Entrar» a `/entrar`.
- [ ] **Step 2: Ver fallar** con `bunx vitest run src/acceso src/donador`.
- [ ] **Step 3: Implementar** según la maqueta aprobada.
- [ ] **Step 4: Ver pasar** y correr `bun run --filter @acopio/web test` completo.
- [ ] **Step 5: Commit** `git commit -m "Web: una sola pantalla para entrar"`

### Task 6: Recorridos, documentos y cierre

**Files:**
- Modify: `apps/web/recorridos/donador.mjs`, `validacion-general.mjs`,
  `consola-comprobantes.mjs` (el Donador entra por `/entrar` con su correo)
- Modify: `docs/01-requerimientos/funcionales/identidad.md` (RF-IDE-004 y RF-IDE-013),
  `docs/01-requerimientos/pendientes.md` (P-079),
  `docs/06-operacion/escenarios-por-rol.md`, `docs/06-operacion/recorridos.md`, la sección
  «Cambios al construir» de la especificación, el plan de acción y un informe de sesión.

- [ ] **Step 1:** Verificación completa: `bun run lint && bun run typecheck && bun run test && bun run --filter @acopio/api depcruise && bash scripts/revisar-colores.sh` y `test:int` contra el contenedor del puerto 5439.
- [ ] **Step 2:** En local con `servicios:todo`, `seed`, `seed:demo`, build y `vite preview`:
  `donador.mjs`, `validacion-general.mjs`, `consola-comprobantes.mjs`, `consola-motor.mjs` en
  verde.
- [ ] **Step 3:** Documentos, commit, PR, CI en verde y fusión. Después, en el servidor,
  entrar como `admin`, `operador1` y `donador1@demo.acopio.local` por `/entrar`.
