---
title: "Servidor de pruebas · factura por la API y demo en Supabase · plan"
type: plan
tags: [plan, despliegue, comprobantes, almacenamiento, seed]
estado: ejecutado
actualizado: 2026-10-16
---

# Servidor de pruebas · factura por la API y demo en Supabase · plan de implementación

> **Para agentes:** se ejecuta con superpowers:subagent-driven-development o
> superpowers:executing-plans, tarea por tarea. Los pasos usan casillas (`- [ ]`).

**Objetivo:** las tareas 1 y 2 del [plan del servidor de pruebas](2026-10-16-servidor-de-pruebas.md).
La foto de la factura se ve en el servidor, y la demo crea sus cuentas por rol en Supabase y
se siembra al arrancar.

**Arquitectura:** la factura copia la evidencia de remisiones (ADR-0017). La API lee el objeto
con `AlmacenamientoService.leerImagen` y lo devuelve como `StreamableFile`. La web lo pone en
un `<img src>` contra `/api`, y la cookie de sesión viaja sola porque es el mismo origen. Las
URL firmadas se retiran. La demo recibe el `ProveedorIdentidad` que elige `AUTH_PROVEEDOR` y
toma la contraseña de `DEMO_CONTRASENA`. `arrancar.sh` la corre con
`SEMBRAR_DEMO_AL_ARRANCAR=true`.

**Stack:** NestJS 11, Prisma 7.10, Jest con `@swc/jest`, Vitest, React Query, Docker Compose.

**Especificación:** [plan del servidor de pruebas](2026-10-16-servidor-de-pruebas.md), tareas 1
y 2, y [ADR-0017](../02-arquitectura/adr/ADR-0017-factura-servida-por-la-api.md). Joseph aprobó
el diseño en la sesión del 2026-10-16.

## Restricciones globales

- Rama `servidor-de-pruebas`, un solo PR para las dos tareas (P-051). Commits en español con
  el área al inicio.
- Todas las suites comparten la base de integración (`acopio_test`) con `--runInBand`. Por eso
  este plan **no siembra la demo en las pruebas de integración**: crearía `operador1`,
  emergencias y movimientos que otras suites cuentan. La demo se prueba con unitarias sobre
  sus piezas nuevas y a mano en el Compose.
- En `apps/web` no se escriben colores hexadecimales. No se agregan íconos.
- Si cambia un endpoint: `bun run --filter @acopio/api openapi`, después
  `bun run --filter @acopio/web api:tipos`, y se versionan los dos.
- Toda nota de `docs/` que se edite queda con `actualizado: 2026-10-16`. Enlaces Markdown
  relativos. El texto nuevo de la documentación pasa por `humanizer:humanizer`.
- En desarrollo la contraseña de la demo sigue siendo `demo-acopio-2026`.

## Puntos a revisar

1. Una donación sin foto: `GET /api/comprobantes/:folio/factura` responde 404 `SIN_FACTURA` y
   la hoja de la web muestra un mensaje en vez de una imagen rota. Pruebas en Task 1, pasos 1
   y 6.
2. La fila tiene la clave pero el objeto falta en Garage: la imagen no carga, y la web muestra
   «No se pudo cargar la factura» con `onError`. Prueba en Task 1, paso 6.
3. `NODE_ENV=production` sin `DEMO_CONTRASENA`: la demo falla antes de tocar la base, con un
   mensaje que nombra la variable. Prueba en Task 2, paso 1.
4. La cuenta ya existe en Supabase pero no en la base, porque una corrida falló a medias: el
   error nombra el correo y dice que se borre en el panel. Prueba en Task 2, paso 1.
5. `SEMBRAR_DEMO_AL_ARRANCAR=true` en un contenedor sin administrador: la demo lanza «Falta el
   administrador: corre antes `seed`.», `set -eu` detiene `arrancar.sh` y la API no arranca.
   Se revisa a mano en el Compose (Task 2, paso 9).

---

### Task 1: Factura servida por la API

