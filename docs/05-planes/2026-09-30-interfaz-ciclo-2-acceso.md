---
title: "Interfaz · Ciclo 2: acceso y sesión · plan de implementación"
type: plan
tags: [plan, interfaz, bloque-0]
estado: vigente
bloque: 0
actualizado: 2026-09-30
---

# Interfaz · Ciclo 2: acceso y sesión · plan de implementación

> **Para quien ejecute con un agente:** usar `superpowers:executing-plans` (o
> `superpowers:subagent-driven-development`) y seguir el plan tarea por tarea. Los pasos
> llevan casillas (`- [ ]`).

**Objetivo:** una persona invitada activa su cuenta, entra con su nombre de usuario y ve
la Portada con la cabecera de sesión; la sesión viaja en una cookie `HttpOnly`.

**Arquitectura:** primero la API (cookie, salida, control de origen), después la web
(`ClienteAuth`, estado de sesión, cabeceras compartidas y las dos pantallas de C01).
La web y la API comparten origen: en desarrollo Vite reenvía `/api`.

**Tecnología:** NestJS 11 y Express en la API; React, React Router, TanStack Query,
`openapi-fetch`, Vitest y Testing Library en la web.

**Especificación:** [2026-09-30-interfaz-ciclo-2-acceso-design.md](../superpowers/specs/2026-09-30-interfaz-ciclo-2-acceso-design.md)
y [ADR-0014](../02-arquitectura/adr/ADR-0014-sesion-en-cookie.md).
Diseños aprobados: [C01 Entrar](../03-diseno/stitch/C01-acceso/README.md),
[C01 Activar cuenta](../03-diseno/stitch/C01-activar/README.md) y
[componentes compartidos](../03-diseno/stitch/_compartidos/README.md).

## Reglas que aplican a todas las tareas

- Nombre de la cookie: `acopio_sesion`. Atributos: `HttpOnly`, `SameSite=Strict`,
  `Path=/api`, `Max-Age` hasta `expiraEn`, `Secure` solo con `NODE_ENV=production`.
- La web nunca lee ni guarda el token. Nada de `localStorage` ni `sessionStorage` para
  la sesión.
- Ninguna pantalla llama a `/auth/*` directamente: todo pasa por `ClienteAuth`.
- Estética de Stitch con los tokens de `packages/ui-tokens` (ADR-0013); sin colores
  hexadecimales en `apps/web/src`.
- Sin selector de ubicación en la cabecera (S-02).
- Las pruebas de integración corren contra un PostgreSQL aparte, nunca el del Compose
  (ver `CLAUDE.md`).
- Los cambios van directo a `main`. Una tarea está hecha cuando pasan `lint`,
  `typecheck`, `test` y, si toca la API, `depcruise` y `test:int`.
- Antes de escribir documentación, invocar `humanizer:humanizer`.

## Qué revisar con más cuidado

1. Una sesión vencida o suspendida mientras la persona navega el portal público: la web
   no debe mandarla a `/entrar` si no había sesión (Tarea 5).
2. Un enlace de invitación ya usado: la pantalla muestra el mensaje de la API y ningún
   formulario (Tarea 7).
3. Una escritura con cookie desde otro origen: 403, y la misma escritura con Bearer
   sigue pasando (Tarea 2).
4. Recargar la página con sesión: la cabecera vuelve con las iniciales sin pedir
   contraseña (Tarea 5).
5. Doble clic en «Entrar» o «Activar mi cuenta»: una sola llamada (Tareas 6 y 7).

---

## Tarea 1: la API entrega la sesión en una cookie

**Archivos:**
- Crear: `apps/api/src/modulos/identidad/sesion/cookie-sesion.ts`
- Modificar: `apps/api/src/modulos/identidad/sesion/sesion.controller.ts`
- Modificar: `apps/api/src/modulos/identidad/autenticacion/autenticacion.guard.ts` (`extraerToken`)
- Modificar: `apps/api/src/comun/respuestas.ts` (`SesionDto` sin `accessToken`)
- Modificar: `apps/api/test/app-prueba.ts` (`iniciarSesion` lee `Set-Cookie`)
- Crear: `apps/api/src/pruebas-integracion/sesion-cookie.int.test.ts`

**Produce:** `COOKIE_SESION = 'acopio_sesion'`, `leerCookie(cabecera, nombre)`,
`opcionesCookie(entorno, expiraEn)`.

