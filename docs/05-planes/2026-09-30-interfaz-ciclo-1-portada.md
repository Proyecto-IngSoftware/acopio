---
title: "Interfaz · Ciclo 1: cimientos y Portada · plan de implementación"
type: plan
tags: [plan, interfaz, bloque-0]
estado: vigente
bloque: 0
actualizado: 2026-09-30
---

# Interfaz · Ciclo 1: cimientos y Portada · plan de implementación

> **Para quien ejecute con un agente:** usar la skill `superpowers:subagent-driven-development`
> (recomendada) o `superpowers:executing-plans` y seguir el plan tarea por tarea. Los
> pasos llevan casillas (`- [ ]`) para marcar el avance.

**Objetivo:** la Portada pública de Acopio corre en el navegador sobre `apps/web`, lee
las emergencias de la API sin sesión y muestra estados vacíos donde el backend aún no
llega.

**Arquitectura:** primero se corrige el diseño en Google Stitch y Joseph lo aprueba;
hasta ese punto no se escribe código. Después se construyen los tokens
(`packages/ui-tokens`), el esqueleto de la SPA, un cliente tipado desde el contrato
OpenAPI, los componentes base y la Portada. El HTML de Stitch queda guardado en la
bóveda como referencia y nunca se importa.

**Tecnología:** Vite, React, TypeScript 6.0, Tailwind 4, React Router, TanStack Query,
`openapi-typescript` con `openapi-fetch`, Vitest, Testing Library y axe-core. Bun
instala y corre los scripts; Node 22 ejecuta.

**Especificación:** [2026-09-30-interfaz-ciclo-1-portada-design.md](../superpowers/specs/2026-09-30-interfaz-ciclo-1-portada-design.md).
Quien ejecute lee las dos.

## Reglas que aplican a todas las tareas

- No se escribe código de `apps/web` ni de `packages/ui-tokens` antes de que Joseph
  apruebe el diseño al final de la Tarea 2.
- Ningún archivo de `apps/web/src` contiene un color hexadecimal. Los colores salen de
  `packages/ui-tokens`.
- Paleta: marca teal `#0F6E6E`, neutros cálidos. Rojo, ámbar, verde y morado solo
  para el semáforo de inventario (ADR-0006).
- Ningún dato de ejemplo incrustado en los componentes (ADR-0011). Los datos de
  prueba viven en los archivos `*.test.tsx`.
- Texto de datos en 16 px como mínimo. Áreas tocables de 48 px o más.
- Todo en español, con los términos del glosario.
- `apps/web` nunca importa nada de `docs/`.
- TypeScript se queda en `~6.0.3`.
- Antes de escribir documentación o un comentario de cierre, invocar
  `humanizer:humanizer`.
- Los cambios van directo a `main`. Una tarea se da por hecha cuando pasan
  `bun run lint`, `bun run typecheck`, `bun run test` y, si toca la API,
  `bun run test:int`.
- Node 22 en el `PATH` antes de cualquier comando: `nvm use`.

## Qué revisar con más cuidado

Cinco situaciones que la especificación da por entendidas y que más fácil pueden
romper la Portada. Cada una tiene su prueba en la tarea que se indica.

1. La URL trae `?emergencia=` con un identificador que no existe o que ya se cerró.
   Se espera que la Portada muestre la primera emergencia vigente y no falle
   (Tarea 9).
2. La API no responde o devuelve un error. Se espera un mensaje con botón para
   reintentar, y que el aviso de «no recibimos dinero» y «Cómo apoyar» sigan visibles
   (Tarea 9).
3. La API solo tiene emergencias cerradas. Se espera el mismo resultado que sin
   emergencias (Tareas 6 y 9).
4. La respuesta tarda. Se espera un esqueleto en el bloque de emergencia y el
   contenido fijo visible desde el primer momento (Tarea 9).
5. Un nombre de emergencia muy largo en 360 px. Se espera que el texto salte de línea
   sin desplazamiento horizontal. jsdom no calcula el ancho, así que se comprueba a
   mano en la Tarea 10.

## Archivos

```
docs/03-diseno/stitch/P01-portada/     captura, HTML y nota del diseño      Tareas 1 y 2
apps/api/src/modulos/catalogo/catalogo.controller.ts   @Publico en el GET    Tarea 3
packages/ui-tokens/                    tokens y tema de Tailwind             Tarea 4
apps/web/                              la SPA                                 Tareas 5 a 9
  src/api/                             cliente y consultas
  src/componentes/                     componentes base
  src/portal/                          Portada, navegación y sus bloques
apps/api/Dockerfile                    copia los package.json nuevos         Tarea 5
eslint.config.mjs                      reglas para la web                    Tarea 5
```

---

# Fase A · Diseño. Sin código

## Tarea 1: Guardar el diseño actual y corregir el tema en Stitch

**Archivos:**
- Crear: `docs/03-diseno/stitch/P01-portada/antes/captura.png`
- Crear: `docs/03-diseno/stitch/P01-portada/antes/pantalla.html`

**Datos de Stitch:** proyecto `10306891818878200068`, pantalla de la Portada
`3c2359b7032a4987a0858b3f73ce65d4`.

- [ ] **Paso 1: Guardar la Portada tal como está hoy**

Llamar `mcp__stitch__get_screen` con
`projects/10306891818878200068/screens/3c2359b7032a4987a0858b3f73ce65d4` y descargar
las dos URL que devuelve:

```bash
mkdir -p docs/03-diseno/stitch/P01-portada/antes
curl -sL -o docs/03-diseno/stitch/P01-portada/antes/captura.png "<screenshot.downloadUrl>"
curl -sL -o docs/03-diseno/stitch/P01-portada/antes/pantalla.html "<htmlCode.downloadUrl>"
```

Resultado esperado: `file .../captura.png` dice que es una imagen y el HTML pesa
alrededor de 27 KB.

- [ ] **Paso 2: Leer el sistema de diseño actual del proyecto**

Llamar `mcp__stitch__list_design_systems` con `projectId: "10306891818878200068"` y
anotar el `name` (`assets/<id>`) del sistema de diseño del proyecto. Si no hay
ninguno, crearlo en el paso 3 con `mcp__stitch__create_design_system` en lugar de
actualizarlo.

- [ ] **Paso 3: Actualizar el tema con los tokens de la bóveda**

Llamar `mcp__stitch__update_design_system` con `projectId`, el `name` del paso 2 y:

```json
{
  "displayName": "Acopio",
  "theme": {
    "colorMode": "LIGHT",
    "colorVariant": "FIDELITY",
    "customColor": "#0F6E6E",
    "overridePrimaryColor": "#0F6E6E",
    "overrideSecondaryColor": "#44403C",
    "overrideTertiaryColor": "#0A4F4F",
    "overrideNeutralColor": "#1C1917",
    "headlineFont": "INTER",
    "bodyFont": "INTER",
    "labelFont": "INTER",
    "roundness": "ROUND_TWELVE",
    "designMd": "<el texto del paso 4>"
  }
}
```

El secundario y el terciario quedan en neutro y en teal oscuro a propósito: así Stitch
no tiene ningún rojo ni ámbar disponible para decorar.

- [ ] **Paso 4: Texto de `designMd`**

```markdown
# Acopio · reglas de diseño

Plataforma de coordinación logística para respuesta a desastres en Colombia. La usan
personas en la calle, con un teléfono, bajo sol y con mala señal. Tono serio, claro y
rápido.

## Color
- Marca: teal #0F6E6E (primario), #0A4F4F (oscuro), #14A0A0, #C7E8E8, #E6F4F4.
- Neutros cálidos: texto #1C1917, texto secundario #57534E, bordes #E7E5E4, fondo de
  tarjeta #F5F5F4, lienzo #FAFAF9, blanco #FFFFFF.
- Rojo #DC2626, ámbar #D97706, verde #16A34A y morado #7C3AED están RESERVADOS para el
  estado del inventario. No se usan en botones, enlaces, fondos ni decoración.
- Estados de inventario y sus nombres: Escaso (rojo), Poco (ámbar), Bien (verde),
  De sobra (morado), No recibir (morado). Siempre con ícono y texto además del color.

## Tipografía
- Inter, una sola familia. Títulos en 700. Nunca 300 ni 200.
- 16 px como mínimo en cualquier dato. 14 px solo para texto secundario.
- Sin etiquetas en mayúsculas sostenidas. Sin rótulos pequeños encima de los títulos.

## Forma
- Bordes de 1 px en #E7E5E4. Sin sombras difusas.
- Radio de 12 px en tarjetas y 10 px en botones.
- Áreas tocables de 48 px o más. Botón primario de 56 px de alto y ancho completo.

## Contenido
- Sin ilustraciones ni fotos de archivo.
- Texto directo: «No traigan más agua».
- Sin flechas añadidas al final de botones y enlaces.
```

- [ ] **Paso 5: Confirmar**

