---
title: "Bloque 3 · interfaz, ciclo 1: el Donador · plan"
type: plan
tags: [plan, bloque-3, web, donador]
estado: aprobado
bloque: 3
actualizado: 2026-10-06
---

# Bloque 3 · interfaz, ciclo 1: el Donador · plan de implementación

> **Para agentes:** se ejecuta con superpowers:subagent-driven-development, una tarea por
> subagente y una revisión por tarea. Los pasos usan casillas (`- [ ]`).

**Objetivo:** el portal del Donador en la web. Alguien crea su cuenta, confirma el correo
eligiendo la contraseña, prepara una donación con el buscador o el escáner, elige dónde
entregarla, adjunta la factura si quiere y se lleva un folio con QR. Cualquiera sigue un folio
sin cuenta, y la página de privacidad explica qué se guarda.

**Arquitectura:** pantallas nuevas en `apps/web/src/donador/` (P13, confirmar, P9) y en
`apps/web/src/portal/` (P10, P12), cada una cargada al abrirla como el resto de rutas. Un
módulo de cliente, `api/donaciones.ts`, envuelve los endpoints del Donador con TanStack Query.
`ClienteAuth` suma el registro, la confirmación y el ingreso con correo; la sesión del Donador
usa la misma cookie y el mismo `SesionProveedor` que la consola.

**Stack:** React 19, React Router, TanStack Query 5, Tailwind 4 con `packages/ui-tokens`,
Vitest con `responderSegun`, `@zxing/browser` (ya está) y `qrcode` (nueva).

**Especificación:** [2026-10-05-bloque-3-custodia-design.md](../superpowers/specs/2026-10-05-bloque-3-custodia-design.md), §6.
**Diseños aprobados:** [maqueta del ciclo 1](../03-diseno/stitch/P13-mi-cuenta/maqueta.html)
y las notas de [P13](../03-diseno/stitch/P13-mi-cuenta/README.md),
[confirmar](../03-diseno/stitch/P13-confirmar/README.md),
[P9](../03-diseno/stitch/P09-preparar/README.md),
[P10](../03-diseno/stitch/P10-seguimiento/README.md) y
[P12](../03-diseno/stitch/P12-privacidad/README.md).

## Estado

| Tarea | Estado | Qué falta |
|---|---|---|
| 1 Cliente de la API y sesión del Donador | ✅ `c2ab83e` | |
| 2 Rutas, cabecera y «Más» para el Donador | ✅ `f491d5c` | |
| 3 P13 sin sesión: crear cuenta y entrar | ✅ `8457ba7..293f688` | |
| 4 Confirmar correo | ✅ `ab69f43` | |
| 5 P13 con sesión: mis donaciones | ✅ `376ebf6` | |
| 6 P9 paso 1: qué llevas | ✅ `8de99b5` | |
| 7 P9 pasos 2 y 3: dónde entregar y tu folio | ✅ `97e3252..6c7352e` | |
| 8 P10 seguimiento y P12 privacidad | ✅ `17df559` | |
| 9 Recorrido, precargas y cierre | ✅ cierre del ciclo | |

## Restricciones globales

- La maqueta aprobada manda en la estética, con sus diferencias. Sin colores hexadecimales en
  `apps/web` (los tokens salen de `packages/ui-tokens`; `scripts/revisar-colores.sh` lo revisa).
  Verde, ámbar y morado solo para el semáforo.
- Textos en español, sin flechas al final de los botones ni rótulos en mayúsculas.
- Ninguna pantalla llama a `/api/auth/*` directo: todo pasa por `ClienteAuth` y `useSesion`.
- Los tipos del cliente salen de `src/api/esquema.d.ts`; no se escriben a mano.
- Pruebas con `envolver(ui, ruta, cliente)` y `responderSegun` de `src/pruebas/`. Cada pantalla
  nueva tiene su prueba de axe sin violaciones graves, como las demás.
- Ícono nuevo de Material Symbols → `node scripts/iconos.mjs` en `apps/web`.
- Nada del Donador funciona sin red: si no hay red, el aviso de siempre.
- La sesión del Donador no muestra el selector de ubicación ni herramientas de la consola.
- Commits en español con el área al inicio (`web: …`), directo a `main`, con las verificaciones
  encadenadas con `&&`: `bun run lint`, `bun run typecheck`, `bun run --filter @acopio/web test`
  y `scripts/revisar-colores.sh`. La API no cambia en este plan; si una tarea necesita tocarla,
  para y lo reporta.

## Foco de revisión

1. Un Donador con sesión abre `/consola/...` o ve «Más»: no aparece ninguna herramienta de la
   consola y `RequiereRol` lo rechaza (tarea 2).