- [ ] **Paso 1: Pruebas que fallan**

`sesion-cookie.int.test.ts`:

```ts
import { ADMIN, crearAppPrueba, type AppPrueba } from '../../test/app-prueba';

/** ADR-0014: la sesión viaja en una cookie HttpOnly. */
describe('sesión en cookie', () => {
  let a: AppPrueba;
  beforeAll(async () => {
    a = await crearAppPrueba();
  });
  afterAll(() => a.cerrar());

  const entrar = () =>
    a
      .http()
      .post('/api/auth/sesion')
      .send({ usuario: ADMIN.username, contrasena: ADMIN.contrasena })
      .expect(200);

  it('devuelve la cookie HttpOnly y el cuerpo no trae el token', async () => {
    const r = await entrar();
    const cookie = ([] as string[]).concat(r.headers['set-cookie'] ?? []).join(';');
    expect(cookie).toMatch(/acopio_sesion=[^;]+/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
    expect(cookie).toMatch(/Path=\/api/i);
    expect(r.body.accessToken).toBeUndefined();
    expect(r.body.usuario).toMatchObject({ username: ADMIN.username });
  });

  it('/auth/yo responde con solo la cookie', async () => {
    const r = await entrar();
    await a.http().get('/api/auth/yo').set('cookie', r.headers['set-cookie']!).expect(200);
  });
});
```

Correr: `cd apps/api && bunx jest -c jest.int.config.cjs --runInBand src/pruebas-integracion/sesion-cookie.int.test.ts`
Resultado esperado: fallan (no hay `set-cookie`).

- [ ] **Paso 2: Implementar**

`cookie-sesion.ts`:

```ts
import type { CookieOptions } from 'express';
import type { Entorno } from '../../../config/entorno';

export const COOKIE_SESION = 'acopio_sesion';

/** Lee una cookie de la cabecera `Cookie` sin depender de cookie-parser. */
export function leerCookie(cabecera: string | undefined, nombre: string): string | null {
  for (const parte of cabecera?.split(';') ?? []) {
    const [clave, ...valor] = parte.trim().split('=');
    if (clave === nombre) return decodeURIComponent(valor.join('='));
  }
  return null;
}

/** ADR-0014: HttpOnly, SameSite=Strict, solo para /api y hasta que vence el token. */
export function opcionesCookie(entorno: Entorno, expiraEn?: Date): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'strict',
    path: '/api',
    secure: entorno.NODE_ENV === 'production',
    ...(expiraEn ? { maxAge: Math.max(expiraEn.getTime() - Date.now(), 0) } : {}),
  };
}
```

En `sesion.controller.ts`, inyectar `@Inject(ENTORNO) private readonly entorno: Entorno`
y cambiar `iniciar`:

```ts
  async iniciar(@Body() datos: IniciarSesionDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, ...sesion } = await this.sesion.iniciar(datos.usuario, datos.contrasena);
    res.cookie(COOKIE_SESION, accessToken, opcionesCookie(this.entorno, new Date(sesion.expiraEn)));
    return sesion;
  }
```

En `autenticacion.guard.ts`:

```ts
function extraerToken(request: Request): string | null {
  const deCookie = leerCookie(request.headers.cookie, COOKIE_SESION);
  if (deCookie) return deCookie;
  const [tipo, valor] = request.headers.authorization?.split(' ') ?? [];
  return tipo === 'Bearer' && valor ? valor : null;
}
```

En `respuestas.ts`, `SesionDto` queda con `expiraEn` y `usuario`.

En `app-prueba.ts`, `iniciarSesion` devuelve el valor de la cookie:

```ts
  const r = await a.http().post('/api/auth/sesion').send({ usuario, contrasena }).expect(200);
  const cookie = ([] as string[]).concat(r.headers['set-cookie'] ?? []).join(';');
  const token = /acopio_sesion=([^;]+)/.exec(cookie)?.[1];
  if (!token) throw new Error('El inicio de sesión no devolvió la cookie');
  return decodeURIComponent(token);
```

- [ ] **Paso 3: Correr la prueba nueva y la suite de integración completa.** Las pruebas
  existentes siguen con Bearer y deben pasar sin cambios.
- [ ] **Paso 4: Commit** `API: la sesión viaja en la cookie acopio_sesion (ADR-0014)`