Llamar `mcp__stitch__get_project` con `projects/10306891818878200068`.
Resultado esperado: `designTheme.overridePrimaryColor` es `#0F6E6E` y
`overrideSecondaryColor` ya no es `#d9381e`.

- [ ] **Paso 6: Commit**

```bash
git add docs/03-diseno/stitch
git commit -m "Diseño: copia de la Portada de Stitch antes de corregir el tema"
```

## Tarea 2: Rehacer la Portada con el tema correcto y obtener la aprobación

**Archivos:**
- Crear: `docs/03-diseno/stitch/P01-portada/captura.png`
- Crear: `docs/03-diseno/stitch/P01-portada/pantalla.html`
- Crear: `docs/03-diseno/stitch/P01-portada/README.md`

Antes de empezar, invocar `frontend-design:frontend-design`. La paleta y la tipografía
ya están fijadas por el sistema de diseño, así que el criterio de esa skill se aplica
a la jerarquía, al texto y a quitar los rasgos de plantilla.

- [ ] **Paso 1: Editar la pantalla**

Llamar `mcp__stitch__edit_screens` con `projectId: "10306891818878200068"`,
`selectedScreenIds: ["3c2359b7032a4987a0858b3f73ce65d4"]`, `deviceType: "MOBILE"` y
este texto. La llamada tarda unos minutos y no se reintenta.

```
Rehaz esta portada con el sistema de diseño actual del proyecto. Conserva el orden y
el contenido de los bloques. Cambios:

1. Color. El teal #0F6E6E es el único color de acción. Quita todo rojo, naranja y
   ámbar de botones, fondos, bordes y etiquetas decorativas. Fondo #FAFAF9, tarjetas
   blancas con borde de 1 px #E7E5E4 y sin sombra.
2. Lo primero que se lee es la emergencia: su nombre en Inter 700 de 28 px y, debajo,
   una frase de estado en lenguaje llano («9 de 14 zonas siguen sin cobertura
   suficiente»). Sin rótulo pequeño encima, sin eslogan.
3. Estados del inventario con estos nombres y colores, siempre con ícono y texto:
   Escaso (rojo #DC2626), Poco (ámbar #D97706), Bien (verde #16A34A), De sobra y
   No recibir (morado #7C3AED). Reemplaza «CRÍTICO», «URGENTE», «MODERADO»,
   «SATURADO» y «PROHIBIDO». Ningún texto en mayúsculas sostenidas.
4. «Cómo apoyar»: tres acciones del mismo tamaño y peso (Donar en especie, Donar a una
   causa, Ser voluntario) y debajo el acceso para rastrear un folio. Sin flechas al
   final de los textos.
5. El aviso «Esta plataforma no recibe dinero» se queda visible, en una tarjeta con
   borde fuerte de 2 px #1C1917 y texto de 16 px.
6. Barra inferior con cinco destinos: Inicio, Mapa, Causas, Voluntariado, Más. Íconos
   con su texto debajo, área tocable de 48 px.
7. Texto de datos en 16 px como mínimo. Sin ilustraciones.
```

- [ ] **Paso 2: Revisar el resultado**

Llamar `mcp__stitch__list_screens` y localizar la Portada editada (Stitch puede crear
una pantalla nueva en vez de modificar la anterior). Descargar captura y HTML:

```bash
curl -sL -o docs/03-diseno/stitch/P01-portada/captura.png "<screenshot.downloadUrl>"
curl -sL -o docs/03-diseno/stitch/P01-portada/pantalla.html "<htmlCode.downloadUrl>"
grep -oiE '#[0-9a-f]{6}' docs/03-diseno/stitch/P01-portada/pantalla.html | sort -u
```

Abrir `captura.png` y comprobar los siete puntos del paso 1. En la lista de colores no
debe aparecer `#d9381e` ni ningún rojo o ámbar fuera de los del semáforo.

Si algún punto no se cumple, repetir el paso 1 sobre la pantalla nueva con un texto
que nombre solo lo que falta. Si tras dos intentos el resultado se aleja de la
versión que ya gustaba, parar y llevar las dos capturas a Joseph.

- [ ] **Paso 3: Escribir la nota**

`docs/03-diseno/stitch/P01-portada/README.md`:

```markdown
---
title: "P01 · Portada · diseño en Stitch"
type: diseno
tags: [diseno, stitch, portada]
estado: vigente
actualizado: 2026-09-30
---

# P01 · Portada · diseño en Stitch

| | |
|---|---|
| Proyecto | ACOPIO DISEÑO (`10306891818878200068`) |
| Pantalla | `<identificador de la pantalla aprobada>` |
| Exportada | 2026-09-30 |
| Archivos | [captura.png](captura.png) · [pantalla.html](pantalla.html) |
| Versión anterior | [antes/](antes/), con el tema que usaba rojo como secundario |

`pantalla.html` es referencia. `apps/web` no lo importa: la Portada se escribe con los
componentes base y los tokens.

## Diferencias aceptadas entre el diseño y lo construido

- Los bloques que dependen de `inventario`, `motor`, `turnos` y causas se construyen
  como estado vacío. El diseño los muestra con datos de ejemplo.
- Los íconos del diseño son Material Symbols; en el código se usan los de
  `lucide-react`.
```

El identificador de la pantalla se completa con el que devolvió el paso 2.

- [ ] **Paso 4: Commit y push**

```bash
git add docs/03-diseno/stitch
git commit -m "Diseño: Portada de Stitch con la paleta del sistema de diseño"
git push origin main
```

- [ ] **Paso 5: Aprobación de Joseph. Aquí se detiene el trabajo**

Mostrar a Joseph `antes/captura.png` y `captura.png` y preguntar si aprueba el diseño
para pasar a código. No se empieza la Tarea 3 sin un sí explícito.

Si pide cambios, se vuelve al paso 1. Si el diseño aprobado cambia el orden o el
texto de algún bloque, se actualiza el marcado de la Tarea 9 antes de ejecutarla.

---

# Fase B · Código. Solo después de la aprobación

## Tarea 3: La API deja leer las emergencias sin sesión

**Archivos:**
- Modificar: `apps/api/src/modulos/catalogo/catalogo.controller.ts` (el `@Get('emergencias')`)
- Probar: `apps/api/src/pruebas-integracion/catalogo.int.test.ts`
- Regenerar: `docs/03-diseno/api/openapi.json`
- Modificar: `docs/03-diseno/api/README.md`

**Produce:** `GET /api/emergencias` responde 200 sin cabecera `Authorization`. La
respuesta es `EmergenciaDto[]`, con las activas primero.

- [ ] **Paso 1: Escribir la prueba que falla**

En `catalogo.int.test.ts`, dentro de `describe('emergencias (RF-CAT-005)', ...)`,
después de «las activas van primero»:

```ts
    it('cualquiera las lee sin sesión; crear sigue siendo del administrador', async () => {
      await a.http().get('/api/emergencias').expect(200);

      const nueva = {
        nombre: 'Sin permiso',
        tipo: 'sismo',
        inicio: '2026-09-01',
        destacadaHasta: '2099-12-31',
      };
      await a.http().post('/api/emergencias').send(nueva).expect(401);

      const operador = await crearUsuarioActivo(a, tokenAdmin, { rol: 'OPERADOR' });
      await a
        .http()
        .post('/api/emergencias')
        .set('authorization', `Bearer ${operador.token}`)
        .send(nueva)
        .expect(403);
    });
```

Y en la primera línea del archivo, agregar `crearUsuarioActivo` al import:

```ts
import {
  ADMIN,
  crearAppPrueba,
  crearUsuarioActivo,
  iniciarSesion,
  type AppPrueba,
} from '../../test/app-prueba';
```

- [ ] **Paso 2: Correrla y verla fallar**

```bash
cd apps/api && bunx jest -c jest.int.config.cjs --runInBand src/pruebas-integracion/catalogo.int.test.ts -t 'sin sesión'
```

Resultado esperado: falla con `expected 200 "OK", got 401 "Unauthorized"`.

- [ ] **Paso 3: Marcar el endpoint como público**

En `catalogo.controller.ts`, agregar `Publico` al import de
`../../comun/autorizacion/decoradores` y el decorador sobre el método:

```ts
  @Publico()
  @Get('emergencias')
  @ApiOkResponse({ type: EmergenciaDto, isArray: true })
  listarEmergencias(@Query() filtro: FiltroEmergenciasDto) {
    return this.emergencias.listar(filtro.estado);
  }
```

- [ ] **Paso 4: Correrla y verla pasar**

El mismo comando del paso 2. Resultado esperado: `1 passed`.

- [ ] **Paso 5: Regenerar el contrato y actualizar su tabla**

```bash
bun run --filter @acopio/api openapi
git diff --stat docs/03-diseno/api/openapi.json
```

Resultado esperado: el diff quita `"security": [{"bearer": []}]` del `get` de
`/api/emergencias` y nada más.