**Archivos:**
- Modificar: `apps/api/src/modulos/comprobantes/facturas.service.ts` (método `url`, líneas 79-93)
- Modificar: `apps/api/src/modulos/comprobantes/facturas.controller.ts` (el `@Get`, líneas 58-64)
- Modificar: `apps/api/src/comun/respuestas.ts` (quitar `UrlFacturaDto`, línea 453)
- Modificar: `apps/api/src/modulos/almacenamiento/almacen.ts`, `almacen-s3.ts`, `almacen-memoria.ts`, `almacenamiento.service.ts`
- Borrar: `apps/api/src/modulos/almacenamiento/almacen-s3.test.ts` (solo prueba la firma)
- Modificar: `apps/api/src/config/entorno.ts:35`, `apps/api/package.json` (quitar `@aws-sdk/s3-request-presigner`)
- Modificar: `apps/api/src/pruebas-integracion/facturas.int.test.ts`
- Modificar: `apps/web/src/api/donaciones.ts`, `apps/web/src/api/donaciones.test.tsx`
- Modificar: `apps/web/src/consola/comprobantes/Conciliacion.tsx` (`VerFactura`, líneas 350-370), `Conciliacion.test.tsx`
- Regenerar: `docs/03-diseno/api/openapi.json`, `apps/web/src/api/esquema.d.ts`
- Configuración: `infra/docker-compose.dev.yml:28`, `.env.example:41`
- Documentación: ADR-0017, `pendientes.md` (P-041), `despliegue.md` (líneas 51-58 y 86),
  `vista-general.md` (líneas 95-96 y 131), `patrones-y-practicas.md:27`, `runbook.md:97`,
  `modelo-datos.md:333`, `funcionales/comprobantes.md` (líneas 145 y 155),
  `no-funcionales.md:91`

**Interfaces:**
- Produce: `GET /api/comprobantes/{folio}/factura` → bytes `image/webp`,
  `Cache-Control: private, no-store`. Roles `DONADOR`, `AUDITOR`, `ADMIN`. Errores: 404
  `FOLIO_NO_ENCONTRADO` (otro Donador), 403 (sin alcance), 404 `SIN_FACTURA`.
- Produce: `FacturasService.leer(usuario: UsuarioAutenticado, folio: string): Promise<{ datos: Buffer; tipo: string }>`.
- Produce (web): `urlFactura(folio: string): string`, en `apps/web/src/api/donaciones.ts`.
- Se retiran: `Almacen.urlFirmada`, `AlmacenamientoService.urlFirmada`, `UrlFacturaDto`,
  `useUrlFactura`, el tipo `UrlFactura` y `S3_URL_PUBLICA`.
- La miniatura se sigue guardando (`miniatura_key`). Como ninguna pantalla la muestra, no
  tiene endpoint, y eso se anota en ADR-0017.

- [x] **Paso 1: cambiar la prueba de integración del permiso**

En `facturas.int.test.ts`, la prueba `'el dueño y el Auditor del acopio ven una URL firmada; el de otro acopio no'`
pasa a llamarse `'el dueño y el Auditor del acopio reciben la imagen; el de otro acopio no'`.
Para el dueño y para `auditorA`:

```ts
const r = await a
  .http()
  .get(`/api/comprobantes/${folio}/factura`)
  .set('authorization', `Bearer ${token}`)
  .buffer(true)
  .parse((res, fin) => {
    const partes: Buffer[] = [];
    res.on('data', (c: Buffer) => partes.push(c));
    res.on('end', () => fin(null, Buffer.concat(partes)));
  })
  .expect(200);
expect(r.headers['content-type']).toBe('image/webp');
expect(r.headers['cache-control']).toBe('private, no-store');
expect((await sharp(r.body as Buffer).metadata()).format).toBe('webp');
```

`auditorB` sigue recibiendo 403, y `'otro Donador no puede subirla ni verla'` sigue
recibiendo 404. Se agrega `'una donación sin foto responde 404 SIN_FACTURA'`: el mismo donador
crea una segunda donación en `ACOPIO_A`, con la línea de arroz del `beforeAll` y sin subir
foto, y el GET responde 404 con `body.codigo === 'SIN_FACTURA'`.

- [x] **Paso 2: correrla y ver que falla**

Desde `apps/api`, con el PostgreSQL de pruebas aparte (ver CLAUDE.md):
`PRUEBAS_PG_URL=postgresql://acopio_owner:acopio@127.0.0.1:5439 bunx jest -c jest.int.config.cjs --runInBand src/pruebas-integracion/facturas.int.test.ts`.
Se espera que falle porque `content-type` es `application/json…`.

- [x] **Paso 3: la API devuelve los bytes**

