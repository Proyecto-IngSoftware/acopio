---
title: "Bloque 4 · interfaz, ciclo 1: el motor para el Administrador · plan"
type: plan
tags: [plan, bloque-4, web, consola, motor]
estado: propuesto
bloque: 4
actualizado: 2026-10-14
---

# Bloque 4 · interfaz, ciclo 1: el motor para el Administrador · plan de implementación

> **Para agentes:** se ejecuta con superpowers:subagent-driven-development o
> superpowers:executing-plans, tarea por tarea. Los pasos usan casillas (`- [ ]`).

**Objetivo:** el Administrador ve qué le falta a cada zona (C10), corrige una necesidad,
pide un recálculo, aprueba o descarta las sugerencias del motor (C11), ajusta los pesos
viendo el ranking nuevo antes de guardar y lee el informe de descartes.

**Arquitectura:** antes de la interfaz se corrige el contrato (#38): los campos que admiten
nulo salen hoy como arreglos y la web los arregla a mano. Después, un módulo de cliente
`api/motor.ts` con TanStack Query y cuatro pantallas en `apps/web/src/consola/motor/`,
cargadas con `lazy` como el resto de la consola. La API del motor ya está construida; este
ciclo no cambia ningún endpoint.

**Stack:** React 19, React Router, TanStack Query 5, Tailwind 4 con `packages/ui-tokens`,
Vitest con `responderSegun`; NestJS 11, nestjs-zod 5.5.0 y `@nestjs/swagger` en la tarea 1.

**Especificación:** [2026-10-06-bloque-4-motor-design.md](../superpowers/specs/2026-10-06-bloque-4-motor-design.md),
§1 (pasos 1 a 3), §6 «Motor (Administrador)» y §7, ciclo 1. Requerimientos: RF-MOT-002,
RF-MOT-003, RF-MOT-007 y RF-MOT-012 en [motor.md](../01-requerimientos/funcionales/motor.md).
**Diseños aprobados:** [maqueta del ciclo 1](../03-diseno/stitch/C10-ficha-zona/maqueta.html)
y las notas de [C10](../03-diseno/stitch/C10-ficha-zona/README.md) y
[C11](../03-diseno/stitch/C11-motor/README.md).

## Estado

| Tarea | Estado | Qué falta |
|---|---|---|
| 1 Contrato: los campos que admiten nulo (#38) | ⬜ | |
| 2 Cliente de la API del motor | ⬜ | |
| 3 Rutas, «Más» y el enlace desde C9 | ⬜ | |
| 4 C10 Ficha de zona | ⬜ | |
| 5 C11 Motor de sugerencias | ⬜ | |
| 6 Pesos con vista previa | ⬜ | |
| 7 Informe de descartes | ⬜ | |
| 8 Recorrido y cierre del ciclo | ⬜ | |

## Decisiones al planear

Tres cosas de la maqueta no tienen dato en la API. Se resuelven así, sin cambiar endpoints:

| # | Decisión | Por qué |
|---|---|---|
| I1-01 | La hoja de aprobar no dice de antemano a qué remisión se suma. Dice «Se suma a la remisión en borrador de este acopio a esta zona, o se crea una». Al aprobar, el aviso de éxito usa `remision.codigo` y `remision.creada` de `AprobacionDto` | La API no expone el borrador antes de aprobar |
| I1-02 | La hoja de aprobar no muestra «se pueden mandar hasta». Si la cantidad pasa del tope, la API responde 409 `SUGERENCIA_DESACTUALIZADA` con `detalles.maximo`, y la hoja lo muestra junto al campo con «Usar N» | `SugerenciaDto` no trae el movible; el tope se calcula al aprobar |
| I1-03 | «Última ronda» es la `ronda` más reciente de las sugerencias listadas, o la de `RecalculoDto` justo después de recalcular. Sin sugerencias se lee «Sin rondas todavía» | No hay un endpoint con la última ronda |
| I1-04 | C9 conserva su formulario de zona con población, fuente y fecha (Bloque 1). La hoja «Ajustar población» de C10 es un componente aparte, `HojaPoblacion`, que solo cambia esos tres campos con `PATCH /zonas/:id` | El formulario de C9 ya cumple RF-MOT-012; la hoja evita abrir el formulario completo desde la ficha |
| I1-05 | El informe de descartes pide los últimos 30 días (`desde` = hoy − 30 días) | El endpoint acepta `desde` y `hasta`; la maqueta dice «últimos 30 días» |

## Restricciones globales

- La maqueta aprobada manda en la estética, con sus diferencias. Sin colores hexadecimales en
  `apps/web` (los tokens salen de `packages/ui-tokens`; `scripts/revisar-colores.sh` lo
  revisa). Las barras de cobertura y de los componentes del puntaje van en
  `bg-primary-container` sobre `bg-surface-container`; nada de verde, ámbar o rojo de
  semáforo para la cobertura (ADR-0006). El rojo de error solo en «Descartar» dentro de su
  hoja y en los mensajes de error.
- Textos en español, sin flechas al final de los botones ni rótulos en mayúsculas salvo las
  etiquetas pequeñas de la maqueta («Traslado sugerido», «Cobertura de la zona»), que usan
  `text-label-caps`.
- Cantidades con `formatearCantidad(valor, unidad)` de `@acopio/shared` y porcentajes con
  `Math.round(cobertura * 100)` seguido de « %». Puntajes con dos decimales y coma
  (`puntaje.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })`).
- Los tipos del cliente salen de `src/api/esquema.d.ts`; no se escriben a mano. Si cambia el
  contrato: `bun run --filter @acopio/api openapi`, luego `bun run --filter @acopio/web api:tipos`,
  y se versionan los dos.
- Pruebas con `envolver(ui, ruta, cliente)` y `responderSegun` de `src/pruebas/`. Cada pantalla
  nueva tiene su prueba de axe sin violaciones graves, como las de C8.
- Ícono nuevo de Material Symbols → `node scripts/iconos.mjs` en `apps/web`.
- Ninguna pantalla de este ciclo funciona sin red: `NecesitaRed` con su texto.
- Roles: C10, `ADMIN` y `RECEPTOR` (el Receptor solo lee y solo sus zonas: la API responde
  403 con otras); C11, pesos y descartes, solo `ADMIN`.
- Cada tarea va en su rama y su PR hacia `main`, encadenadas como en la etapa 2 (cada rama
  sale de la anterior). Commits en español con el área al inicio (`web: …`, `API: …`), con las
  verificaciones encadenadas con `&&` y `set -o pipefail`: `bun run lint`,
  `bun run typecheck`, `bun run test` y `scripts/revisar-colores.sh`; la tarea 1 suma
  `bun run --filter @acopio/api depcruise` y `bun run test:int` con
  `PRUEBAS_PG_URL=postgresql://acopio_owner:acopio@127.0.0.1:5439`.

## Foco de revisión

1. Una categoría sin necesidad (`cobertura: null`, por ejemplo sin canasta ni corrección) no
   rompe la ficha: va al final con «Sin necesidad calculada» en lugar de porcentaje y barra
   (tarea 4).
2. La emergencia de la zona está `CERRADA`: la ficha se ve, pero sin «Ajustar población» ni
   «Corregir la necesidad», y un 409 `ZONA_SOLO_LECTURA` al aprobar se explica en la hoja
   (tareas 4 y 5).
3. Dos Administradores deciden la misma sugerencia: el segundo recibe 409
   `SUGERENCIA_DECIDIDA`; la hoja lo dice, se cierra y la lista se vuelve a cargar (tarea 5).
4. Los pesos no suman 1 (por ejemplo 0,40 + 0,20 + 0,15 + 0,30 = 1,05): «Guardar» queda
   desactivado con «Suman 1,05; tienen que sumar 1» y la vista previa no se pide (tarea 6).
5. Un recálculo sin nada que sugerir (`generadas: 0`) muestra un estado vacío que lo explica
   («El motor no encontró traslados que hacer»), no una lista en blanco (tarea 5).

---

### Task 1: Contrato, los campos que admiten nulo (#38)

**Archivos:**
- Crear: `apps/api/src/comun/dto.ts`, `apps/api/src/comun/dto.test.ts`
- Modificar: los 25 archivos de `apps/api/src` que importan `createZodDto` de `nestjs-zod`
  (`grep -rl "createZodDto" apps/api/src`), `eslint.config.mjs` de la raíz,
  `docs/03-diseno/api/openapi.json`, `apps/web/src/api/esquema.d.ts`
- Modificar en la web, para quitar los arreglos a mano: `apps/web/src/api/red.ts`
  (`ConNulos`, `sinArreglos`, `acopio`), `apps/web/src/api/comprobantes.ts` (`motivoDe`,
  `notaDe`), `apps/web/src/sesion/cliente-auth.ts` (los `as unknown as`),
  `apps/web/src/donador/PasoEntrega.tsx` (`km()`) y lo que el typecheck señale después

**Causa** (verificada al planear): nestjs-zod genera el JSON Schema de cada DTO con zod y
le pasa a `@nestjs/swagger` cada propiedad de primer nivel por separado. Un
`z.string().nullable()` llega como `{ type: ['string', 'null'] }`, y Swagger lee un `type`
con forma de arreglo como «arreglo de string». Los objetos que admiten nulo
(`{ anyOf: [{…}, { type: 'null' }] }`) pierden el nulo por el mismo camino. Los nulos
anidados no pasan por Swagger y salen bien. `cleanupOpenApiDoc(doc, { version })` no lo
corrige con ninguna versión, y 5.5.0 es la última de nestjs-zod.

**Interfaces que produce:**
- `crearDto<T extends ZodType>(esquema: T)` en `comun/dto.ts`: la misma clase que
  `createZodDto(esquema)`, con `_OPENAPI_METADATA_FACTORY` corregido. Todo DTO de la API se
  declara con `class X extends crearDto(z.object({…})) {}`.

- [ ] **Paso 1: la prueba que falla.** En `comun/dto.test.ts`:

```ts
import { z } from 'zod';
import { crearDto } from './dto';

describe('crearDto', () => {
  const Dto = crearDto(
    z.object({
      texto: z.string().nullable(),
      numero: z.number().nullable(),
      estado: z.enum(['A', 'B']).nullable(),
      objeto: z.object({ a: z.string() }).nullable(),
      lista: z.array(z.string()),
      obligatorio: z.string(),
    }),
  );
  const meta = (Dto as unknown as { _OPENAPI_METADATA_FACTORY(): Record<string, any> })
    ._OPENAPI_METADATA_FACTORY();

  it('un texto que admite nulo sale como texto con nullable', () => {
    expect(meta.texto).toMatchObject({ type: 'string', nullable: true });
  });
  it('un número y un enum que admiten nulo también', () => {
    expect(meta.numero).toMatchObject({ type: 'number', nullable: true });
    expect(meta.estado).toMatchObject({ type: 'string', nullable: true, enum: ['A', 'B'] });
  });
  it('un objeto que admite nulo conserva sus propiedades y suma nullable', () => {
    expect(meta.objeto).toMatchObject({ type: 'object', nullable: true });
    expect(meta.objeto.properties.a).toMatchObject({ type: 'string' });
  });
  it('un arreglo de verdad sigue siendo arreglo y lo demás no cambia', () => {
    expect(meta.lista).toMatchObject({ type: 'array', items: { type: 'string' } });
    expect(meta.obligatorio).toMatchObject({ type: 'string' });
    expect(meta.obligatorio.nullable).toBeUndefined();
  });
});
```

- [ ] **Paso 2: verla fallar.** `cd apps/api && bunx jest src/comun/dto.test.ts`. Falla
  porque `./dto` no existe.

- [ ] **Paso 3: implementar `comun/dto.ts`.**

```ts
import { createZodDto } from 'nestjs-zod';
import type { ZodType } from 'zod';

type Propiedad = Record<string, unknown>;

/** `{ type: ['string', 'null'] }` o `{ anyOf: [X, { type: 'null' }] }` → X con nullable (#38). */
function sinNuloEnTipo(p: Propiedad): Propiedad {
  if (Array.isArray(p.type) && p.type.includes('null')) {
    const tipos = p.type.filter((t) => t !== 'null');
    const enumSinNulo = Array.isArray(p.enum) ? p.enum.filter((v) => v !== null) : undefined;
    return {
      ...p,
      type: tipos.length === 1 ? tipos[0] : tipos,
      ...(enumSinNulo ? { enum: enumSinNulo } : {}),
      nullable: true,
    };
  }
  if (Array.isArray(p.anyOf)) {
    const opciones = (p.anyOf as Propiedad[]).filter((o) => o.type !== 'null');
    if (opciones.length === 1 && opciones.length < p.anyOf.length) {
      const { anyOf: _anyOf, ...resto } = p;
      return { ...resto, ...opciones[0], nullable: true };
    }
  }
  return p;
}

/**
 * `createZodDto` con los nulos de primer nivel bien escritos en el contrato. nestjs-zod
 * pasa a Swagger `type: ['string', 'null']`, que Swagger lee como arreglo. Todo DTO de la
 * API se declara con esto (la regla de ESLint lo exige).
 */
export function crearDto<T extends ZodType>(esquema: T) {
  const Base = createZodDto(esquema);
  const fabricaBase = (Base as unknown as { _OPENAPI_METADATA_FACTORY(): Record<string, Propiedad> })
    ._OPENAPI_METADATA_FACTORY.bind(Base);
  return class extends Base {
    static _OPENAPI_METADATA_FACTORY() {
      return Object.fromEntries(
        Object.entries(fabricaBase()).map(([k, p]) => [k, sinNuloEnTipo(p)]),
      );
    }
  };
}
```

  Si el paso 4 muestra que una propiedad llega con `type: ''` y la marca de tipo vacío de
  nestjs-zod en vez de `type` en arreglo, se ajusta `sinNuloEnTipo` para ese caso y se suma
  a la prueba. La prueba manda; el código de arriba es el punto de partida.

- [ ] **Paso 4: verla pasar.** `cd apps/api && bunx jest src/comun/dto.test.ts`.

- [ ] **Paso 5: cambiar todos los DTO.** En los 25 archivos, `createZodDto(` → `crearDto(` y
  el import de `nestjs-zod` → `import { crearDto } from '<ruta relativa>/comun/dto'`. Si el
  archivo importa algo más de `nestjs-zod`, ese import se queda. Después
  `grep -rn "createZodDto" apps/api/src` solo debe encontrar `comun/dto.ts`.

- [ ] **Paso 6: la barrera.** En `eslint.config.mjs`, para los archivos de `apps/api/src`, una regla
  `no-restricted-imports` que prohíbe importar `createZodDto` de `nestjs-zod`, con el
  mensaje «Usa crearDto de comun/dto: createZodDto escribe mal los nulos en el contrato
  (#38)», y una excepción para `src/comun/dto.ts`. Comprobar que la regla dispara: con un
  `createZodDto` agregado a propósito en un archivo, `bun run lint` falla; se quita.

- [ ] **Paso 7: regenerar el contrato y comprobarlo.** `bun run --filter @acopio/api openapi`
  y luego, con el código de salida como veredicto:

```bash
python3 - <<'EOF'
import json, sys
s = json.load(open('docs/03-diseno/api/openapi.json'))['components']['schemas']
casos = {
  ('YoDto', 'username'): 'string',
  ('SugerenciaDto', 'cantidadAprobada'): 'number',
  ('SugerenciaDto', 'motivoDescarte'): 'string',
  ('FichaZonaDto', 'coberturaGlobal'): 'number',
  ('FichaZonaDto', 'categoriaMasBaja'): 'object',
}
mal = [(d, p, s[d]['properties'][p]) for (d, p), t in casos.items()
       if s[d]['properties'][p].get('type') != t or not s[d]['properties'][p].get('nullable')]
print(mal or 'ok'); sys.exit(1 if mal else 0)
EOF
```

  Antes del cambio el script imprime los cinco casos y sale con 1; después imprime `ok`.

- [ ] **Paso 8: tipos de la web y arreglos a mano.** `bun run --filter @acopio/web api:tipos`.
  En `esquema.d.ts`, `username` de `YoDto` queda `string | null`. Quitar de la web lo que
  compensaba el error: `ConNulos`, `sinArreglos` y `acopio` en `api/red.ts` (los tipos pasan
  a ser `S['…Dto']` directo y las consultas devuelven lo que llega); `motivoDe` y `notaDe` en
  `api/comprobantes.ts` (sus usos leen `c.motivoRechazo` y `c.notaRechazo`); los
  `as unknown as` de `cliente-auth.ts` que existían por `username`; `km()` en
  `PasoEntrega.tsx`. `bun run typecheck` dice qué más cambió. Las pruebas de la web que
  simulaban respuestas con arreglos pasan a simular `null`.

- [ ] **Paso 9: verificar y cerrar.** `bun run lint && bun run typecheck &&
  bun run --filter @acopio/api depcruise && bun run test && bun run test:int &&
  scripts/revisar-colores.sh`. En `docs/01-requerimientos/pendientes.md`, P-031 pasa a
  RESUELTO con la causa y el arreglo; se actualiza la fecha de la nota.

- [ ] **Paso 10: commit** `Contrato: los campos que admiten nulo dejan de salir como arreglos (#38)`.

### Task 2: Cliente de la API del motor

**Archivos:**
- Crear: `apps/web/src/api/motor.ts`, `apps/web/src/api/motor.test.tsx`

**Interfaces que consume:** los tipos del esquema tras la tarea 1, sin arreglos a mano.

**Interfaces que produce:**
- Tipos: `FichaZona = S['FichaZonaDto']`, `CategoriaFicha = FichaZona['categorias'][number]`,
  `Sugerencia = S['SugerenciaDto']`, `EstadoSugerencia = Sugerencia['estado']`,
  `Desglose = Sugerencia['desglose']`, `Configuracion = S['ConfiguracionMotorDto']`,
  `Pesos = Configuracion['pesos']`, `VistaPrevia = S['VistaPreviaMotorDto']`,
  `InformeDescartes = S['InformeDescartesDto']`, `Aprobacion = S['AprobacionDto']`.
- `useFichaZona(zonaId: string)` → `GET /api/zonas/{id}/necesidad`, clave `['ficha-zona', zonaId]`.
- `useCorregirNecesidad(zonaId: string)` → `PUT /api/zonas/{id}/necesidad-manual/{categoriaId}`
  con `{ categoriaId, cantidad: number | null, motivo }`; invalida `['ficha-zona', zonaId]`
  y `['sugerencias']`.
- `useAjustarPoblacion(zonaId: string)` → `PATCH /api/zonas/{id}` con
  `{ poblacionEstimada, poblacionFuente, poblacionFecha }`; invalida `['ficha-zona', zonaId]`
  y `['zonas']`.
- `useSugerencias(filtro: { estado?: EstadoSugerencia; zona?: string; acopio?: string; categoria?: string })`
  → `GET /api/sugerencias` con esos parámetros, clave `['sugerencias', filtro]`.
- `useRecalcular()` → `POST /api/sugerencias/recalcular`, devuelve `S['RecalculoDto']`;
  invalida `['sugerencias']`.
- `useAprobar()` → `POST /api/sugerencias/{id}/aprobar` con `{ id, cantidad }`, devuelve
  `Aprobacion`; invalida `['sugerencias']` y `['ficha-zona']`.
- `useDescartar()` → `POST /api/sugerencias/{id}/descartar` con `{ id, motivo }`; invalida
  `['sugerencias']` y `['descartes']`.
- `useDescartes(desde: string)` → `GET /api/sugerencias/descartes?desde=…`, clave
  `['descartes', desde]`.
- `useConfiguracion()` → `GET /api/motor/configuracion`; `useGuardarConfiguracion()` → `PUT`,
  invalida `['configuracion-motor']` y `['sugerencias']`.
- `useVistaPrevia(datos: { pesos: Pesos; cantidadMinima: number } | null)` →
  `POST /api/motor/configuracion/vista-previa` como consulta (`useQuery` con clave
  `['vista-previa', datos]`, `enabled: datos !== null`), para que mover un deslizador no
  dispare una petición por cada paso: la pantalla pasa los pesos con un retardo (tarea 6).
- `sumaPesos(p: Pesos): number` redondeado a 3 decimales y `pesosValidos(p: Pesos): boolean`
  (`Math.abs(sumaPesos(p) - 1) <= 0.001`, la misma tolerancia que la API).
- `ultimaRonda(sugerencias: Sugerencia[]): string | null`: la `ronda` más reciente (I1-03).

- [ ] Pruebas primero con `responderSegun`: cada hook llama a su ruta con el cuerpo esperado
  (`cuerpoDe('PUT /api/zonas/z1/necesidad-manual/c1')` da `{ cantidad: 10000, motivo: '…' }`);
  `useSugerencias({ estado: 'PROPUESTA' })` pide `?estado=PROPUESTA`; `useVistaPrevia(null)`
  no hace ninguna petición; `sumaPesos({ criticidad: 0.4, urgencia: 0.2, proximidad: 0.15, magnitud: 0.3 })`
  da `1.05` y `pesosValidos` de eso da `false`; con magnitud `0.25` da `1` y `true`;
  `ultimaRonda` de dos sugerencias con rondas `2026-10-14T09:40:00Z` y `2026-10-14T08:00:00Z`
  da la primera, y de `[]` da `null`. Verlas fallar.
- [ ] Implementar siguiendo el estilo de `api/comprobantes.ts` (`desenvolver`, `ErrorApi`).
- [ ] Verificar y commit `web: cliente de la API del motor`.

### Task 3: Rutas, «Más» y el enlace desde C9

**Archivos:**
- Modificar: `apps/web/src/rutas.tsx`, `rutas.test.tsx`, `apps/web/src/portal/Mas.tsx`,
  `Mas.test.tsx`, `apps/web/src/consola/red/Zonas.tsx`, `Zonas.test.tsx`
- Crear: componentes con solo su `Encabezado`, para que las rutas carguen:
  `consola/motor/FichaZona.tsx`, `consola/motor/Motor.tsx`, `consola/motor/Pesos.tsx`,
  `consola/motor/Descartes.tsx`

**Qué hace:**
- Rutas con `lazy`, dentro de `MarcoPortal`:
  - `/consola/zonas/:id` → `FichaZona`, con `RequiereRol roles={['ADMIN', 'RECEPTOR']}`;
  - `/consola/motor`, `/consola/motor/pesos` y `/consola/motor/descartes` → `Motor`, `Pesos` y
    `Descartes`, con `['ADMIN']`.
- «Más»: herramienta «Motor de sugerencias» (`local_shipping`, «Traslados que propone el
  motor»), rol `ADMIN`, después de «Zonas afectadas».
- C9: cada fila de zona es un enlace a `/consola/zonas/:id`. Editar la zona pasa a un botón
  con ícono `edit` y `aria-label="Editar {nombre}"` dentro de la fila, que abre el
  `FormularioZona` de siempre. Con la emergencia cerrada, la fila sigue siendo enlace (la
  ficha se puede leer) y el botón de editar no aparece.

- [ ] Pruebas primero: cada ruta carga su pantalla con su rol y rechaza los otros (un
  `OPERADOR` en `/consola/motor` ve el rechazo de `RequiereRol`); «Más» muestra «Motor de
  sugerencias» a `ADMIN` y no a `OPERADOR` ni a `RECEPTOR`; en C9 la fila de «Barrio San
  Agustín» es un enlace a `/consola/zonas/<id>` y «Editar Barrio San Agustín» abre el
  formulario (se actualizan las pruebas que tocaban la fila para editar).
- [ ] `node scripts/iconos.mjs` si `local_shipping` o `edit` son nuevos.
- [ ] Verificar y commit `web: rutas del motor, «Más» y la ficha desde C9`.

### Task 4: C10 Ficha de zona

**Archivos:** `apps/web/src/consola/motor/FichaZona.tsx`, `consola/motor/HojaCategoria.tsx`,
`consola/motor/HojaPoblacion.tsx`, `consola/motor/BarraCobertura.tsx` y sus pruebas
(`FichaZona.test.tsx` cubre las tres hojas).

**Interfaces que consume:** `useFichaZona`, `useCorregirNecesidad`, `useAjustarPoblacion`,
`CategoriaFicha` (tarea 2).

**Interfaces que produce:** `BarraCobertura({ valor, etiqueta }: { valor: number; etiqueta: string })`,
una barra `role="meter"` con `aria-valuenow` de 0 a 100, que C11 reutiliza para los
componentes del puntaje.

**Qué hace** (vistas «C10 · Ficha de zona», «C10 · Cálculo y corrección» y «C9 · Ajustar
población» de la maqueta):
- Sin red: `NecesitaRed` con «La ficha de zona necesita conexión».
- `Encabezado` con el nombre de la zona y `volverA="/consola/zonas"` (o `/mas` para el
  Receptor).
- Tarjeta de la zona: el estado de la emergencia como `Pildora` («Activa», «En seguimiento»,
  «Cerrada»), el nombre de la emergencia, el municipio, «1.200 personas», la línea
  «{poblacionFuente} · estimado el {diaLargo(poblacionFecha)}», «Horizonte: {horizonteDias} días»
  y, para el Administrador con la emergencia abierta, el enlace «Ajustar población».
- Tarjeta «Cobertura de la zona»: `Math.round(coberturaGlobal * 100)` + « %», la barra y
  «Lo más bajo: {categoria} · N %». Con `coberturaGlobal: null`, «Sin necesidad calculada».
- «Por categoría», de menor a mayor cobertura y las de `cobertura: null` al final (foco 1).
  Cada fila es un botón: nombre, porcentaje, barra, «Necesita {n} · Recibido {r} · En camino
  {e} · Faltan {d}» con `formatearCantidad` en la primera cifra, y el origen: «Canasta
  {fuenteCanasta}» o «Manual · «{motivo}» · {puestaPor}, {diaLargo(puestaEn)}».
- `HojaCategoria`: la tabla del cálculo (canasta por persona al día, población, horizonte y
  necesidad) cuando `origen` es `CANASTA`, y debajo, para el Administrador con la emergencia
  abierta, «Corregir la necesidad»: cantidad en la unidad de la categoría y motivo, los dos
  obligatorios. Si `origen` es `MANUAL`, además «Volver a la canasta», que manda
  `cantidad: null` y también pide motivo. Errores de la API (`CANTIDAD_ENTERA`,
  `ZONA_SOLO_LECTURA`) junto al botón, con el `mensaje` que manda la API.
- `HojaPoblacion`: personas, fuente (con el valor actual) y fecha de la estimación (vacía).
  Aviso «Un número nuevo necesita una fecha nueva. La fuente puede ser la misma.». El 422
  `POBLACION_SIN_FUENTE_NUEVA` se muestra junto a la fecha.
- «Lo que reporta el Receptor»: cada reporte con su categoría, la nota entre comillas o
  «Sin nota», y `haceCuanto(reportadoEn)`. Sin reportes, la sección no aparece.
- Con la emergencia `CERRADA`: aviso «Esta emergencia está cerrada. La ficha queda en solo
  lectura.» y ninguna acción (foco 2). El Receptor nunca ve acciones.
- Pie: «Recibido cuenta los últimos 7 días. «En camino» son las remisiones despachadas que
  aún no llegan.»

**Datos de prueba** (los de la maqueta, con las fórmulas de `packages/shared/src/motor/calculo.ts`):
agua con `necesidad` = 1 × 1200 × 7 = 8400, `recibido` 0, `enCamino` 1550, `deficit` =
8400 − 0 − 1550 = 6850, `cobertura` 0; arroz con `necesidad` 4200, `recibido` 126,
`enCamino` 440, `deficit` = 4200 − 126 − 440 = 3634, `cobertura` = 126 / 4200 = 0,03; una
categoría «Linternas» con `cobertura: null`. `coberturaGlobal` 0,18.

- [ ] Pruebas primero: la ficha muestra «18 %», «1.200 personas», la fuente y la fecha; el
  orden es agua (0 %), arroz (3 %), linternas («Sin necesidad calculada»); la fila de agua
  dice «Necesita 8.400 L» y «Faltan 6.850»; tocar agua abre la hoja con «8.400 L» en la tabla;
  corregir manda `PUT` con `{ cantidad: 10000, motivo: 'Llegaron 300 familias desplazadas' }`;
  sin motivo el botón no envía y dice «Escribe el motivo»; en una categoría `MANUAL`, «Volver a
  la canasta» manda `cantidad: null`; «Ajustar población» manda `PATCH` con los tres campos y
  muestra el 422 `POBLACION_SIN_FUENTE_NUEVA` junto a la fecha; con la emergencia `CERRADA` no
  hay «Ajustar población» ni «Corregir la necesidad»; un `RECEPTOR` ve la ficha sin acciones;
  sin red, `NecesitaRed`; axe sin violaciones graves. Verlas fallar.
- [ ] Implementar con `Hoja`, `Campo`, `Boton`, `Pildora`, `Esqueleto` y `EstadoError` de
  `componentes/`.
- [ ] Verificar y commit `web: C10 ficha de zona`.

### Task 5: C11 Motor de sugerencias

**Archivos:** `apps/web/src/consola/motor/Motor.tsx`, `consola/motor/TarjetaSugerencia.tsx`,
`consola/motor/HojaAprobar.tsx`, `consola/motor/HojaDescartar.tsx` y sus pruebas
(`Motor.test.tsx`).

**Interfaces que consume:** `useSugerencias`, `useRecalcular`, `useAprobar`, `useDescartar`,
`ultimaRonda` (tarea 2), `BarraCobertura` (tarea 4).

**Qué hace** (vistas «C11 · Motor de sugerencias», «C11 · Aprobar» y «C11 · Descartar»):
- Sin red: `NecesitaRed` con «El motor necesita conexión».
- Tarjeta superior: «Recalcular» (primario), enlaces «Pesos» y «Descartes», y «Última ronda:
  {fechaHora(ronda)} · N sugerencias» (I1-03). Mientras recalcula, el botón dice
  «Recalculando…» y queda desactivado. Al terminar, aviso «Ronda nueva: N sugerencias».
- Filtros como chips: estado («Propuestas», «Aprobadas», «Descartadas»; por defecto
  «Propuestas» con su número) y selectores de zona, acopio y categoría. Las opciones de esos
  tres selectores salen de las sugerencias del estado elegido (valores distintos de
  `zona`, `acopio` y `categoria`), sin otras consultas. El filtro vive en la
  URL (`?estado=&zona=&acopio=&categoria=`), así «Volver» desde «Pesos» lo conserva.
- `TarjetaSugerencia`: «Traslado sugerido», la ruta «{acopio} → {zona}», «{categoria} ·
  {formatearCantidad(cantidad, unidad)}», el puntaje con dos decimales, la `justificacion` y
  las cuatro barras (criticidad, urgencia, proximidad, magnitud) con su valor. En
  `PROPUESTA`: «Descartar» (texto) y «Aprobar» (primario). En `APROBADA`: «Aprobada por
  {decididaPor} · {remisionCodigo} · {cantidadAprobada}». En `DESCARTADA`: «Descartada por
  {decididaPor} · «{motivoDescarte}»».
- `HojaAprobar`: la ruta, un control − / + con la cantidad sugerida (enteros si la unidad es
  `UNIDAD`, un decimal si no), «Sugeridos {cantidad}», el aviso de I1-01 y «Aprobar {n}». Al
  aprobar: se cierra y avisa «Sumado a {codigo}» o «Se creó la remisión {codigo}» según
  `remision.creada`. 409 `SUGERENCIA_DESACTUALIZADA` con `detalles.maximo`: «La situación
  cambió: hoy se pueden mandar hasta {maximo}» y «Usar {maximo}» (I1-02). 409
  `SUGERENCIA_DECIDIDA`: «Otra persona ya decidió esta sugerencia», se cierra y recarga
  (foco 3). 409 `ZONA_SOLO_LECTURA`: el mensaje de la API (foco 2).
- `HojaDescartar`: la ruta y la carga, tres atajos que llenan el motivo («La vía está
  cerrada», «El acopio ya comprometió ese insumo», «La zona ya recibió por otro lado»), el
  campo «Motivo» (mínimo 10 caracteres, contados sin espacios al borde) con la ayuda «Este par
  no se vuelve a sugerir en 24 horas», y «Descartar» en rojo. Con menos de 10 caracteres el
  botón no envía y dice «Escribe al menos 10 caracteres».
- Sin sugerencias en el filtro: `EstadoVacio` «El motor no encontró traslados que hacer» con
  «Recalcula cuando cambie el inventario o la necesidad de una zona» (foco 5).

**Datos de prueba** (de la demo): Suba → Vereda El Pepino, arroz, 560 kg, puntaje 0,6,
desglose 1 / 0,4 / 0 / 0,8; Kennedy → Barrio San Agustín, arroz, 440 kg, 0,48, desglose
0,97 / 0,4 / 0,04 / 0,63.

- [ ] Pruebas primero: la lista muestra las dos tarjetas en ese orden con «0,60» y «0,48» y la
  justificación completa; «Recalcular» manda `POST /api/sugerencias/recalcular` y avisa «Ronda
  nueva: 2 sugerencias»; con `generadas: 0` y lista vacía aparece «El motor no encontró
  traslados que hacer»; aprobar con 500 manda `{ cantidad: 500 }` y avisa «Se creó la remisión
  R-2026-K4P7Q» con `creada: true` y «Sumado a R-2026-K4P7Q» con `creada: false`; el 409
  `SUGERENCIA_DESACTUALIZADA` con `maximo: 300` muestra «Usar 300» y al tocarlo el control
  queda en 300; el 409 `SUGERENCIA_DECIDIDA` cierra la hoja y vuelve a pedir la lista;
  descartar con «corta» no envía; con el atajo «La vía está cerrada» manda
  `{ motivo: 'La vía está cerrada' }`; el filtro «Descartadas» pide `?estado=DESCARTADA` y la
  tarjeta muestra el motivo; sin red, `NecesitaRed`; axe sin violaciones graves. Verlas fallar.
- [ ] Implementar.
- [ ] Verificar y commit `web: C11 motor de sugerencias`.

### Task 6: Pesos con vista previa

**Archivos:** `apps/web/src/consola/motor/Pesos.tsx`, `Pesos.test.tsx`

**Interfaces que consume:** `useConfiguracion`, `useGuardarConfiguracion`, `useVistaPrevia`,
`sumaPesos`, `pesosValidos` (tarea 2).

**Qué hace** (vista «Pesos del motor»):
- Sin red: `NecesitaRed`. `Encabezado` «Pesos» con `volverA="/consola/motor"`.
- Cuatro deslizadores (`input type="range"`, de 0 a 1, paso 0,05, con `<label>` y su valor
  con dos decimales) con la descripción de la maqueta, la línea «Suma» y la cantidad mínima
  (`Campo` numérico, no negativo).
- La vista previa se pide 400 ms después del último cambio y solo si los pesos son válidos.
  Muestra la lista `propuesta` numerada con «{acopio} → {zona} · {categoria}» y el puntaje, y
  marca con «↑» las que suben de puesto frente a `actual` (se comparan por la terna acopio,
  zona y categoría). Leyenda «↑ subió de puesto frente a los pesos guardados».
- Pesos que no suman 1: «Suman 1,05; tienen que sumar 1», «Guardar pesos» desactivado y sin
  pedir vista previa (foco 4).
- «Guardar pesos» manda `PUT` y vuelve a C11 con el aviso «Pesos guardados. El próximo
  recálculo los usa». «Descartar cambios» vuelve a los valores guardados.

- [ ] Pruebas primero (con temporizadores falsos de Vitest para el retardo): los
  deslizadores arrancan en los valores de `GET /api/motor/configuracion`; subir magnitud de
  0,25 a 0,30 muestra «Suman 1,05; tienen que sumar 1», desactiva «Guardar pesos» y no pide
  vista previa; con pesos válidos, 400 ms después se pide
  `POST /api/motor/configuracion/vista-previa` una sola vez aunque se hayan movido dos
  deslizadores seguidos; la fila que pasa del puesto 3 al 2 lleva «↑»; guardar manda `PUT` con
  `{ pesos, cantidadMinima }`; axe sin violaciones graves. Verlas fallar.
- [ ] Implementar.
- [ ] Verificar y commit `web: pesos del motor con vista previa`.

### Task 7: Informe de descartes

**Archivos:** `apps/web/src/consola/motor/Descartes.tsx`, `Descartes.test.tsx`

**Interfaces que consume:** `useDescartes`, `TarjetaSugerencia` en modo decidida (tarea 5)
para los recientes.

**Qué hace** (vista «Informe de descartes»):
- Sin red: `NecesitaRed`. `Encabezado` «Descartes» con `volverA="/consola/motor"`.
- Tarjeta «Descartes de los últimos 30 días» con el `total` (I1-05).
- Tres tablas de dos columnas: por motivo, por categoría y por acopio, en el orden que manda
  la API, con `tabular-nums`.
- «Recientes»: los primeros 10 de `recientes` con `TarjetaSugerencia` en modo descartada;
  «Ver más» muestra el resto de los que trajo la API (hasta 50).
- Con `total: 0`: `EstadoVacio` «Nadie descartó sugerencias en los últimos 30 días».

- [ ] Pruebas primero: pide `GET /api/sugerencias/descartes?desde=` con la fecha de hace 30
  días (con la fecha del sistema fijada en `2026-10-14T12:00:00Z`, `desde` es
  `2026-09-14T12:00:00.000Z`); muestra «14», «La vía está cerrada» con 6 y «Acopio Kennedy» con
  9; con `total: 0`, el estado vacío; axe sin violaciones graves. Verlas fallar.
- [ ] Implementar.
- [ ] Verificar y commit `web: informe de descartes del motor`.

### Task 8: Recorrido y cierre del ciclo

**Archivos:**
- Crear: `apps/web/recorridos/consola-motor.mjs`
- Modificar: `docs/06-operacion/recorridos.md`, este plan (tabla de estado),
  `docs/03-diseno/stitch/C10-ficha-zona/README.md` y `C11-motor/README.md` (fila
  «Construida» y capturas `construida*.png`), `docs/03-diseno/stitch/README.md`,
  `docs/superpowers/specs/2026-10-06-bloque-4-motor-design.md` (§13, lo que cambió al
  construir el ciclo)

**Qué hace:** un recorrido en Chromium contra la API del Compose con el `seed:demo`, como
`consola-comprobantes.mjs`, que sigue los pasos 1 a 3 del §1 de la especificación:
1. Entra como Administrador (`joseph@acopio.co`, `demo-acopio-2026`), abre C9 y la ficha de
   «Barrio San Agustín (prueba)»; comprueba que se ven la cobertura, la población con su
   fuente y «En camino».
2. Abre C11, recalcula y comprueba que hay al menos dos sugerencias con justificación y sus
   cuatro barras.
3. Mueve un peso en «Pesos», comprueba que la vista previa cambia sin guardar y descarta los
   cambios.
4. Aprueba una sugerencia con la cantidad editada y comprueba en la respuesta de la API
   (`GET /api/remisiones?estado=BORRADOR`) que la remisión existe con esa línea; descarta otra
   con motivo y comprueba que el siguiente recálculo no la propone.
5. Capturas a 360 × 640 de C10, C11, la hoja de aprobar y los pesos, guardadas como
   `construida*.png` en las carpetas de diseño.

- [ ] Escribir el recorrido y correrlo contra el Compose (`bun run servicios:todo`,
  `seed:demo`). El veredicto es el código de salida del script.
- [ ] Actualizar la documentación de la lista de archivos.
- [ ] Verificación completa (`lint`, `typecheck`, `depcruise`, `test`, `test:int`,
  `revisar-colores.sh`) y commit `web: recorrido del motor y cierre del ciclo 1`.
- [ ] Comentar en #35 lo construido y lo que sigue (ciclo 2, C12 Remisiones).