En `docs/03-diseno/api/README.md`, añadir debajo de la tabla de pantallas:

```markdown
**Lectura pública.** `GET /emergencias` no exige sesión: la usa la Portada. Crear,
editar y cerrar una emergencia sigue siendo del administrador.
```

y poner `actualizado: 2026-09-30` en su frontmatter.

- [ ] **Paso 6: Suite completa y commit**

```bash
bun run lint && bun run typecheck && bun run --filter @acopio/api depcruise && bun run test && bun run test:int
git add apps/api docs/03-diseno/api
git commit -m "API: las emergencias se leen sin sesión, para la Portada"
```

## Tarea 4: `packages/ui-tokens`

**Archivos:**
- Crear: `packages/ui-tokens/package.json`
- Crear: `packages/ui-tokens/src/tokens.css`
- Crear: `packages/ui-tokens/src/tailwind.css`
- Crear: `packages/ui-tokens/src/contraste.test.mjs`

**Produce:** dos hojas importables, `@acopio/ui-tokens/tokens.css` (variables CSS) y
`@acopio/ui-tokens/tailwind.css` (tema de Tailwind 4). Clases disponibles después:
`bg-marca-700`, `text-neutro-900`, `border-neutro-200`, `bg-lienzo`, `text-critico`,
`rounded-tarjeta`, `rounded-boton`.

- [ ] **Paso 1: Escribir la prueba de contraste que falla**