2. Se pierde la sesión del Donador (cookie vencida): lo manda a `/donador`, no a `/entrar` de la
   consola (tarea 2).
3. Escanear el mismo código dos veces suma a la misma línea; un código con contenido cuenta
   presentaciones y muestra la unidad base; un código desconocido abre la búsqueda por nombre
   sin guardar el código (tarea 6).
4. Con 5 donaciones preparadas, P9 lo dice antes de empezar y no deja avanzar (tarea 6), y un
   409 `LIMITE_PREPARADAS` al preparar se explica en vez de mostrar un error genérico (tarea 7).
5. Si la donación se crea pero la factura falla (413, 415 o sin red), el folio se muestra igual
   y la factura se puede intentar otra vez desde el folio (tarea 7).

---

### Tarea 1: cliente de la API y sesión del Donador

**Archivos:**
- Crear: `apps/web/src/api/donaciones.ts`, `apps/web/src/api/donaciones.test.tsx`
- Modificar: `apps/web/src/sesion/cliente-auth.ts`, `cliente-auth.test.ts`,
  `apps/web/src/sesion/Sesion.tsx`, `Sesion.test.tsx`, `apps/web/src/pruebas/utilidades.tsx`
  (el `clienteFalso` suma los métodos nuevos)

**Interfaces que produce:**
- `ClienteAuth` suma:
  - `registrarDonador(nombre: string, correo: string): Promise<void>` → `POST /api/auth/registro`
  - `validarEnlace(token: string): Promise<{ nombre: string; correo: string } | null>` →
    `GET /api/auth/registro/confirmar/{token}`; 404 da `null`
  - `confirmarCorreo(token: string, contrasena: string, nombre?: string): Promise<UsuarioSesion>`
    → `POST /api/auth/registro/confirmar` (abre la sesión)
  - `iniciarSesionDonador(correo: string, contrasena: string): Promise<UsuarioSesion>` →
    `POST /api/auth/donador/sesion`
- `useSesion()` suma `entrarDonador(correo, contrasena)` y `confirmar(token, contrasena, nombre?)`,
  que guardan el usuario igual que `entrar`.
- `api/donaciones.ts` exporta, con los tipos del esquema:
  - `useMisDonaciones(estado?: EstadoComprobante)` → `GET /api/donaciones`
  - `usePrepararDonacion()` → `POST /api/donaciones` (invalida `misDonaciones`)
  - `useCancelarDonacion()` → `POST /api/donaciones/{folio}/cancelar`
  - `useSugerencias(lineas, ubicacion?)` → `POST /api/donaciones/sugerencias`
  - `consultarCodigoDonador(ean)` → `GET /api/donaciones/codigos/{ean}`; 404 da `null`
  - `subirFactura(folio, archivo: File)` → `POST /api/donaciones/{folio}/factura` (multipart,
    campo `factura`)
  - `useUrlFactura(folio, activo)` → `GET /api/comprobantes/{folio}/factura`
  - `useSeguimiento(folio)` → `GET /api/seguimiento/{folio}`; 404 da `null` sin reintentos
  - `ESTADOS_DONACION: Record<EstadoComprobante, string>` con las etiquetas de la maqueta:
    Preparada, Recibida en el acopio, Conciliada, No se pudo conciliar, Cancelada.

- [ ] Pruebas primero, con `responderSegun`: cada método de `ClienteAuth` llama a su ruta con
  el cuerpo esperado; `validarEnlace` devuelve `null` con 404; `useSeguimiento` devuelve `null`
  con 404 y no reintenta; `subirFactura` manda `FormData` con el campo `factura`; `entrarDonador`
  deja al usuario en `useSesion`.
- [ ] Implementar siguiendo el estilo de `api/catalogo.ts` e `api/invitaciones.ts`.
- [ ] Commit `web: cliente de la API del Donador y su sesión`.

### Tarea 2: rutas, cabecera y «Más» para el Donador

**Archivos:**
- Modificar: `apps/web/src/rutas.tsx`, `rutas.test.tsx`, `apps/web/src/portal/Mas.tsx`,
  `Mas.test.tsx`, `apps/web/src/portal/cabecera/CabeceraConSesion.tsx`, `cabeceras.test.tsx`,
  `apps/web/src/sesion/Sesion.tsx`, `apps/web/src/portal/bloques/RastrearFolio.tsx`
- Crear: componentes vacíos de cada pantalla, con su título, para que las rutas carguen y las
  tareas siguientes los llenen: `donador/MiCuenta.tsx`, `donador/Confirmar.tsx`,
  `donador/Preparar.tsx`, `portal/Seguimiento.tsx`, `portal/Privacidad.tsx`