## Tarea 2: salir, control de origen y CORS con credenciales

**Archivos:**
- Modificar: `sesion.controller.ts` (`POST /auth/salir`)
- Crear: `apps/api/src/comun/origen.guard.ts`
- Modificar: `apps/api/src/app.module.ts` (registrar el guard primero)
- Modificar: `apps/api/src/configurar-app.ts` (`credentials: true`)
- Probar: `sesion-cookie.int.test.ts`

- [ ] **Paso 1: Pruebas que fallan** (en el mismo `describe`):

```ts
  it('/auth/salir vence la cookie', async () => {
    const r = await a.http().post('/api/auth/salir').expect(204);
    const cookie = ([] as string[]).concat(r.headers['set-cookie'] ?? []).join(';');
    expect(cookie).toMatch(/acopio_sesion=;/);
    expect(cookie).toMatch(/Expires=Thu, 01 Jan 1970/i);
  });

  it('una escritura con cookie desde otro origen: 403', async () => {
    const r = await entrar();
    const res = await a
      .http()
      .post('/api/emergencias')
      .set('cookie', r.headers['set-cookie']!)
      .set('origin', 'https://otro.sitio')
      .send({ nombre: 'X', tipo: 'sismo', inicio: '2026-09-01', destacadaHasta: '2099-12-31' })
      .expect(403);
    expect(res.body.codigo).toBe('ORIGEN_NO_PERMITIDO');
  });

  it('la misma escritura desde el origen de la web pasa', async () => {
    const r = await entrar();
    await a
      .http()
      .post('/api/emergencias')
      .set('cookie', r.headers['set-cookie']!)
      .set('origin', 'http://localhost:5173')
      .send({ nombre: 'Con origen', tipo: 'sismo', inicio: '2026-09-01', destacadaHasta: '2099-12-31' })
      .expect(201);
  });
```

`http://localhost:5173` es el `APP_URL` de `test/entorno-pruebas.ts`.

- [ ] **Paso 2: Implementar**

`salir` en el controlador:

```ts
  /** Borra la cookie de sesión. Público: sirve aunque el token ya haya vencido. */
  @Publico()
  @Post('salir')
  @HttpCode(204)
  salir(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(COOKIE_SESION, opcionesCookie(this.entorno));
  }
```

`origen.guard.ts`:

```ts
import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { ENTORNO, type Entorno } from '../config/entorno';
import { COOKIE_SESION, leerCookie } from '../modulos/identidad/sesion/cookie-sesion';
import { ErrorDominio } from './errores/error-dominio';

const ESCRITURAS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** ADR-0014: una escritura con la cookie de sesión solo se acepta desde APP_URL. */
@Injectable()
export class OrigenGuard implements CanActivate {
  private readonly permitido: string;
  constructor(@Inject(ENTORNO) entorno: Entorno) {
    this.permitido = new URL(entorno.APP_URL).origin;
  }

  canActivate(ctx: ExecutionContext): boolean {
    const r = ctx.switchToHttp().getRequest<Request>();
    if (!ESCRITURAS.has(r.method)) return true;
    if (!leerCookie(r.headers.cookie, COOKIE_SESION)) return true;
    const origen = r.headers.origin;
    if (!origen || origen === this.permitido) return true;
    throw new ErrorDominio('ORIGEN_NO_PERMITIDO', 'La petición viene de un sitio no permitido', 403);
  }
}
```

Si `comun/` importando de `modulos/identidad` rompe la regla de dependency-cruiser
«comun no depende de módulos», mover `cookie-sesion.ts` a `apps/api/src/comun/` y
ajustar los imports del controlador y del guard.

`app.module.ts`: `{ provide: APP_GUARD, useClass: OrigenGuard }` antes del límite de
intentos. `configurar-app.ts`: `app.enableCors({ origin: entorno.APP_URL, credentials: true })`.

- [ ] **Paso 3: Correr la suite completa de la API** (lint, typecheck, depcruise, test,
  test:int).
- [ ] **Paso 4: Commit** `API: cerrar sesión y control de origen para la cookie`

## Tarea 3: contrato al día

- [ ] Regenerar `openapi.json` (`bun run --filter @acopio/api openapi`) y los tipos de la
  web (`bun run --filter @acopio/web api:tipos`). En el diff, `SesionDto` pierde
  `accessToken` y aparece `/api/auth/salir`.