`packages/ui-tokens/src/contraste.test.mjs`. Usa el corredor de pruebas de Node, sin
dependencias:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');
const token = (nombre) => {
  const m = css.match(new RegExp(`--${nombre}:\\s*(#[0-9A-Fa-f]{6})`));
  assert.ok(m, `falta el token --${nombre}`);
  return m[1];
};
const luminancia = (hex) => {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contraste = (a, b) => {
  const [x, y] = [luminancia(token(a)), luminancia(token(b))].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// sistema-diseno.md §9: AA (4.5:1) como piso, AAA (7:1) en datos
test('el texto principal sobre el lienzo cumple AAA', () => {
  assert.ok(contraste('neutro-900', 'neutro-50') >= 7);
});
test('el texto secundario sobre blanco cumple AA', () => {
  assert.ok(contraste('neutro-600', 'blanco') >= 4.5);
});
test('el blanco sobre el color de marca cumple AA', () => {
  assert.ok(contraste('blanco', 'marca-700') >= 4.5);
});
test('el color de marca como texto sobre el lienzo cumple AA', () => {
  assert.ok(contraste('marca-700', 'neutro-50') >= 4.5);
});
```

- [ ] **Paso 2: Correrla y verla fallar**

```bash
node --test packages/ui-tokens/src/
```

Resultado esperado: falla con `ENOENT ... tokens.css`.

- [ ] **Paso 3: Escribir el paquete**

`packages/ui-tokens/package.json`:

```json
{
  "name": "@acopio/ui-tokens",
  "version": "0.0.0",
  "private": true,
  "description": "Tokens del sistema de diseño: el único lugar donde se escribe un color",
  "type": "module",
  "exports": {
    "./tokens.css": "./src/tokens.css",
    "./tailwind.css": "./src/tailwind.css"
  },
  "scripts": {
    "test": "node --test src/"
  }
}
```

`packages/ui-tokens/src/tokens.css`, copiado de `docs/03-diseno/sistema-diseno.md`
§2 a §4:

```css
/* Tokens de Acopio. Fuente: docs/03-diseno/sistema-diseno.md. No escribir colores
   fuera de este archivo (ADR-0006). */
:root {
  /* Marca */
  --marca-900: #0A4F4F;
  --marca-700: #0F6E6E;
  --marca-500: #14A0A0;
  --marca-100: #C7E8E8;
  --marca-50: #E6F4F4;

  /* Neutros cálidos */
  --neutro-900: #1C1917;
  --neutro-700: #44403C;
  --neutro-600: #57534E;
  --neutro-400: #A8A29E;
  --neutro-200: #E7E5E4;
  --neutro-100: #F5F5F4;
  --neutro-50: #FAFAF9;
  --blanco: #FFFFFF;

  /* Semáforo: reservados para el estado del inventario */
  --estado-critico: #DC2626;
  --estado-atencion: #D97706;
  --estado-ok: #16A34A;
  --estado-saturado: #7C3AED;
  --fondo-critico: #FEF2F2;
  --fondo-atencion: #FFFBEB;
  --fondo-ok: #F0FDF4;
  --fondo-saturado: #F5F3FF;

  /* Tipografía */
  --fuente: 'Inter Variable', 'Inter', system-ui, sans-serif;
  --texto-xs: 12px;
  --texto-sm: 14px;
  --texto-base: 16px;
  --texto-lg: 18px;
  --texto-xl: 22px;
  --texto-2xl: 28px;
  --texto-3xl: 36px;

  /* Radio */
  --radio-sm: 8px;
  --radio-md: 10px;
  --radio-lg: 12px;
  --radio-full: 999px;
}
```

`packages/ui-tokens/src/tailwind.css`. `--color-*: initial` borra la paleta de
Tailwind, así `bg-red-500` deja de existir y solo quedan los tokens:

```css
@theme inline {
  --color-*: initial;

  --color-marca-900: var(--marca-900);
  --color-marca-700: var(--marca-700);
  --color-marca-500: var(--marca-500);
  --color-marca-100: var(--marca-100);
  --color-marca-50: var(--marca-50);

  --color-neutro-900: var(--neutro-900);
  --color-neutro-700: var(--neutro-700);
  --color-neutro-600: var(--neutro-600);
  --color-neutro-400: var(--neutro-400);
  --color-neutro-200: var(--neutro-200);
  --color-neutro-100: var(--neutro-100);
  --color-lienzo: var(--neutro-50);
  --color-blanco: var(--blanco);

  --color-critico: var(--estado-critico);
  --color-atencion: var(--estado-atencion);
  --color-ok: var(--estado-ok);
  --color-saturado: var(--estado-saturado);
  --color-fondo-critico: var(--fondo-critico);
  --color-fondo-atencion: var(--fondo-atencion);
  --color-fondo-ok: var(--fondo-ok);
  --color-fondo-saturado: var(--fondo-saturado);

  --font-sans: var(--fuente);

  --text-xs: var(--texto-xs);
  --text-sm: var(--texto-sm);
  --text-base: var(--texto-base);
  --text-lg: var(--texto-lg);
  --text-xl: var(--texto-xl);
  --text-2xl: var(--texto-2xl);
  --text-3xl: var(--texto-3xl);

  --radius-etiqueta: var(--radio-sm);
  --radius-boton: var(--radio-md);
  --radius-tarjeta: var(--radio-lg);
}
```

- [ ] **Paso 4: Correr la prueba y verla pasar**

```bash
bun install
bun run --filter @acopio/ui-tokens test
```

Resultado esperado: `pass 4`, `fail 0`.

- [ ] **Paso 5: Commit**

```bash
git add packages/ui-tokens bun.lock
git commit -m "ui-tokens: tokens del sistema de diseño y tema de Tailwind"
```

## Tarea 5: Esqueleto de `apps/web`

**Archivos:**
- Crear: `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/vite.config.ts`
- Crear: `apps/web/index.html`, `apps/web/src/main.tsx`, `apps/web/src/estilos.css`
- Crear: `apps/web/src/pruebas/preparar.ts`, `apps/web/src/vite-env.d.ts`
- Crear: `apps/web/src/App.tsx`, `apps/web/src/App.test.tsx`
- Modificar: `eslint.config.mjs`, `apps/api/Dockerfile`, `.env.example`

**Produce:** `bun run --filter @acopio/web dev` sirve en `http://localhost:5173`.
Scripts `dev`, `build`, `typecheck` y `test`. Vitest con jsdom, los matchers de
`@testing-library/jest-dom` y las funciones `describe`, `it` y `expect` globales.

- [ ] **Paso 1: Crear el paquete e instalar**

`apps/web/package.json`:

```json
{
  "name": "@acopio/web",
  "version": "0.0.0",
  "private": true,
  "description": "Interfaz de Acopio: portal público y consola",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run",
    "api:tipos": "openapi-typescript ../../docs/03-diseno/api/openapi.json -o src/api/esquema.d.ts"
  },
  "dependencies": {
    "@acopio/ui-tokens": "workspace:*"
  }
}
```

```bash
cd apps/web
bun add react react-dom react-router @tanstack/react-query openapi-fetch lucide-react @fontsource-variable/inter
bun add -d vite @vitejs/plugin-react tailwindcss @tailwindcss/vite vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom axe-core openapi-typescript @types/react @types/react-dom
cd ../..
bun add -d eslint-plugin-react-hooks
```

- [ ] **Paso 2: Configuración**

`apps/web/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "noEmit": true,
    "declaration": false,
    "types": ["vite/client", "vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src", "vite.config.ts"]
}
```

`apps/web/vite.config.ts`:

```ts
/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // El .env vive en la raíz del monorepo
  envDir: '../..',
  server: { port: 5173, strictPort: true },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/pruebas/preparar.ts'],
    css: false,
  },
});
```

`apps/web/src/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Origen de la API, sin /api al final. Por defecto http://localhost:3000 */
  readonly VITE_API_URL?: string;
}
```

`apps/web/src/pruebas/preparar.ts`:

```ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
```

`apps/web/index.html`:

```html
<!doctype html>
<html lang="es-CO">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Acopio coordina la ayuda en emergencias: qué hace falta, dónde entregarlo y cómo sumarse." />
    <title>Acopio</title>
  </head>
  <body>
    <div id="raiz"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`apps/web/src/estilos.css`:

```css
@import 'tailwindcss';
@import '@fontsource-variable/inter';
@import '@acopio/ui-tokens/tokens.css';
@import '@acopio/ui-tokens/tailwind.css';

body {
  background-color: var(--neutro-50);
  color: var(--neutro-900);
  font-family: var(--fuente);
  font-size: var(--texto-base);
}

/* Foco visible con teclado en todo elemento interactivo */
:focus-visible {
  outline: 3px solid var(--marca-500);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}
```

- [ ] **Paso 3: Escribir la prueba que falla**

`apps/web/src/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { App } from './App';

it('la aplicación arranca y muestra el nombre del producto', () => {
  render(<App />);
  expect(screen.getByRole('heading', { level: 1, name: 'Acopio' })).toBeInTheDocument();
});
```

```bash
bun run --filter @acopio/web test
```

Resultado esperado: falla porque `./App` no existe.

- [ ] **Paso 4: Código mínimo**

`apps/web/src/App.tsx`:

```tsx
export function App() {
  return (
    <main className="mx-auto max-w-md p-4">
      <h1 className="text-2xl font-bold">Acopio</h1>
    </main>
  );
}
```

`apps/web/src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './estilos.css';

createRoot(document.getElementById('raiz')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Paso 5: Lint para la web**

En `eslint.config.mjs`, agregar el import y un bloque antes de `prettier`:

```js
import reactHooks from 'eslint-plugin-react-hooks';
```

```js
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: { globals: globals.browser },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
```

Y añadir `'apps/web/src/api/esquema.d.ts'` a la lista `ignores` del primer bloque.
En `.prettierignore`, añadir la línea `apps/web/src/api/esquema.d.ts`.

- [ ] **Paso 6: El Dockerfile de la API conoce los paquetes nuevos**

`bun install --frozen-lockfile` falla dentro de la imagen si el `bun.lock` nombra
paquetes del monorepo cuyo `package.json` no se copió. En `apps/api/Dockerfile`,
después de `COPY packages/shared/package.json packages/shared/`:

```dockerfile
COPY packages/ui-tokens/package.json packages/ui-tokens/
COPY apps/web/package.json apps/web/
```

- [ ] **Paso 7: Variable de entorno**

En `.env.example`, dentro de la sección «Aplicación»:

```
# Origen de la API para la web (Vite). Sin /api al final. Nunca un secreto en VITE_*
VITE_API_URL=http://localhost:3000
```

- [ ] **Paso 8: Verificar todo el esqueleto**

```bash
bun run --filter @acopio/web test
bun run lint && bun run typecheck && bun run test
bun run --filter @acopio/web build
docker build -f apps/api/Dockerfile -t acopio-api:prueba .
./scripts/revisar-colores.sh
```

Resultado esperado: todo en verde; el script de colores dice «Sin colores
hexadecimales fuera de packages/ui-tokens».

Después, `bun run --filter @acopio/web dev` y abrir `http://localhost:5173`: se ve
«Acopio» en Inter sobre fondo cálido.

Si `typecheck` o `build` fallan por una incompatibilidad entre TypeScript 6 y alguna
herramienta, parar aquí y reportarlo con el mensaje exacto. No subir TypeScript.

- [ ] **Paso 9: Commit**

```bash
git add apps/web apps/api/Dockerfile eslint.config.mjs .prettierignore .env.example package.json bun.lock
git commit -m "web: esqueleto con Vite, React, Tailwind y Vitest"
```

## Tarea 6: Cliente de la API y consulta de emergencias

**Archivos:**
- Crear: `apps/web/src/api/esquema.d.ts` (generado)
- Crear: `apps/web/src/api/cliente.ts`
- Crear: `apps/web/src/api/emergencias.ts`
- Probar: `apps/web/src/api/emergencias.test.tsx`
- Crear: `apps/web/src/pruebas/utilidades.tsx`

**Consume:** `GET /api/emergencias` público (Tarea 3).

**Produce:**

```ts
// cliente.ts
export class ErrorApi extends Error { estado: number; codigo: string }
export const api: Client<paths>

// emergencias.ts
export type Emergencia = components['schemas']['EmergenciaDto'];
export function useEmergenciasVigentes(): UseQueryResult<Emergencia[], ErrorApi>
//   activas primero y luego en seguimiento; nunca incluye las cerradas

// pruebas/utilidades.tsx
export function responderJson(cuerpo: unknown, estado?: number): void   // simula fetch
export function responderError(): void                                  // fetch rechaza
export function envolver(ui: ReactNode, ruta?: string): ReactElement    // QueryClient + router
```

- [ ] **Paso 1: Generar los tipos**

```bash
bun run --filter @acopio/web api:tipos
grep -n "'/api/emergencias'" apps/web/src/api/esquema.d.ts
```

Resultado esperado: el archivo existe y contiene la ruta. Si el generador falla con el
`openapi.json`, el error se corrige en la API y se regenera el contrato; no se edita
el archivo generado a mano.

- [ ] **Paso 2: Utilidades de prueba**

`apps/web/src/pruebas/utilidades.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { vi } from 'vitest';

/** La próxima llamada a fetch responde este JSON. */
export function responderJson(cuerpo: unknown, estado = 200): void {
  vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
    Promise.resolve(
      new Response(JSON.stringify(cuerpo), {
        status: estado,
        headers: { 'content-type': 'application/json' },
      }),
    ),
  );
}

/** fetch falla como cuando no hay red. */
export function responderError(): void {
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
}

/** Envuelve con un cliente de consultas sin reintentos y un enrutador en memoria. */
export function envolver(ui: ReactNode, ruta = '/'): ReactElement {
  const consultas = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={consultas}>
      <MemoryRouter initialEntries={[ruta]}>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}
```

- [ ] **Paso 3: Escribir las pruebas que fallan**

`apps/web/src/api/emergencias.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { envolver, responderError, responderJson } from '../pruebas/utilidades';
import { useEmergenciasVigentes, type Emergencia } from './emergencias';

const emergencia = (datos: Partial<Emergencia>): Emergencia => ({
  id: '11111111-1111-4111-8111-111111111111',
  nombre: 'Sismo de prueba',
  tipo: 'sismo',
  inicio: '2026-09-01T00:00:00.000Z',
  horizonteDias: 7,
  estado: 'ACTIVA',
  destacadaHasta: '2026-12-31T00:00:00.000Z',
  cerradaEn: null,
  motivoCierre: [],
  ...datos,
});

function Lista() {
  const { data, error, isPending } = useEmergenciasVigentes();
  if (isPending) return <p>cargando</p>;
  if (error) return <p>error: {error.message}</p>;
  return <p>{data.map((e) => e.nombre).join(', ') || 'ninguna'}</p>;
}

it('entrega activas y en seguimiento, sin las cerradas', async () => {
  responderJson([
    emergencia({ id: 'a', nombre: 'Activa' }),
    emergencia({ id: 'b', nombre: 'Seguimiento', estado: 'EN_SEGUIMIENTO' }),
    emergencia({ id: 'c', nombre: 'Cerrada', estado: 'CERRADA' }),
  ]);
  render(envolver(<Lista />));
  expect(await screen.findByText('Activa, Seguimiento')).toBeInTheDocument();
});

it('con solo emergencias cerradas entrega una lista vacía', async () => {
  responderJson([emergencia({ estado: 'CERRADA' })]);
  render(envolver(<Lista />));
  expect(await screen.findByText('ninguna')).toBeInTheDocument();
});

it('un error de la API llega con el mensaje que mandó la API', async () => {
  responderJson({ estado: 503, codigo: 'SIN_BASE', mensaje: 'La base no responde' }, 503);
  render(envolver(<Lista />));
  expect(await screen.findByText('error: La base no responde')).toBeInTheDocument();
});

it('sin red, el error dice que no hay conexión', async () => {
  responderError();
  render(envolver(<Lista />));
  expect(
    await screen.findByText('error: No pudimos conectar con Acopio. Revisa tu conexión.'),
  ).toBeInTheDocument();
});
```

```bash
bun run --filter @acopio/web test
```

Resultado esperado: fallan porque `./emergencias` no existe.

- [ ] **Paso 4: Implementar**

`apps/web/src/api/cliente.ts`:

```ts
import createClient from 'openapi-fetch';
import type { paths } from './esquema';

/** Error de la API con su forma { estado, codigo, mensaje }, o de red (estado 0). */
export class ErrorApi extends Error {
  constructor(
    readonly estado: number,
    readonly codigo: string,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = 'ErrorApi';
  }
}

const SIN_RED = 'No pudimos conectar con Acopio. Revisa tu conexión.';

export const api = createClient<paths>({
  baseUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  // Se resuelve en cada llamada para que las pruebas puedan simular fetch
  fetch: (peticion) => globalThis.fetch(peticion),
});

/** Convierte lo que devuelve openapi-fetch en datos o en un ErrorApi. */
export async function desenvolver<T>(
  llamada: Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<T> {
  let r: Awaited<typeof llamada>;
  try {
    r = await llamada;
  } catch {
    throw new ErrorApi(0, 'SIN_RED', SIN_RED);
  }
  if (r.data !== undefined && r.response.ok) return r.data;
  const e = (r.error ?? {}) as { codigo?: string; mensaje?: string };
  throw new ErrorApi(
    r.response.status,
    e.codigo ?? 'ERROR',
    e.mensaje ?? 'Algo falló al consultar Acopio. Intenta de nuevo.',
  );
}
```

`apps/web/src/api/emergencias.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { api, desenvolver, type ErrorApi } from './cliente';
import type { components } from './esquema';

export type Emergencia = components['schemas']['EmergenciaDto'];

/** Emergencias que el portal muestra: activas y en seguimiento, en el orden de la API. */
export function useEmergenciasVigentes() {
  return useQuery<Emergencia[], ErrorApi>({
    queryKey: ['emergencias', 'vigentes'],
    queryFn: async () => {
      const todas = await desenvolver(api.GET('/api/emergencias'));
      return todas.filter((e) => e.estado !== 'CERRADA');
    },
  });
}
```

- [ ] **Paso 5: Correr y ver pasar**

```bash
bun run --filter @acopio/web test && bun run lint && bun run typecheck
```

Resultado esperado: 5 pruebas pasan (las 4 nuevas y la de `App`).

- [ ] **Paso 6: Commit**

```bash
git add apps/web
git commit -m "web: cliente tipado desde el contrato y consulta de emergencias"
```

## Tarea 7: Componentes base

**Archivos:**
- Crear: `apps/web/src/componentes/Boton.tsx`
- Crear: `apps/web/src/componentes/EstadoVacio.tsx`
- Crear: `apps/web/src/componentes/EstadoError.tsx`
- Crear: `apps/web/src/componentes/Esqueleto.tsx`
- Probar: `apps/web/src/componentes/componentes.test.tsx`
- Crear: `apps/web/src/pruebas/accesibilidad.ts`

**Produce:**

```tsx
<Boton variante="primario" | "secundario" | "fantasma" onClick type disabled>texto</Boton>
<EnlaceBoton variante a="/ruta">texto</EnlaceBoton>        // mismo aspecto, navega
<EstadoVacio titulo="…">explicación</EstadoVacio>
<EstadoError mensaje="…" alReintentar={() => void} />
<Esqueleto etiqueta="Cargando emergencias" className="h-24" />

// pruebas/accesibilidad.ts
export async function violacionesGraves(nodo: Element): Promise<string[]>
//   identificadores de las reglas de axe con impacto crítico o serio
```

- [ ] **Paso 1: Ayudante de accesibilidad**

`apps/web/src/pruebas/accesibilidad.ts`:

```ts
import axe from 'axe-core';

/** Reglas de axe incumplidas con impacto crítico o serio. jsdom no calcula el
 *  contraste de color; eso lo cubre la prueba de packages/ui-tokens. */
export async function violacionesGraves(nodo: Element): Promise<string[]> {
  const r = await axe.run(nodo, { rules: { 'color-contrast': { enabled: false } } });
  return r.violations
    .filter((v) => v.impact === 'critical' || v.impact === 'serious')
    .map((v) => v.id);
}
```

- [ ] **Paso 2: Escribir las pruebas que fallan**

`apps/web/src/componentes/componentes.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { vi } from 'vitest';
import { violacionesGraves } from '../pruebas/accesibilidad';
import { Boton, EnlaceBoton } from './Boton';
import { Esqueleto } from './Esqueleto';
import { EstadoError } from './EstadoError';
import { EstadoVacio } from './EstadoVacio';

describe('Boton', () => {
  it('responde al clic y a la tecla Enter', async () => {
    const alPulsar = vi.fn();
    render(<Boton onClick={alPulsar}>Reintentar</Boton>);
    const boton = screen.getByRole('button', { name: 'Reintentar' });
    await userEvent.click(boton);
    boton.focus();
    await userEvent.keyboard('{Enter}');
    expect(alPulsar).toHaveBeenCalledTimes(2);
  });

  it('por defecto es type="button", para no enviar formularios sin querer', () => {
    render(<Boton>Guardar</Boton>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('EnlaceBoton navega a su ruta', () => {
    render(
      <MemoryRouter>
        <EnlaceBoton a="/mapa">Ver el mapa</EnlaceBoton>
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Ver el mapa' })).toHaveAttribute('href', '/mapa');
  });
});

describe('estados', () => {
  it('EstadoVacio muestra título y explicación', () => {
    render(<EstadoVacio titulo="Sin jornadas">Todavía no hay jornadas publicadas.</EstadoVacio>);
    expect(screen.getByText('Sin jornadas')).toBeInTheDocument();
    expect(screen.getByText('Todavía no hay jornadas publicadas.')).toBeInTheDocument();
  });

  it('EstadoError se anuncia como alerta y permite reintentar', async () => {
    const alReintentar = vi.fn();
    render(<EstadoError mensaje="No hay conexión" alReintentar={alReintentar} />);
    expect(screen.getByRole('alert')).toHaveTextContent('No hay conexión');
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(alReintentar).toHaveBeenCalledOnce();
  });

  it('Esqueleto avisa a los lectores de pantalla que está cargando', () => {
    render(<Esqueleto etiqueta="Cargando emergencias" />);
    expect(screen.getByRole('status', { name: 'Cargando emergencias' })).toBeInTheDocument();
  });

  it('ninguno tiene violaciones graves de accesibilidad', async () => {
    const { container } = render(
      <MemoryRouter>
        <Boton>Uno</Boton>
        <EnlaceBoton a="/x">Dos</EnlaceBoton>
        <EstadoVacio titulo="Vacío">Texto</EstadoVacio>
        <EstadoError mensaje="Falló" alReintentar={() => {}} />
        <Esqueleto etiqueta="Cargando" />
      </MemoryRouter>,
    );
    expect(await violacionesGraves(container)).toEqual([]);
  });
});
```

```bash
bun run --filter @acopio/web test
```

Resultado esperado: fallan porque los componentes no existen.

- [ ] **Paso 3: Implementar**

`apps/web/src/componentes/Boton.tsx`:

```tsx
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router';

type Variante = 'primario' | 'secundario' | 'fantasma';

// sistema-diseno.md §5: primario de 56 px y ancho completo; los demás de 48 px
const BASE =
  'inline-flex items-center justify-center gap-2 rounded-boton px-4 text-base font-medium ' +
  'disabled:cursor-not-allowed disabled:opacity-60';
const POR_VARIANTE: Record<Variante, string> = {
  primario: 'min-h-14 w-full bg-marca-700 text-blanco hover:bg-marca-900',
  secundario: 'min-h-12 border-2 border-marca-700 bg-blanco text-marca-700 hover:bg-marca-50',
  fantasma: 'min-h-12 text-marca-700 underline underline-offset-4 hover:bg-marca-50',
};

const clases = (variante: Variante, extra = '') => `${BASE} ${POR_VARIANTE[variante]} ${extra}`;

interface PropsBoton extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
}

export function Boton({ variante = 'primario', className, type = 'button', ...resto }: PropsBoton) {
  return <button type={type} className={clases(variante, className)} {...resto} />;
}

interface PropsEnlace {
  a: string;
  variante?: Variante;
  className?: string;
  children: ReactNode;
}

/** Un enlace con aspecto de botón: navega, así que es un <a> y no un <button>. */
export function EnlaceBoton({ a, variante = 'primario', className, children }: PropsEnlace) {
  return (
    <Link to={a} className={clases(variante, className)}>
      {children}
    </Link>
  );
}
```

`apps/web/src/componentes/EstadoVacio.tsx`:

```tsx
import type { ReactNode } from 'react';

interface Props {
  titulo: string;
  children: ReactNode;
}

/** Un bloque sin datos dice qué mostrará y por qué está vacío. Nunca queda en blanco. */
export function EstadoVacio({ titulo, children }: Props) {
  return (
    <div className="rounded-tarjeta border border-dashed border-neutro-400 bg-neutro-100 p-4">
      <p className="font-medium text-neutro-900">{titulo}</p>
      <p className="mt-1 text-neutro-600">{children}</p>
    </div>
  );
}
```

`apps/web/src/componentes/EstadoError.tsx`:

```tsx
import { Boton } from './Boton';

interface Props {
  mensaje: string;
  alReintentar: () => void;
}

/** Qué pasó y qué hacer. El borde es neutro: el rojo está reservado al inventario. */
export function EstadoError({ mensaje, alReintentar }: Props) {
  return (
    <div role="alert" className="rounded-tarjeta border-2 border-neutro-900 bg-blanco p-4">
      <p className="font-medium text-neutro-900">{mensaje}</p>
      <Boton variante="secundario" className="mt-3" onClick={alReintentar}>
        Reintentar
      </Boton>
    </div>
  );
}
```

`apps/web/src/componentes/Esqueleto.tsx`:

```tsx
interface Props {
  etiqueta: string;
  className?: string;
}

/** Marcador con la forma del contenido mientras carga. */
export function Esqueleto({ etiqueta, className = 'h-24' }: Props) {
  return (
    <div
      role="status"
      aria-label={etiqueta}
      className={`animate-pulse rounded-tarjeta bg-neutro-200 ${className}`}
    />
  );
}
```

- [ ] **Paso 4: Correr y ver pasar**

```bash
bun run --filter @acopio/web test && bun run lint && bun run typecheck && ./scripts/revisar-colores.sh
```

- [ ] **Paso 5: Commit**

```bash
git add apps/web
git commit -m "web: componentes base (botón y estados vacío, de carga y de error)"
```

## Tarea 8: Rutas y navegación del portal

**Archivos:**
- Crear: `apps/web/src/portal/BarraNavegacion.tsx`
- Crear: `apps/web/src/portal/MarcoPortal.tsx`
- Crear: `apps/web/src/portal/Proximamente.tsx`
- Crear: `apps/web/src/portal/NoEncontrada.tsx`
- Crear: `apps/web/src/rutas.tsx`
- Modificar: `apps/web/src/App.tsx`, `apps/web/src/main.tsx`
- Probar: `apps/web/src/rutas.test.tsx` (reemplaza a `App.test.tsx`, que se borra)

**Produce:** `<Rutas />`, que dibuja la tabla de rutas de la especificación §5 dentro
de `MarcoPortal` (contenido más barra inferior). La ruta `/` muestra por ahora un
marcador que la Tarea 9 reemplaza por `<Portada />`.

- [ ] **Paso 1: Escribir las pruebas que fallan**

`apps/web/src/rutas.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react';
import { envolver } from './pruebas/utilidades';
import { violacionesGraves } from './pruebas/accesibilidad';
import { Rutas } from './rutas';

it('la barra inferior tiene los cinco destinos del portal', () => {
  render(envolver(<Rutas />));
  const barra = screen.getByRole('navigation', { name: 'Secciones' });
  const nombres = within(barra)
    .getAllByRole('link')
    .map((e) => e.textContent);
  expect(nombres).toEqual(['Inicio', 'Mapa', 'Causas', 'Voluntariado', 'Más']);
});

it('marca la sección actual', () => {
  render(envolver(<Rutas />, '/mapa'));
  expect(screen.getByRole('link', { name: 'Mapa' })).toHaveAttribute('aria-current', 'page');
});

it.each(['/mapa', '/causas', '/voluntariado', '/mas', '/entrar'])(
  '%s muestra «Próximamente» con un enlace de vuelta',
  (ruta) => {
    render(envolver(<Rutas />, ruta));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Próximamente');
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/');
  },
);

it('una ruta que no existe lo dice y ofrece volver', () => {
  render(envolver(<Rutas />, '/no-existe'));
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('No encontramos esta página');
  expect(screen.getByRole('link', { name: 'Volver al inicio' })).toBeInTheDocument();
});

it('el marco no tiene violaciones graves de accesibilidad', async () => {
  const { container } = render(envolver(<Rutas />, '/mapa'));
  expect(await violacionesGraves(container)).toEqual([]);
});
```

```bash
git rm apps/web/src/App.test.tsx
bun run --filter @acopio/web test
```

Resultado esperado: fallan porque `./rutas` no existe.

- [ ] **Paso 2: Implementar**

`apps/web/src/portal/BarraNavegacion.tsx`:

```tsx
import { HandHeart, House, Map, Menu, Users, type LucideIcon } from 'lucide-react';
import { NavLink } from 'react-router';

const DESTINOS: { a: string; texto: string; Icono: LucideIcon }[] = [
  { a: '/', texto: 'Inicio', Icono: House },
  { a: '/mapa', texto: 'Mapa', Icono: Map },
  { a: '/causas', texto: 'Causas', Icono: HandHeart },
  { a: '/voluntariado', texto: 'Voluntariado', Icono: Users },
  { a: '/mas', texto: 'Más', Icono: Menu },
];

/** Barra fija al pie, al alcance del pulgar. */
export function BarraNavegacion() {
  return (
    <nav
      aria-label="Secciones"
      className="fixed inset-x-0 bottom-0 border-t border-neutro-200 bg-blanco"
    >
      <ul className="mx-auto flex max-w-md">
        {DESTINOS.map(({ a, texto, Icono }) => (
          <li key={a} className="flex-1">
            <NavLink
              to={a}
              end={a === '/'}
              className={({ isActive }) =>
                `flex min-h-14 flex-col items-center justify-center gap-1 text-xs ${
                  isActive ? 'font-bold text-marca-700' : 'text-neutro-600'
                }`
              }
            >
              <Icono aria-hidden="true" size={22} />
              {texto}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

`apps/web/src/portal/MarcoPortal.tsx`:

```tsx
import { Outlet } from 'react-router';
import { BarraNavegacion } from './BarraNavegacion';

/** Columna de ancho de teléfono con espacio al pie para la barra fija. */
export function MarcoPortal() {
  return (
    <>
      <main className="mx-auto max-w-md px-4 pt-4 pb-24">
        <Outlet />
      </main>
      <BarraNavegacion />
    </>
  );
}
```

`apps/web/src/portal/Proximamente.tsx`:

```tsx
import { EnlaceBoton } from '../componentes/Boton';

export function Proximamente() {
  return (
    <section className="space-y-4 pt-8">
      <h1 className="text-2xl font-bold">Próximamente</h1>
      <p className="text-neutro-600">
        Esta sección todavía no está lista. La estamos construyendo.
      </p>
      <EnlaceBoton a="/" variante="secundario">
        Volver al inicio
      </EnlaceBoton>
    </section>
  );
}
```

`apps/web/src/portal/NoEncontrada.tsx`:

```tsx
import { EnlaceBoton } from '../componentes/Boton';

export function NoEncontrada() {
  return (
    <section className="space-y-4 pt-8">
      <h1 className="text-2xl font-bold">No encontramos esta página</h1>
      <p className="text-neutro-600">El enlace puede estar mal escrito o la página ya no existe.</p>
      <EnlaceBoton a="/" variante="secundario">
        Volver al inicio
      </EnlaceBoton>
    </section>
  );
}
```

`apps/web/src/rutas.tsx`:

```tsx
import { Route, Routes } from 'react-router';
import { MarcoPortal } from './portal/MarcoPortal';
import { NoEncontrada } from './portal/NoEncontrada';
import { Proximamente } from './portal/Proximamente';

const SIN_CONSTRUIR = ['mapa', 'causas', 'voluntariado', 'mas', 'entrar'];

/** /consola/* queda reservado para el ciclo 2. */
export function Rutas() {
  return (
    <Routes>
      <Route element={<MarcoPortal />}>
        <Route index element={<h1 className="text-2xl font-bold">Acopio</h1>} />
        {SIN_CONSTRUIR.map((ruta) => (
          <Route key={ruta} path={ruta} element={<Proximamente />} />
        ))}
        <Route path="*" element={<NoEncontrada />} />
      </Route>
    </Routes>
  );
}
```

`apps/web/src/App.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router';
import { Rutas } from './rutas';

const consultas = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
});

export function App() {
  return (
    <QueryClientProvider client={consultas}>
      <BrowserRouter>
        <Rutas />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
```

`main.tsx` no cambia.

- [ ] **Paso 3: Correr y ver pasar**

```bash
bun run --filter @acopio/web test && bun run lint && bun run typecheck && ./scripts/revisar-colores.sh
```

- [ ] **Paso 4: Commit**

```bash
git add -A apps/web
git commit -m "web: rutas del portal y barra de navegación inferior"
```

## Tarea 9: La Portada

**Archivos:**
- Crear: `apps/web/src/portal/bloques/BloqueEmergencia.tsx`
- Crear: `apps/web/src/portal/bloques/ComoApoyar.tsx`
- Crear: `apps/web/src/portal/bloques/AvisoSinDinero.tsx`
- Crear: `apps/web/src/portal/bloques/BloqueSinDatos.tsx`
- Crear: `apps/web/src/portal/Portada.tsx`
- Modificar: `apps/web/src/rutas.tsx` (la ruta `index`)
- Probar: `apps/web/src/portal/Portada.test.tsx`

**Consume:** `useEmergenciasVigentes()` y `Emergencia` (Tarea 6); `Boton`,
`EnlaceBoton`, `EstadoVacio`, `EstadoError`, `Esqueleto` (Tarea 7); `envolver`,
`responderJson`, `responderError`, `violacionesGraves` (Tareas 6 y 7).

**Produce:** `<Portada />` en la ruta `/`.

El marcado sigue el diseño aprobado en la Tarea 2. Si esa aprobación cambió el orden o
el texto de un bloque, se ajusta aquí antes de escribir las pruebas.

- [ ] **Paso 1: Escribir las pruebas que fallan**

`apps/web/src/portal/Portada.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import type { Emergencia } from '../api/emergencias';
import { violacionesGraves } from '../pruebas/accesibilidad';
import { envolver, responderError, responderJson } from '../pruebas/utilidades';
import { Portada } from './Portada';

const emergencia = (datos: Partial<Emergencia>): Emergencia => ({
  id: 'a',
  nombre: 'Sismo en Caldas',
  tipo: 'sismo',
  inicio: '2026-09-01T00:00:00.000Z',
  horizonteDias: 7,
  estado: 'ACTIVA',
  destacadaHasta: '2026-12-31T00:00:00.000Z',
  cerradaEn: null,
  motivoCierre: [],
  ...datos,
});
const DOS = [
  emergencia({ id: 'a', nombre: 'Sismo en Caldas' }),
  emergencia({ id: 'b', nombre: 'Inundación en La Mojana', estado: 'EN_SEGUIMIENTO' }),
];
const FIJOS = ['Cómo apoyar', 'Acopio no recibe dinero'];

describe('con emergencias', () => {
  it('muestra la primera como título de la página', async () => {
    responderJson(DOS);
    render(envolver(<Portada />));
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Sismo en Caldas');
  });

  it('el selector cambia la emergencia mostrada', async () => {
    responderJson(DOS);
    render(envolver(<Portada />));
    await userEvent.selectOptions(await screen.findByLabelText('Emergencia'), 'b');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Inundación en La Mojana');
    expect(screen.getByText('En seguimiento')).toBeInTheDocument();
  });

  it('respeta la emergencia que viene en la URL', async () => {
    responderJson(DOS);
    render(envolver(<Portada />, '/?emergencia=b'));
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      'Inundación en La Mojana',
    );
  });

  it('con un identificador que no existe muestra la primera y no falla', async () => {
    responderJson(DOS);
    render(envolver(<Portada />, '/?emergencia=no-existe'));
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Sismo en Caldas');
  });

  it('con una sola emergencia no hay selector', async () => {
    responderJson([DOS[0]]);
    render(envolver(<Portada />));
    await screen.findByRole('heading', { level: 1, name: 'Sismo en Caldas' });
    expect(screen.queryByLabelText('Emergencia')).not.toBeInTheDocument();
  });

  it('los bloques sin backend explican por qué están vacíos y no inventan datos', async () => {
    responderJson(DOS);
    render(envolver(<Portada />));
    await screen.findByRole('heading', { level: 1 });
    for (const titulo of [
      'Zonas sin cobertura',
      'Qué hace falta',
      'Qué no traer',
      'Jornadas de voluntariado',
      'Desde el terreno',
    ]) {
      const bloque = screen.getByRole('region', { name: titulo });
      expect(within(bloque).getByText(/Todavía no/)).toBeInTheDocument();
    }
  });

  it('no tiene violaciones graves de accesibilidad', async () => {
    responderJson(DOS);
    const { container } = render(envolver(<Portada />));
    await screen.findByRole('heading', { level: 1 });
    expect(await violacionesGraves(container)).toEqual([]);
  });
});

describe('mientras carga', () => {
  it('muestra un esqueleto y el contenido fijo ya está visible', () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => {}));
    render(envolver(<Portada />));
    expect(screen.getByRole('status', { name: 'Cargando emergencias' })).toBeInTheDocument();
    for (const texto of FIJOS) expect(screen.getByText(texto)).toBeInTheDocument();
  });
});