- `FacturasService`: `url` pasa a ser `leer(usuario, folio)`, con el mismo permiso y el mismo
  `SIN_FACTURA`, que ahora solo revisa `!c.factura_key`. Devuelve
  `this.almacenamiento.leerImagen(c.factura_key)`. El comentario del método no cambia.
- `FacturasController`: el `@Get('comprobantes/:folio/factura')` copia la forma de
  `recepciones.controller.ts:88-101`: `@Header('Cache-Control', 'private, no-store')`,
  `@ApiProduces('image/webp')`, `@ApiOkResponse({ schema: { type: 'string', format: 'binary' } })`
  y `return new StreamableFile(datos, { type: tipo })`. El método se llama `factura`.
- `UrlFacturaDto` sale de `respuestas.ts`, junto con su import.
- Almacenamiento: `urlFirmada` sale de `Almacen`, de `AlmacenMemoria`, de `AlmacenS3` (con el
  cliente `firmador`, su comentario y el import de `getSignedUrl`) y de
  `AlmacenamientoService` (con `VIDA_URL_SEGUNDOS`). El comentario de la clase `AlmacenS3`
  dice que el bucket es privado y que la API sirve los bytes (ADR-0017).
- Se borra `almacen-s3.test.ts`, `S3_URL_PUBLICA` sale de `entorno.ts`,
  `@aws-sdk/s3-request-presigner` sale de `apps/api/package.json`, y se corre `bun install`.

- [x] **Paso 4: correr la prueba y ver que pasa**

El mismo comando del paso 2. Se espera PASS en todo `facturas.int.test.ts`. Después, desde la
raíz, `bun run typecheck`: la web todavía falla por `UrlFacturaDto`, y eso se arregla en el
paso 5.

- [x] **Paso 5: regenerar el contrato y los tipos**

`bun run --filter @acopio/api openapi && bun run --filter @acopio/web api:tipos`. En
`esquema.d.ts` desaparece `UrlFacturaDto`, y la respuesta 200 de
`/api/comprobantes/{folio}/factura` pasa a ser `image/webp`.

- [x] **Paso 6: pruebas de la web que fallan**

- `donaciones.test.tsx`: `describe('useUrlFactura')` se reemplaza por
  `it('urlFactura apunta a la API con el folio codificado')`, que espera que
  `urlFactura('ACO-2026-00001')` termine en `/api/comprobantes/ACO-2026-00001/factura`.
- `Conciliacion.test.tsx`: `'GET /api/comprobantes/*/factura'` sale del mapa de `pantalla`. En
  `'la factura se pide solo al abrirla'`, antes del clic no hay ningún `img` con nombre
  `Factura de ${FOLIO}`. Después del clic, el `img` de la hoja tiene un `src` que coincide con
  `new RegExp(\`/api/comprobantes/${FOLIO}/factura$\`)`.
- Nueva `it('si la imagen no carga, la hoja lo dice')`: abre la hoja, llama a
  `fireEvent.error(img)` y espera `getByRole('alert')` con «No se pudo cargar la factura». Ese
  mensaje cubre también la donación sin foto: el navegador recibe un 404 y dispara `error`.

`cd apps/web && bunx vitest run src/api/donaciones.test.tsx src/consola/comprobantes/Conciliacion.test.tsx`.
Se espera que falle porque `urlFactura` no existe.

- [x] **Paso 7: la web muestra la imagen desde la API**

- `donaciones.ts`: salen `UrlFactura` y `useUrlFactura`. Entra `urlFactura(folio)`, con la
  forma de `urlEvidencia` (`api/remisiones.ts:35-36`) y un comentario parecido («la API la
  sirve con la cookie de sesión, ADR-0017»).
- `VerFactura`: guarda con `useState` si falló la carga. Muestra
  `<img src={urlFactura(folio)} alt={\`Factura de ${folio}\`} onError={…} className=…>` con las
  clases de hoy. Si falló, muestra `<p role="alert" className="text-body-md text-error">No se pudo cargar la factura</p>`.
  Si `Esqueleto` deja de usarse en el archivo, sale su import. El comentario de la función
  dice: «La API entrega la imagen al abrir la hoja (ADR-0017)».

- [x] **Paso 8: correr las pruebas de la web y ver que pasan**

El mismo comando del paso 6. Se espera PASS. Después, desde la raíz,
`bun run typecheck && bun run lint`, con código de salida 0.