**Qué hace:**
- Rutas, todas dentro de `MarcoPortal` y cargadas con `lazy`: `/donador`,
  `/donador/confirmar/:token`, `/donar` (si no hay sesión de Donador, lleva a `/donador`),
  `/seguimiento`, `/seguimiento/:folio` y `/privacidad`.
- «Más», sección «Tu donación»: «Preparar donación» → `/donar`, «Rastrear donación por folio» →
  `/seguimiento`, «Mi cuenta de Donador» → `/donador`. Con un Donador en sesión no aparece
  ninguna herramienta de la consola.
- `CabeceraConSesion` con un Donador: el nombre y «Salir», sin selector de ubicación.
- `RastrearFolio` de la Portada: el formulario lleva a `/seguimiento/<folio>` (sin el aviso de
  «no disponible»), con el ejemplo de folio en el formato real `ACO-2026-7KQ4M`.
- Al perder la sesión (401 con usuario guardado), un Donador va a `/donador` y el resto, como
  hoy, a `/entrar` (foco de revisión 2).

- [ ] Pruebas: cada ruta nueva carga su pantalla; «Más» con un Donador muestra las tres filas
  con sus destinos y ninguna de la consola; `/consola/bitacora` con un Donador cae en el rechazo
  de `RequiereRol` (foco 1); la cabecera de un Donador no tiene selector; el formulario de la
  Portada navega al seguimiento; perder la sesión siendo Donador lleva a `/donador`.
- [ ] Commit `web: rutas del Donador, su cabecera y «Más»`.

### Tarea 3: P13 sin sesión, crear cuenta y entrar

**Archivos:** `apps/web/src/donador/MiCuenta.tsx` (la parte sin sesión, o un
`donador/AccesoDonador.tsx` que `MiCuenta` muestra sin sesión), con su prueba.

**Qué hace** (vistas «P13 · Crear cuenta» y «P13 · Entrar» de la maqueta):
- `Segmentado` con «Crear cuenta» y «Entrar». `?entrar` en la URL abre la segunda.
- Crear cuenta: nombre y correo (validación de formato en el navegador), el aviso «Te enviamos
  un enlace…», el enlace a `/privacidad` y «Crear cuenta». Al responder 202, pasa a «Entrar»
  con el aviso «Te enviamos un correo para confirmar tu cuenta. Revisa también la carpeta de
  spam». El aviso es el mismo exista o no el correo.
- Entrar: correo, `CampoContrasena` y «Entrar» con `entrarDonador`. Un 401 muestra «Correo o
  contraseña incorrectos» y la ayuda «Si acabas de crear la cuenta, primero abre el enlace del
  correo y elige tu contraseña». Un 429 muestra el mensaje de la API.
- Sin red, el botón queda inactivo con el aviso de siempre.

- [ ] Pruebas: crear cuenta manda nombre y correo y muestra el aviso; entrar con éxito deja la
  sesión; 401 muestra el error y la ayuda; axe sin violaciones graves.
- [ ] Commit `web: P13, crear cuenta y entrar como Donador`.

### Tarea 4: confirmar correo

**Archivos:** `apps/web/src/donador/Confirmar.tsx` y su prueba.

**Qué hace** (vistas «Confirmar correo» de la maqueta, con el patrón de `acceso/ActivarCuenta`):
- Al abrir, `validarEnlace(token)`. Mientras carga, `Esqueleto`. Con `null`, el aviso de error
  «Este enlace ya no sirve: venció o ya se usó. Crea la cuenta otra vez para recibir uno nuevo»
  y el botón a `/donador`.
- Con datos: el texto con el correo, el nombre editable, contraseña y repetición
  (`CampoContrasena`). Si no coinciden, error local. «Guardar y entrar» llama a `confirmar`;
  con éxito, va a `/donador`. Un 422 `CONTRASENA_DEBIL` muestra el mensaje de la API junto al
  campo; un 404 pasa al aviso de enlace vencido.

- [ ] Pruebas: enlace inválido; confirmación exitosa navega y deja la sesión; contraseñas
  distintas; 422 con mensaje; axe.
- [ ] Commit `web: confirmar el correo del Donador eligiendo la contraseña`.

### Tarea 5: P13 con sesión, mis donaciones

**Archivos:** `apps/web/src/donador/MiCuenta.tsx` (la parte con sesión, o
`donador/MisDonaciones.tsx`) y su prueba.

**Qué hace** (vista «P13 · Mis donaciones»):
- Título, botón «Preparar una donación» → `/donar`, aviso de los 7 días y chips de estado
  (Todas, Preparadas, Recibidas, Conciliadas, Canceladas; «Recibidas» filtra `PENDIENTE`).