describe('si la API falla', () => {
  it('dice qué pasó, deja reintentar y conserva el contenido fijo', async () => {
    responderError();
    render(envolver(<Portada />));
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos conectar con Acopio');
    for (const texto of FIJOS) expect(screen.getByText(texto)).toBeInTheDocument();

    responderJson(DOS);
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Sismo en Caldas');
  });

  it('no tiene violaciones graves de accesibilidad', async () => {
    responderError();
    const { container } = render(envolver(<Portada />));
    await screen.findByRole('alert');
    expect(await violacionesGraves(container)).toEqual([]);
  });
});

describe('sin emergencias vigentes', () => {
  it.each([
    ['la lista está vacía', []],
    ['todas están cerradas', [emergencia({ estado: 'CERRADA' })]],
  ])('cuando %s lo dice y no dibuja los bloques que dependen de una', async (_caso, lista) => {
    responderJson(lista);
    render(envolver(<Portada />));
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      'No hay emergencias activas',
    );
    expect(screen.queryByRole('region', { name: 'Qué hace falta' })).not.toBeInTheDocument();
    for (const texto of FIJOS) expect(screen.getByText(texto)).toBeInTheDocument();
  });
});
```

```bash
bun run --filter @acopio/web test
```

Resultado esperado: fallan porque `./Portada` no existe.

- [ ] **Paso 2: Bloques**

`apps/web/src/portal/bloques/BloqueSinDatos.tsx`:

```tsx
import type { ReactNode } from 'react';
import { EstadoVacio } from '../../componentes/EstadoVacio';