- [x] **Paso 9: configuración y documentación**

- `S3_URL_PUBLICA` sale de `infra/docker-compose.dev.yml` y de `.env.example`.
- ADR-0017, en Consecuencias: una viñeta **2026-10-16**. Dice que el cambio quedó hecho, que la
  web usa `<img src>` contra la API como la evidencia de remisiones en lugar de un `blob:` (la
  cookie viaja igual porque es el mismo origen), que la miniatura no tiene endpoint porque
  ninguna pantalla la usa, y que `S3_URL_PUBLICA` se retiró.
- `pendientes.md`, P-041: una nota de cierre con la fecha.
- En `despliegue.md`, `vista-general.md`, `patrones-y-practicas.md` (la fachada queda con
  `guardarImagen` y `leerImagen`), `runbook.md:97` (sale el paso de las URL que vencen),
  `modelo-datos.md:333`, `funcionales/comprobantes.md:145,155` y `no-funcionales.md:91`, donde
  dice «URL firmada» pasa a decir que la API lee el objeto y entrega los bytes. En
  `despliegue.md` sale también la línea de `S3_URL_PUBLICA`.
- `grep -rn "S3_URL_PUBLICA\|urlFirmada\|UrlFactura" apps infra .env.example docs/0[0-6]* --include=*.ts --include=*.tsx --include=*.yml --include=*.md`
  solo deja menciones históricas: P-041, ADR-0017 y los planes y specs anteriores.

- [x] **Paso 10: commit**

```bash
git add -A apps/api apps/web infra .env.example docs bun.lock
git commit -m "Factura: la API entrega la imagen y se retiran las URL firmadas (ADR-0017)"
```

---

### Task 2: Demo con el proveedor configurado y sembrada al arrancar

**Archivos:**
- Crear: `apps/api/src/seed/credenciales.ts`
- Prueba: `apps/api/src/seed/credenciales.test.ts`
- Modificar: `apps/api/src/seed/main.ts` (elección del proveedor, líneas 24-27)
- Modificar: `apps/api/src/seed/demo.ts` (`CONTRASENA_DEMO`:130, `sembrarEscenariosDemo`:137,
  `sembrarDonadorDemo`:211, el `require.main` de las líneas 610-628)
- Modificar: `apps/api/arrancar.sh`, `infra/docker-compose.yml` (junto a `SEMBRAR_AL_ARRANCAR`, línea 80)
- Modificar: `apps/web/recorridos/validacion-general.mjs:20`, `consola-comprobantes.mjs:22`, `sin-conexion.mjs:61`
- Documentación: `.env.example`, `CLAUDE.md` (línea de `seed:demo`), `docs/06-operacion/recorridos.md`,
  `docs/06-operacion/despliegue.md` (variables y la sección de Dokploy)

**Interfaces:**
- Produce, en `seed/credenciales.ts`:
  - `proveedorDelSeed(prisma: PrismaService, entorno: Entorno): ProveedorIdentidad`. Usa
    `fabricarProveedorIdentidad(entorno, new ProveedorLocal(prisma, entorno), new ProveedorSupabase(entorno))`.
    Los dos constructores son perezosos (no leen llaves ni abren clientes), así que construir
    los dos no cuesta nada.
  - `contrasenaDemo(variables: NodeJS.ProcessEnv): string`. Devuelve `DEMO_CONTRASENA` si
    existe y no está vacía. Si falta y `NODE_ENV === 'production'`, lanza
    `Error('Falta DEMO_CONTRASENA: en producción la demo no tiene contraseña por defecto')`.
    Si falta en otro entorno, devuelve `'demo-acopio-2026'`.
  - `crearCuentaDemo(proveedor: ProveedorIdentidad, correo: string, contrasena: string): Promise<{ uid: string }>`.
    Llama a `proveedor.crearUsuario`. Si falla, lanza
    `Error(\`No se pudo crear ${correo} en el proveedor de identidad. Si ya existe en Supabase sin su usuario en la base, bórrala en el panel y vuelve a correr la demo. Causa: ${mensaje}\`)`.
- Cambia: `sembrarEscenariosDemo(prisma: PrismaService, proveedor: ProveedorIdentidad, contrasena: string): Promise<string[]>`.
  `sembrarDonadorDemo` recibe los mismos dos parámetros nuevos. Las dos crean cuentas con
  `crearCuentaDemo`. `export const CONTRASENA_DEMO` se borra.