- Una tarjeta por donación: folio en monoespaciada, `ESTADOS_DONACION`, nombre del acopio,
  antigüedad («hace 2 horas», con la función de formato que ya use la web) y el resumen de las
  líneas en unidad base (`cantidadConfirmada` si existe, si no la declarada, por
  `contenidoUnitario`, con `formato.ts` / `@acopio/shared`).
- Preparadas: «Ver folio» (abre `/donar?folio=<folio>`, que muestra el paso 3 de esa donación) y
  «Cancelar donación» en rojo, con confirmación en `Hoja`. Todas: «Seguir» → `/seguimiento/<folio>`.
- Vacío: `EstadoVacio` con «Todavía no preparas ninguna donación» y el botón.

- [ ] Pruebas: lista y filtro; cancelar pide confirmación y llama al endpoint; un 409 al
  cancelar muestra el mensaje de la API; vacío; axe.
- [ ] Commit `web: P13, mis donaciones`.

### Tarea 6: P9 paso 1, qué llevas

**Archivos:** `apps/web/src/donador/Preparar.tsx`, `donador/preparacion.ts` (el estado del
flujo en un reducer, sin React) y sus pruebas.

**Qué hace** (vista «P9 · 1 Qué llevas»):
- Un solo componente `/donar` con tres pasos en estado local; el reducer guarda las líneas,
  el acopio elegido y el archivo de factura. Si el usuario recarga, empieza de nuevo.
- Antes de empezar, `useMisDonaciones('PREPARADO')`: con 5 o más, el aviso «Ya tienes 5
  donaciones preparadas. Entrega o cancela una para preparar otra» y el enlace a `/donador`, sin
  dejar avanzar (foco 4).
- Buscador: `BuscadorCategoria` (busca en `/api/categorias/buscar`, que el Donador puede leer).
  Elegir una categoría agrega una línea en unidad base con cantidad 1.
- Escáner: `VistaCamara` de `consola/inventario/Escaner.tsx`. Al leer un código,
  `consultarCodigoDonador`. Conocido: agrega la línea con `ean` y `contenido` y cuenta
  presentaciones. Si ya hay una línea con ese `ean`, le suma 1 (foco 3). Desconocido: el aviso
  «No conocemos este código: búscalo por nombre» y el buscador. No se guarda el código.
- Cada línea: nombre, presentación y código si los hay, `−` / `+` (mínimo 1; con presentaciones
  solo enteros), la cantidad en unidad base debajo («= 7,2 L»), «Vence (opcional)» solo si la
  categoría es perecedera, y quitar.
- «Siguiente: dónde entregar» activo con al menos una línea.

- [ ] Pruebas del reducer: agregar, sumar por `ean`, quitar, cantidades con presentaciones
  enteras, unidad base. Pruebas de la pantalla: límite de 5, buscar y agregar, escaneo conocido
  y repetido (simulando `VistaCamara` como en `Escaner.test.tsx`), código desconocido, vence solo
  en perecederas; axe.
- [ ] Commit `web: P9, qué llevas`.

### Tarea 7: P9 pasos 2 y 3, dónde entregar y tu folio

**Archivos:** `apps/web/src/donador/Preparar.tsx` (pasos 2 y 3, o `PasoEntrega.tsx` y
`PasoFolio.tsx`), `apps/web/package.json` (dependencia `qrcode` y `@types/qrcode`) y pruebas.

**Qué hace** (vistas «P9 · 2» y «P9 · 3»):
- Paso 2: `useSugerencias` con las líneas y, si el navegador la da, la ubicación (pedirla con
  el mismo patrón de «Cerca de mí» del mapa; sin ubicación también funciona). Tarjetas con
  radio: nombre, municipio o dirección, «abierto, cierra…» o «cerrado ahora» según
  `abiertoAhora`, distancia si la hay, «Recibe N de M productos» y, si `noRecibe` trae algo, «No
  está recibiendo …» en neutro con ícono. La primera queda elegida. «Ver todos en el mapa» →
  `/mapa`.
- Foto de la factura (opcional): `input type=file accept="image/*"` con
  `capture="environment"`, miniatura local del archivo elegido, el aviso de los 12 meses y el
  enlace a `/privacidad`. El archivo no se sube aún.
- «Preparar y ver mi folio»: `usePrepararDonacion` con `acopioId` y las líneas (`categoriaId`,
  `cantidad`, `ean` si hay, `venceEn` si hay). Un 409 `LIMITE_PREPARADAS` muestra el mensaje de
  la API con el enlace a `/donador` (foco 4); otro error, el mensaje de la API.