interface Props {
  titulo: string;
  /** Qué mostrará el bloque cuando tenga datos. */
  children: ReactNode;
}

/** Un bloque de la Portada cuyo módulo de backend aún no existe. */
export function BloqueSinDatos({ titulo, children }: Props) {
  const id = `bloque-${titulo.toLowerCase().replace(/[^a-záéíóúñ]+/g, '-')}`;
  return (
    <section aria-labelledby={id} className="space-y-2">
      <h2 id={id} className="text-xl font-bold">
        {titulo}
      </h2>
      <EstadoVacio titulo="Sin datos por ahora">{children}</EstadoVacio>
    </section>
  );
}
```

`apps/web/src/portal/bloques/BloqueEmergencia.tsx`:

```tsx
import type { Emergencia } from '../../api/emergencias';

interface Props {
  emergencias: Emergencia[];
  elegida: Emergencia;
  alElegir: (id: string) => void;
}

/** Lo primero que se lee: la emergencia, en palabras llanas. */
export function BloqueEmergencia({ emergencias, elegida, alElegir }: Props) {
  return (
    <section className="space-y-3">
      <h1 className="text-2xl leading-tight font-bold break-words">{elegida.nombre}</h1>
      {elegida.estado === 'EN_SEGUIMIENTO' && (
        <p className="inline-block rounded-etiqueta border border-neutro-400 px-2 py-1 text-sm text-neutro-700">
          En seguimiento
        </p>
      )}
      {emergencias.length > 1 && (
        <div>
          <label htmlFor="emergencia" className="block text-sm text-neutro-600">
            Emergencia
          </label>
          <select
            id="emergencia"
            value={elegida.id}
            onChange={(e) => alElegir(e.target.value)}
            className="mt-1 min-h-12 w-full rounded-boton border border-neutro-400 bg-blanco px-3 text-base"
          >
            {emergencias.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
                {e.estado === 'EN_SEGUIMIENTO' ? ' (en seguimiento)' : ''}
              </option>
            ))}
          </select>
        </div>
      )}
    </section>
  );
}
```

`apps/web/src/portal/bloques/ComoApoyar.tsx`:

```tsx
import { EnlaceBoton } from '../../componentes/Boton';