- [x] **Paso 1: pruebas unitarias que fallan**

`credenciales.test.ts`, con `describe('credenciales del seed')`:
- `'con AUTH_PROVEEDOR=local usa ProveedorLocal'`:
  `proveedorDelSeed({} as PrismaService, { AUTH_PROVEEDOR: 'local' } as Entorno)` es
  `instanceof ProveedorLocal`.
- `'con AUTH_PROVEEDOR=supabase usa ProveedorSupabase'`: lo mismo con `'supabase'`, y el
  resultado es `instanceof ProveedorSupabase`.
- `'la contraseña sale de DEMO_CONTRASENA'`: `contrasenaDemo({ DEMO_CONTRASENA: 'x-1' })` da `'x-1'`.
- `'en desarrollo, sin la variable, usa la de siempre'`:
  `contrasenaDemo({ NODE_ENV: 'development' })` da `'demo-acopio-2026'`.
- `'en producción, sin la variable, falla y la nombra'`:
  `expect(() => contrasenaDemo({ NODE_ENV: 'production' })).toThrow(/DEMO_CONTRASENA/)`, y lo
  mismo con `DEMO_CONTRASENA: ''`.
- `'si el proveedor rechaza la cuenta, el error nombra el correo y la salida'`: un proveedor
  falso cuyo `crearUsuario` rechaza con `new Error('User already registered')`.
  `crearCuentaDemo(falso, 'joseph@acopio.co', 'x')` rechaza con un mensaje que contiene
  `joseph@acopio.co`, `bórrala en el panel` y `User already registered`.

`cd apps/api && bunx jest src/seed/credenciales.test.ts`. Se espera que falle porque el
módulo no existe.

- [x] **Paso 2: implementar `seed/credenciales.ts`**

Las tres funciones de Interfaces, cada una con un comentario de una línea, como el resto de
`seed/`.

- [x] **Paso 3: correr las pruebas y ver que pasan**

El mismo comando del paso 1. Se espera PASS en las 6 pruebas.

- [x] **Paso 4: la demo y el seed base usan las piezas nuevas**

- `seed/main.ts`: el ternario de las líneas 24-27 pasa a ser `proveedorDelSeed(prisma, entorno)`.
- `demo.ts`: los cambios de firma de Interfaces. El docstring de `sembrarEscenariosDemo` ya no
  dice «Solo con el proveedor local»: dice que crea las cuentas con el proveedor configurado.
- El `require.main` de `demo.ts` lee `const contrasena = contrasenaDemo(process.env)` **antes**
  de crear `PrismaService`, para que en producción sin la variable falle sin tocar la base.
  Se quita `if (entorno.AUTH_PROVEEDOR !== 'local') return;`, se llama a
  `sembrarEscenariosDemo(prisma, proveedorDelSeed(prisma, entorno), contrasena)` y se escribe
  `Usuarios de prueba: …`. La contraseña ya no sale en el log, porque en el servidor ese log
  queda en Dokploy.

- [x] **Paso 5: correrla en local con el proveedor local**

Con el Compose de desarrollo arriba, desde la raíz: `bun run --filter @acopio/api seed:demo`.
Se espera `Demo lista: …` y
`Usuarios de prueba: operador1, operador2, auditor1, receptor1, donador1@demo.acopio.local.`,
con código de salida 0. Una segunda corrida tiene que dar la misma salida sin errores, lo que
prueba que es idempotente.

- [x] **Paso 6: sembrarla al arrancar**

- `arrancar.sh`: una línea nueva en el encabezado,
  `#   SEMBRAR_DEMO_AL_ARRANCAR=true  la demo (seed:demo); idempotente, pide DEMO_CONTRASENA en producción`,
  y este bloque después del de `SEMBRAR_AL_ARRANCAR`:

  ```sh
  if [ "${SEMBRAR_DEMO_AL_ARRANCAR:-false}" = "true" ]; then
    echo "arrancar: sembrando la demo"
    node dist/seed/demo.js
  fi
  ```

- `infra/docker-compose.yml`, debajo de `SEMBRAR_AL_ARRANCAR`:
  `SEMBRAR_DEMO_AL_ARRANCAR: ${SEMBRAR_DEMO_AL_ARRANCAR:-false}` y
  `DEMO_CONTRASENA: ${DEMO_CONTRASENA:-}`.