- Creada la donación, si hay archivo: `subirFactura`. Si falla (413, 415, sin red), el paso 3
  se muestra igual con «No pudimos subir la factura: <mensaje>» y «Intentar otra vez» (foco 5).
- Paso 3: QR del folio en SVG con `qrcode` (`toString(folio, { type: 'svg' })`, insertado como
  imagen `data:` para no usar `dangerouslySetInnerHTML`), el folio grande, «Copiar folio»
  (portapapeles, con respaldo de selección), el aviso de los 7 días, la tarjeta del acopio con
  «Ver ficha y cómo llegar» → `/acopios/<id>`, el estado de la factura («Factura adjunta» o
  «Agregar foto de la factura», que la sube), «Ver mis donaciones» y «Seguir esta donación».
- `/donar?folio=<folio>` abre directamente el paso 3 de una donación preparada, leída de
  `useMisDonaciones`.

- [ ] Pruebas: sugerencias y elección; preparar manda el cuerpo esperado; 409 con mensaje;
  factura que falla deja el folio con «Intentar otra vez» (foco 5); el QR aparece; `?folio=`
  abre el paso 3; axe.
- [ ] Commit `web: P9, dónde entregar y tu folio con QR`.

### Tarea 8: P10 seguimiento y P12 privacidad

**Archivos:** `apps/web/src/portal/Seguimiento.tsx`, `portal/Privacidad.tsx`,
`apps/web/src/portal/contacto.ts` (la constante `CORREO_PRIVACIDAD: string | null = null`, con un
comentario que apunta a P-042) y sus pruebas.

**Qué hace:**
- P10 (`/seguimiento` y `/seguimiento/:folio`, vistas «P10» de la maqueta): campo de folio y
  «Buscar», que navega a la ruta con el folio (el servidor normaliza mayúsculas y espacios). Con
  resultado: folio, estado (de la API, en neutro), la línea de tiempo con fecha y hora en
  español de Colombia (paso pendiente atenuado), «Lo que entró al acopio» con categoría y
  cantidad en unidad base, y «No mostramos quién donó». Con `null`: «No encontramos ese folio.
  Revisa que esté bien escrito: se ve como ACO-2026-7KQ4M». Un 429 muestra el mensaje de la API.
- P12 (`/privacidad`, vista «P12»): las cinco secciones de la maqueta. «Tus derechos» muestra el
  correo si `CORREO_PRIVACIDAD` tiene valor; si no, el texto sin dirección.

- [ ] Pruebas: seguimiento con resultado, con un paso pendiente y no encontrado; el buscador
  navega; P12 con y sin correo; axe en las dos.
- [ ] Commit `web: P10 seguimiento por folio y P12 privacidad`.

### Tarea 9: recorrido, precargas y cierre

**Archivos:** `apps/web/vite.config.ts` (`PRECARGAS`), `apps/web/recorridos/donador.mjs`
(nuevo), documentación.

- [ ] `PRECARGAS`: `/seguimiento/` → `Seguimiento.tsx` y `/donador/confirmar/` → `Confirmar.tsx`,
  que se abren desde un enlace.
- [ ] `node scripts/iconos.mjs` en `apps/web` y `iconos.test.ts` en verde.
- [ ] Recorrido versionado `apps/web/recorridos/donador.mjs`, con el patrón de
  `sin-conexion.mjs` (build servido con `vite preview` en el puerto 5173, porque el
  `OrigenGuard` exige ese Origin, contra la API del Compose). A 360 × 640:
  - crear cuenta con un correo nuevo;
  - leer el enlace en Mailpit (`http://localhost:8025/api/v1/messages`), abrirlo y elegir la
    contraseña;
  - preparar una donación buscando una categoría;
  - elegir el primer acopio y adjuntar una foto;
  - ver el folio y abrir su seguimiento;
  - cancelar la donación desde «Mis donaciones».

  En cada pantalla corre axe y guarda `construida.png` en la carpeta de su diseño. El script
  falla con código distinto de 0 si un paso falla.
- [ ] Documentación (con humanizer:humanizer antes de redactar):
  - la tabla «Estado» de este plan;
  - «Cambios al construir» de la especificación con lo que haya cambiado;
  - la fila del Bloque 3 en `docs/05-planes/README.md`;
  - la fila «Construida» en las notas de diseño.
- [ ] Verificación completa (`lint`, `typecheck`, `depcruise`, `test`, `test:int` en 5439,
  `revisar-colores.sh`) y commit `Bloque 3: cierre del ciclo 1 de la interfaz (el Donador)`.