- [ ] En `docs/03-diseno/api/README.md`, la sección «Sesión» describe la cookie, `salir`,
  el 403 `ORIGEN_NO_PERMITIDO` y que las llamadas desde la web van con
  `credentials: 'include'` y sin cabecera `Authorization`.
- [ ] Commit `Contrato: sesión en cookie y salida`

## Tarea 4: cliente de la API con credenciales, proxy de Vite y `ClienteAuth`

**Archivos:**
- Modificar: `apps/web/vite.config.ts` (proxy `/api` → `http://localhost:3000`)
- Modificar: `apps/web/src/api/cliente.ts`
- Modificar: `.env.example` (`VITE_API_URL=` vacío por defecto)
- Crear: `apps/web/src/sesion/cliente-auth.ts`
- Probar: `apps/web/src/sesion/cliente-auth.test.ts`

**Produce:**

```ts
// cliente.ts
export const api: Client<paths>;            // credentials: 'include'
export function alPerderSesion(fn: () => void): () => void; // se llama ante un 401

// cliente-auth.ts
export interface UsuarioSesion { id: string; username: string | null; nombre: string; rol: Rol }
export interface ClienteAuth {
  iniciarSesion(usuario: string, contrasena: string): Promise<UsuarioSesion>;
  cerrarSesion(): Promise<void>;
  usuarioActual(): Promise<UsuarioSesion | null>;
}
export const clienteAuthLocal: ClienteAuth;
```

- [ ] **Paso 1: Pruebas que fallan** (`cliente-auth.test.ts`): cada método llama a su
  ruta con `credentials: 'include'` (inspeccionar el `Request` que recibe `fetch`);
  `usuarioActual` devuelve `null` con 401; `iniciarSesion` con 401 rechaza con un
  `ErrorApi` de estado 401; `cerrarSesion` no falla aunque la API responda error.
- [ ] **Paso 2: Implementar.** `baseUrl` es `import.meta.env.VITE_API_URL || window.location.origin`,
  así en el navegador y en jsdom la URL es absoluta y del mismo origen. El middleware
  de `openapi-fetch` (`api.use({ onResponse })`) avisa a los suscriptores de
  `alPerderSesion` cuando la respuesta es 401 y la ruta no es `/api/auth/sesion`.
- [ ] **Paso 3: Correr las pruebas de la web y el build.** `bun run --filter @acopio/web dev`
  con la API arriba: `/api/salud` responde a través del proxy.
- [ ] **Paso 4: Commit** `web: cliente con credenciales, proxy de /api y ClienteAuth`

## Tarea 5: estado de sesión y cabeceras compartidas

**Archivos:**
- Crear: `apps/web/src/sesion/Sesion.tsx` (`SesionProveedor`, `useSesion`)
- Crear: `apps/web/src/portal/cabecera/Marca.tsx`, `CabeceraPublica.tsx`,
  `CabeceraAcceso.tsx`, `CabeceraConSesion.tsx`
- Borrar: `apps/web/src/portal/Cabecera.tsx`
- Crear: `apps/web/src/portal/MarcoAcceso.tsx` (cabecera de acceso, sin barra inferior)
- Modificar: `MarcoPortal.tsx` (cabecera según la sesión), `App.tsx` (proveedor dentro
  del enrutador), `pruebas/utilidades.tsx` (`envolver` acepta un `ClienteAuth` falso;
  por defecto, sin sesión)
- Probar: `apps/web/src/sesion/Sesion.test.tsx`, `apps/web/src/portal/cabecera/cabeceras.test.tsx`

**Produce:** `useSesion(): { usuario: UsuarioSesion | null; cargando: boolean;
entrar(usuario, contrasena): Promise<void>; salir(): Promise<void> }`.

- [ ] **Paso 1: Pruebas que fallan**
  - Al montar consulta `usuarioActual` una vez; mientras tanto `cargando` es verdadero.
  - Con sesión, `MarcoPortal` muestra el botón con las iniciales (`DM` para «Daniela
    Méndez») y no muestra «Entrar».
  - El menú de la cuenta muestra nombre y rol, y «Cerrar sesión» llama a
    `cerrarSesion` y vuelve a mostrar «Entrar».
  - Un 401 notificado con sesión activa deja la sesión en nulo y navega a `/entrar`.
  - Un 401 notificado sin sesión no navega (Qué revisar, punto 1).
  - axe sin violaciones graves con el menú abierto.