- Recorridos: `validacion-general.mjs:20` y `consola-comprobantes.mjs:22` pasan a
  `process.env.DEMO_CONTRASENA ?? 'demo-acopio-2026'`, como `consola-remisiones.mjs:20`.
  `sin-conexion.mjs` define arriba `const DEMO = process.env.DEMO_CONTRASENA ?? 'demo-acopio-2026';`
  y lo usa en la línea 61.

- [x] **Paso 7: documentación**

- `.env.example`: `# DEMO_CONTRASENA=  contraseña de las cuentas de la demo; en desarrollo, demo-acopio-2026 si falta`
  y `SEMBRAR_DEMO_AL_ARRANCAR=false`, junto a las otras variables de arranque. Si esas no
  están en el archivo, van al final con un comentario.
- `CLAUDE.md`: la línea de `seed:demo` dice que crea las cuentas con el proveedor de
  `AUTH_PROVEEDOR` y que la contraseña es `DEMO_CONTRASENA` (en desarrollo, `demo-acopio-2026`).
- `recorridos.md`: en la sección de cómo se corren, que todos leen `DEMO_CONTRASENA` y que
  contra el servidor hay que exportarla.
- `despliegue.md`: `DEMO_CONTRASENA` y `SEMBRAR_DEMO_AL_ARRANCAR` en la lista de variables. En
  la sección de Dokploy, un párrafo con lo siguiente. Con `SEMBRAR_DEMO_AL_ARRANCAR=true` la
  demo corre en cada arranque sin duplicar nada, y crea las cuentas en Supabase con
  `DEMO_CONTRASENA`. Si la contraseña cambia, las cuentas que ya existen conservan la
  anterior, y se cambia en el panel de Supabase.

- [x] **Paso 8: verificación completa**

Desde la raíz, con el PostgreSQL de pruebas aparte:

```bash
set -o pipefail
bun run lint && bun run typecheck && bun run --filter @acopio/api depcruise \
  && bash scripts/revisar-colores.sh && bun run test \
  && PRUEBAS_PG_URL=postgresql://acopio_owner:acopio@127.0.0.1:5439 bun run test:int
echo "salida: $?"
```

Se espera `salida: 0`.

- [x] **Paso 9: el Compose con la demo al arrancar**

En el `.env` local: `SEMBRAR_AL_ARRANCAR=true`, `SEMBRAR_DEMO_AL_ARRANCAR=true` y
`MIGRAR_AL_ARRANCAR=true`. Después, `bun run servicios:todo`.
`docker compose -f infra/docker-compose.yml -f infra/docker-compose.dev.yml logs api` tiene
que mostrar `arrancar: sembrando la demo` y `Usuarios de prueba: …`, y
`curl -s localhost:3000/api/salud` tiene que responder 200. Al reiniciar la API
(`docker compose … restart api`) tiene que volver a arrancar sin error, lo que prueba la
idempotencia dentro del contenedor. Después se corren los recorridos
`consola-comprobantes.mjs` (abre la factura) y `consola-remisiones.mjs`, según
`docs/06-operacion/recorridos.md`. Al terminar, las tres variables del `.env` vuelven a como
estaban.

- [x] **Paso 10: commit**

```bash
git add -A apps/api apps/web/recorridos infra .env.example CLAUDE.md docs
git commit -m "Demo: cuentas con el proveedor configurado, DEMO_CONTRASENA y SEMBRAR_DEMO_AL_ARRANCAR"
```

---

### Task 3: Cierre

- [x] **Paso 1:** en el [plan del servidor de pruebas](2026-10-16-servidor-de-pruebas.md), las
  filas 1 y 2 pasan a ✅ con lo probado. Si algo salió distinto de lo planeado (por ejemplo,
  `<img src>` en lugar de `blob:`), las secciones de las tareas 1 y 2 reciben «Cambios al
  construir». Este plan pasa a `estado: ejecutado` y entra como fila en el índice
  `docs/05-planes/README.md`.
- [x] **Paso 2:** commit `Planes: tareas 1 y 2 del servidor de pruebas hechas`, push y
  `gh pr create` hacia `main`, con la descripción pasada por humanizer. Esperar el CI con
  `gh pr checks --watch`.
- [x] **Paso 3:** comentar en #26 y #53 lo que se probó y lo que falta: desplegar y la tarea 3.