/** RF-HOM-001: tres acciones de igual peso. Debajo, rastrear un folio. */
export function ComoApoyar() {
  return (
    <section aria-labelledby="como-apoyar" className="space-y-3">
      <h2 id="como-apoyar" className="text-xl font-bold">
        Cómo apoyar
      </h2>
      <div className="space-y-2">
        <EnlaceBoton a="/mapa" variante="secundario" className="w-full">
          Donar en especie
        </EnlaceBoton>
        <EnlaceBoton a="/causas" variante="secundario" className="w-full">
          Donar a una causa
        </EnlaceBoton>
        <EnlaceBoton a="/voluntariado" variante="secundario" className="w-full">
          Ser voluntario
        </EnlaceBoton>
      </div>
      <EnlaceBoton a="/mas" variante="fantasma">
        Rastrear una donación con su folio
      </EnlaceBoton>
    </section>
  );
}
```

`apps/web/src/portal/bloques/AvisoSinDinero.tsx`:

```tsx
/** RF-HOM-001: aviso permanente y visible. */
export function AvisoSinDinero() {
  return (
    <section className="rounded-tarjeta border-2 border-neutro-900 bg-blanco p-4">
      <h2 className="font-bold">Acopio no recibe dinero</h2>
      <p className="mt-1 text-neutro-700">
        Si quieres donar dinero, te llevamos al sitio oficial de cada entidad. La donación
        se hace allá, nunca aquí.
      </p>
    </section>
  );
}
```

- [ ] **Paso 3: La pantalla**

`apps/web/src/portal/Portada.tsx`:

```tsx
import { Link, useSearchParams } from 'react-router';
import { useEmergenciasVigentes } from '../api/emergencias';
import { Esqueleto } from '../componentes/Esqueleto';
import { EstadoError } from '../componentes/EstadoError';
import { AvisoSinDinero } from './bloques/AvisoSinDinero';
import { BloqueEmergencia } from './bloques/BloqueEmergencia';
import { BloqueSinDatos } from './bloques/BloqueSinDatos';
import { ComoApoyar } from './bloques/ComoApoyar';