- [ ] **Paso 2: Implementar** con el marcado de
  `docs/03-diseno/stitch/_compartidos/maqueta.html`. El menú es un botón con
  `aria-haspopup="menu"` y `aria-expanded`, y una lista `role="menu"` con un
  `role="menuitem"` «Cerrar sesión»; se cierra con Escape y al tocar fuera.
- [ ] **Paso 3: Las pruebas del ciclo 1 siguen pasando** (la Portada y las rutas usan
  `envolver` sin sesión).
- [ ] **Paso 4: Commit** `web: sesión y cabeceras compartidas`

## Tarea 6: C01 Entrar

**Archivos:**
- Crear: `apps/web/src/acceso/Entrar.tsx`
- Modificar: `apps/web/src/rutas.tsx` (`/entrar` sale de «Próximamente» y va dentro de
  `MarcoAcceso`), `rutas.test.tsx` (quitar `/entrar` de la lista de «Próximamente»)
- Probar: `apps/web/src/acceso/Entrar.test.tsx`

- [ ] **Paso 1: Pruebas que fallan**
  - Envía usuario y contraseña a `entrar` y navega a `/`.
  - Con `?usuario=d.mendez` el campo viene escrito.
  - 401: alerta «Usuario o contraseña incorrectos.»
  - 429: alerta con el `mensaje` de la API.
  - Doble clic en «Entrar»: una sola llamada (el botón se deshabilita mientras envía).
  - El botón del ojo alterna el tipo del campo de contraseña.
  - Con sesión iniciada, `/entrar` redirige a `/`.
  - axe sin violaciones graves.
- [ ] **Paso 2: Implementar** con el marcado de `C01-acceso/maqueta.html`, pasado a
  tokens (sin `stone`, `emerald` ni hexadecimales). Etiquetas visibles con `htmlFor`.
- [ ] **Paso 3: Commit** `web: C01 Entrar`

## Tarea 7: C01 Activar cuenta

**Archivos:**
- Crear: `apps/web/src/acceso/ActivarCuenta.tsx`, `apps/web/src/api/invitaciones.ts`
- Modificar: `rutas.tsx` (`/invitacion/:token` dentro de `MarcoAcceso`)
- Probar: `apps/web/src/acceso/ActivarCuenta.test.tsx`

- [ ] **Paso 1: Pruebas que fallan**
  - Muestra usuario, nombre, rol en español («Operador») y «2 ubicaciones asignadas».
  - 404: muestra el `mensaje` de la API, sin formulario, con el enlace a la portada.
  - Contraseñas distintas: «Las contraseñas no coinciden.» y no llama a la API.
  - 422: muestra el `mensaje` de la API.
  - Restablecimiento: título «Restablece tu contraseña» y botón «Guardar contraseña».
  - Al activar, navega a `/entrar?usuario=<username>`.
  - Doble clic: una sola llamada.
  - axe sin violaciones graves.
- [ ] **Paso 2: Implementar** con el marcado de `C01-activar/maqueta.html` en formato
  móvil, pasado a tokens, sin el pie «Respuesta Oficial Caldas 2026».
- [ ] **Paso 3: Commit** `web: C01 Activar cuenta`

## Tarea 8: recorrido real y cierre

- [ ] Reconstruir el Compose (`bun run servicios:todo`), levantar la web y hacer el
  recorrido del §1 de la especificación: crear un operador desde la API como
  administrador, abrir el enlace de Mailpit, activar, entrar, recargar, cerrar sesión.
- [ ] En Chromium a 360 × 640: cookie `HttpOnly` en las herramientas, nada de la sesión
  en `localStorage` ni `sessionStorage`, axe sin violaciones graves en Entrar y Activar
  cuenta, y capturas en `docs/03-diseno/stitch/C01-acceso/construida.png` y
  `C01-activar/construida.png`.
- [ ] Documentación: criterios de salida y «Cambios al construir» en la especificación;
  fila de la interfaz en el plan del Bloque 0; índices de planes y especificaciones;
  `CLAUDE.md` (la sesión es la cookie `acopio_sesion`, las pruebas de la web inyectan
  un `ClienteAuth` falso).
- [ ] Verificación completa, commit, push y `gh run watch` hasta ver `main` en verde.