export function Portada() {
  const { data, error, isPending, refetch } = useEmergenciasVigentes();
  const [parametros, fijarParametros] = useSearchParams();

  const emergencias = data ?? [];
  // Un id desconocido en la URL cae en la primera emergencia vigente
  const elegida = emergencias.find((e) => e.id === parametros.get('emergencia')) ?? emergencias[0];

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <p className="text-lg font-bold text-marca-700">Acopio</p>
        <Link to="/entrar" className="inline-flex min-h-12 items-center px-2 text-marca-700 underline">
          Entrar
        </Link>
      </header>

      {isPending && <Esqueleto etiqueta="Cargando emergencias" className="h-28" />}

      {error && <EstadoError mensaje={error.message} alReintentar={() => void refetch()} />}

      {!isPending && !error && !elegida && (
        <section className="space-y-2">
          <h1 className="text-2xl leading-tight font-bold">No hay emergencias activas</h1>
          <p className="text-neutro-600">
            Cuando se declare una, aquí verás qué hace falta y dónde entregarlo.
          </p>
        </section>
      )}

      {elegida && (
        <>
          <BloqueEmergencia
            emergencias={emergencias}
            elegida={elegida}
            alElegir={(id) => fijarParametros({ emergencia: id }, { replace: true })}
          />
          <BloqueSinDatos titulo="Zonas sin cobertura">
            Todavía no hay zonas registradas. Aquí verás cuántas siguen sin recibir lo
            necesario.
          </BloqueSinDatos>
          <BloqueSinDatos titulo="Qué hace falta">
            Todavía no hay acopios registrados. Aquí verás qué insumos escasean en cada
            uno.
          </BloqueSinDatos>
          <BloqueSinDatos titulo="Qué no traer">
            Todavía no hay acopios registrados. Aquí verás qué ya sobra, para que no lo
            lleves.
          </BloqueSinDatos>
        </>
      )}

      <ComoApoyar />

      {elegida && (
        <>
          <BloqueSinDatos titulo="Jornadas de voluntariado">
            Todavía no hay jornadas publicadas. Aquí podrás reservar un cupo.
          </BloqueSinDatos>
          <BloqueSinDatos titulo="Desde el terreno">
            Todavía no hay reportes. Aquí verás las novedades de las entidades que
            atienden la emergencia.
          </BloqueSinDatos>
        </>
      )}

      <AvisoSinDinero />

      <p className="text-sm text-neutro-600">
        Tratamos los datos personales según la Ley 1581 de 2012.
      </p>
    </div>
  );
}
```

En `apps/web/src/rutas.tsx`, importar `Portada` y cambiar la ruta índice:

```tsx
import { Portada } from './portal/Portada';
```

```tsx
        <Route index element={<Portada />} />
```

- [ ] **Paso 4: Correr y ver pasar**

```bash
bun run --filter @acopio/web test && bun run lint && bun run typecheck && ./scripts/revisar-colores.sh
```

Antes de correr, en `apps/web/src/rutas.test.tsx`: la ruta `/` ahora consulta la API,
así que se importa `responderJson` desde `./pruebas/utilidades` y se añade al inicio
del archivo:

```tsx
beforeEach(() => responderJson([]));
```

Resultado esperado: todas las pruebas pasan.

- [ ] **Paso 5: Commit**

```bash
git add apps/web
git commit -m "web: Portada con emergencias reales y estados vacíos"
```

## Tarea 10: Recorrido real, documentación y cierre

**Archivos:**
- Modificar: `README.md`, `CLAUDE.md`
- Modificar: `docs/05-planes/2026-09-28-bloque-0-cimientos.md` (fila T13 a T16)
- Modificar: `docs/05-planes/README.md`, `docs/superpowers/specs/README.md`
- Modificar: la especificación de este ciclo (criterios de salida y «Cambios al construir»)
- Modificar: `docs/03-diseno/stitch/P01-portada/README.md` (diferencias aceptadas)

- [ ] **Paso 1: Levantar todo**

```bash
bun run servicios:todo
bun run --filter @acopio/api db:migrar && bun run --filter @acopio/api seed
bun run --filter @acopio/web dev
```

- [ ] **Paso 2: Crear una emergencia y verla en la Portada**

```bash
T=$(curl -s -X POST localhost:3000/api/auth/sesion -H 'content-type: application/json' \
  -d '{"usuario":"admin","contrasena":"cambiar-antes-de-usar"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["accessToken"])')
curl -s -X POST localhost:3000/api/emergencias -H "authorization: Bearer $T" -H 'content-type: application/json' \
  -d '{"nombre":"Inundaciones en el bajo Cauca antioqueño y el sur de Córdoba","tipo":"inundación","inicio":"2026-09-20","destacadaHasta":"2026-12-31"}'
curl -s -o /dev/null -w '%{http_code}\n' localhost:3000/api/emergencias
```

Resultado esperado: el último comando responde `200` sin token.

- [ ] **Paso 3: Revisar en 360 × 640 px**

Abrir `http://localhost:5173` con las herramientas del navegador en 360 × 640 y
comparar contra `docs/03-diseno/stitch/P01-portada/captura.png`. Comprobar:

- El nombre largo de la emergencia salta de línea y no hay desplazamiento horizontal.
- La barra inferior no tapa el último bloque.
- Con la API apagada (`docker compose -p acopio stop api`) aparece el error con
  «Reintentar», y al encenderla y reintentar vuelve la emergencia.
- Recorrer toda la página con la tecla Tab: el foco siempre se ve.
- Con la pestaña de accesibilidad o la extensión de axe: sin violaciones críticas ni
  serias, incluido el contraste.

Guardar una captura de la Portada construida en
`docs/03-diseno/stitch/P01-portada/construida.png` y anotar en su `README.md`
cualquier diferencia con el diseño que se acepte.

- [ ] **Paso 4: Documentación**

Invocar `humanizer:humanizer` antes de escribir.

- `README.md`: en «Estructura», `apps/web` pasa a ✔ y se añade `packages/ui-tokens`;
  en «Desarrollo», la línea `bun run --filter @acopio/web dev    # web en http://localhost:5173`.
- `CLAUDE.md`: en «Comandos», el mismo comando y `bun run --filter @acopio/web api:tipos`;
  en «Arquitectura», quitar que `apps/web` y `packages/ui-tokens` no existen y
  describirlos en una línea cada uno; en «Reglas que atraviesan varios archivos», que
  si cambia el contrato se corre `api:tipos` además de `openapi`.
- Plan del Bloque 0: la fila «T13 a T16 Interfaz» enlaza a este plan y dice qué quedó
  hecho (tokens, esqueleto, Portada) y qué sigue (C01 y consola, ciclo 2).
- Índices de planes y de especificaciones: estado del ciclo 1.
- Especificación: marcar los criterios de salida cumplidos y añadir la sección
  «Cambios al construir» con lo que haya cambiado. Como mínimo: `VITE_API_URL` es el
  origen sin `/api`, porque las rutas del contrato ya lo traen, y el distintivo de
  estado del inventario no se construyó porque ningún bloque de este ciclo lo usa.

- [ ] **Paso 5: Verificación final, commit y push**

```bash
bun run lint && bun run typecheck && bun run --filter @acopio/api depcruise && bun run test && bun run test:int && ./scripts/revisar-colores.sh
git add -A
git commit -m "Interfaz: cierre del ciclo 1, Portada en apps/web"
git push origin main
gh run watch "$(gh run list --branch main --limit 1 --json databaseId -q '.[0].databaseId')" --exit-status
```

Resultado esperado: el CI de `main` termina en verde.
