---
title: "Bloque 0 · Cimientos — especificación"
type: spec
tags: [spec, bloque-0]
estado: vigente
bloque: 0
actualizado: 2026-09-28
---

# Bloque 0 · Cimientos — especificación

**Fecha:** 2026-09-28
**Estado:** aprobada el 2026-09-28 · backend construido el mismo día ([§11](#11-cambios-al-construir))
**Deriva de:** [especificación general](2026-08-20-acopio-design.md) §4, §6 y §13
**Plan:** [05-planes/2026-09-28-bloque-0-cimientos.md](../../05-planes/2026-09-28-bloque-0-cimientos.md)

---

## 1. Objetivo

Dejar listo todo lo que los demás bloques dan por hecho: un repositorio que cualquiera
del equipo levanta con un comando, una API con autenticación y autorización
funcionando, la bitácora escribiendo sola, el catálogo cargado y una interfaz base
sobre la que se construyen las pantallas.

**El bloque termina cuando** un administrador creado por el *seed* entra a la consola,
invita a un operador, el operador canjea la invitación y entra con su nombre de
usuario, y todo eso queda en la bitácora. Todo en un equipo recién clonado, con
`docker compose up`.

## 2. Alcance

### Dentro

| Área | Qué | Requerimientos |
|---|---|---|
| Repositorio | Monorepo, TypeScript, lint, formato, pruebas, CI | RNF-13 |
| Infraestructura | Docker Compose base y de desarrollo, `.env.example`, Mailpit | [despliegue.md](../../06-operacion/despliegue.md) |
| Base de datos | Esquema de identidad, catálogo, emergencias y bitácora; primera migración; permisos por tabla | RNF-06, RNF-10 |
| Identidad | Adaptador de autenticación local, guard, usuarios, invitaciones, suspensión, último administrador, restablecer acceso, contexto activo | RF-IDE-001 a 010, [P-025](../../01-requerimientos/pendientes.md) |
| Auditoría | Bitácora append-only escrita por un interceptor | RF-IDE-012, RNF-10 |
| Notificaciones | Envío por SMTP con reintentos | RTA-04 |
| Catálogo | Categorías, búsqueda, canasta versionada, emergencias | RF-CAT-001, 002, 003, 005 |
| Seed | 39 categorías, canasta de 10, primer administrador | [catalogo-inicial.md](../../01-requerimientos/catalogo-inicial.md) |
| Reglas compartidas | Unidades y formato de número y fecha en español de Colombia | RNF-12 |
| Interfaz | Tokens, componentes base, estructura de la SPA, C01, C02 (vacío), C16, C17, C18 | RNF-01, RNF-11, [sistema de diseño](../../03-diseno/sistema-diseno.md) |
| Pruebas | Unitarias, de integración contra PostgreSQL real y el esqueleto de concurrencia | RTA-02, [#27](https://github.com/Proyecto-IngSoftware/acopio/issues/27) |

### Fuera, y a qué bloque va

| Qué | Bloque | Por qué no ahora |
|---|---|---|
| RF-IDE-011 · Matriz de acceso | 1 | Cruza usuarios con acopios y zonas, que nacen en el Bloque 1 |
| Elegir acopios y zonas reales al asignar | 1 | Mismo motivo. En este bloque la asignación se prueba con identificadores de prueba |
| RF-IDE-013 · Auto-registro de Donador | 3 | Solo lo necesita la custodia (P9, P13) |
| RF-CAT-004 · Códigos de barras | 2 | Lo usa la entrada rápida |
| RF-CAT-006 · Pesos del motor | 4 | Lo usa el motor |
| Almacenamiento en MinIO | 3 | El contenedor ya levanta; el módulo llega con los comprobantes |
| Recuperar contraseña por correo, sin administrador | Al pasar a Supabase | Supabase lo trae resuelto. Mientras tanto, el administrador restablece el acceso (RF-IDE-009) |
| Lectura de RedAcopio (RTA-05) | 1 | Es del módulo `importacion` |

## 3. Decisiones de este bloque

Aprobadas el 2026-09-28. D-01 cambió respecto de la propuesta: npm workspaces pasó a
**Bun**.

| # | Decisión | Alternativa descartada y por qué |
|---|---|---|
| D-01 | **Bun con workspaces** como gestor de paquetes y de scripts del monorepo. **Node 22 LTS** como runtime de la API y de las pruebas. `bun.lock` versionado | npm workspaces: instala más lento. Bun también como runtime: NestJS, Prisma y Jest se prueban y documentan sobre Node, y RTA-01 ya carga con la curva de NestJS. pnpm o Turborepo: una herramienta más; con cuatro paquetes no hace falta caché de tareas |
| D-02 | **dependency-cruiser** en CI hace cumplir las [dependencias permitidas](../../02-arquitectura/vista-general.md#dependencias-permitidas) entre módulos | Revisarlo a mano en cada PR: se olvida, y el primer ciclo entre módulos se descubre tarde |
| D-03 | **GitHub Actions** corre lint, tipos, pruebas unitarias y de integración en cada PR, con PostgreSQL como servicio | Solo pruebas locales: nadie sabe si `main` está sano |
| D-04 | La autenticación va detrás de un **puerto `ProveedorIdentidad`** con adaptadores `local` y `supabase` ([P-025](../../01-requerimientos/pendientes.md)) | Programar directo contra Supabase: obliga a tener el proyecto configurado para empezar |
| D-05 | Las credenciales del adaptador local viven en una tabla aparte, **`identidad_local`**, no en `usuario` | Guardar el hash en `usuario`: mezcla lo que hace Supabase con lo nuestro y hay que limpiarlo al migrar |
| D-06 | El frontend habla con la autenticación a través de una interfaz **`ClienteAuth`**, con una implementación local y otra con `supabase-js` | Llamar `supabase.auth` directo en las pantallas: cambiar de proveedor obliga a tocar cada pantalla |
| D-07 | Búsqueda de categorías con las extensiones `unaccent` y `pg_trgm` de PostgreSQL | Buscar en el navegador: con 39 categorías funcionaría, pero RF-CAT-002 ordena por uso en cada acopio y eso vive en la base |

## 4. Estructura del repositorio

```
acopio/
├─ apps/
│  ├─ api/              NestJS
│  │  └─ src/modulos/   identidad · auditoria · notificaciones · catalogo
│  └─ web/              React + Vite + Tailwind + shadcn/ui
├─ packages/
│  ├─ shared/           reglas puras (unidades, formato)
│  └─ ui-tokens/        tokens de color, tipografía y espaciado
├─ prisma/
│  ├─ schema.prisma
│  ├─ migrations/
│  └─ seed/             catalogo.ts · canasta.ts · admin.ts
├─ infra/
│  ├─ docker-compose.yml
│  ├─ docker-compose.dev.yml
│  └─ nginx/
├─ .github/workflows/ci.yml
├─ .env.example
├─ .nvmrc               22
├─ bun.lock
└─ package.json         workspaces: apps/*, packages/*
```

Los módulos `acopios`, `inventario`, `comprobantes`, `motor`, `turnos`,
`almacenamiento` e `importacion` no se crean vacíos «para después»: nacen en su bloque.

## 5. Datos

Tablas de este bloque, tal como están en el [modelo de datos](../../02-arquitectura/modelo-datos.md),
más dos nuevas.

| Tabla | Origen | Notas |
|---|---|---|
| `usuario` | Modelo de datos | `supabase_uid` guarda el `sub` del proveedor activo, sea local o Supabase |
| `usuario_asignacion` | Modelo de datos | Sin llave foránea a `acopio` ni a `zona`, como ya está diseñado. El servicio que valida que la ubicación exista llega en el Bloque 1 |
| `invitacion` | Modelo de datos | |
| `bitacora` | Modelo de datos | Rol de base de datos de la API sin `UPDATE` ni `DELETE` sobre ella |
| `categoria` · `canasta_estandar` | Modelo de datos | |
| `emergencia` | Modelo de datos | |
| **`identidad_local`** | **Nueva (D-05)** | `id uuid` (es el `sub`) · `correo citext UNIQUE` · `password_hash` bcrypt · `correo_confirmado_en?` · `creado_en`. Solo la usa el adaptador local; se exporta y se borra al pasar a Supabase |
| **`correo_saliente`** | **Nueva** | Cola de correos: `destinatario`, `asunto`, `cuerpo`, `estado` (PENDIENTE, ENVIADO, FALLIDO), `intentos`, `ultimo_error`, `enviar_despues_de`. Hace posible la tarea «reintentar correos fallidos» de la [vista general](../../02-arquitectura/vista-general.md#tareas-programadas) |

Las dos tablas nuevas ya están en el [modelo de datos](../../02-arquitectura/modelo-datos.md#identidad),
junto con sus invariantes.

## 6. Identidad

### Puerto de autenticación

```ts
interface ProveedorIdentidad {
  crearUsuario(correo: string, contrasena: string): Promise<{ uid: string }>
  cambiarContrasena(uid: string, contrasena: string): Promise<void>
  iniciarSesion(correo: string, contrasena: string): Promise<{ accessToken: string }>
  urlJwks(): string
}
```

| | Adaptador `local` | Adaptador `supabase` |
|---|---|---|
| `crearUsuario` | Inserta en `identidad_local` con bcrypt | Admin API con `email_confirm: true` |
| `iniciarSesion` | Endpoint propio `POST /api/auth/sesion` | `supabase.auth.signInWithPassword` desde el navegador |
| Firma del token | RS256 con un par de llaves generado al arrancar si no existe, guardado en un volumen | Supabase |
| JWKS | `GET /api/auth/.well-known/jwks.json` | El del proyecto |
| Claims | `sub`, `email`, `exp`, `iat`, `iss` | Los de Supabase, que incluyen esos cinco |

El adaptador `supabase` se escribe completo en este bloque, pero solo se prueba contra
un proyecto real cuando exista. Las pruebas automáticas usan el local.

**Salvaguardas:**
- La API no arranca con `AUTH_PROVEEDOR=local` si `NODE_ENV=production`
- La vigencia del token local es de 8 horas y no hay renovación. Las sesiones largas
  con renovación (RTA-03) llegan con Supabase
- La contraseña no se registra en ningún log ni en la bitácora

### Guard

Sigue el [§6 de la especificación general](2026-08-20-acopio-design.md#guard-de-autorización)
sin cambios:
1. Valida la firma contra `SUPABASE_JWKS_URL`, con las llaves en caché
2. Busca el `sub` en `usuario.supabase_uid`
3. Sin fila, o con estado distinto de `ACTIVO`: 403
4. Si la operación trae `ubicacion_id`, lo verifica contra `usuario_asignacion` en la base

El guard no importa nada del adaptador. Solo conoce la URL del JWKS.

### Recorridos que cubre el bloque

| Recorrido | Requerimientos | Pantalla |
|---|---|---|
| El *seed* crea el primer administrador | — | — |
| Iniciar sesión con nombre de usuario | RF-IDE-004 | C01 |
| Crear usuario e invitarlo | RF-IDE-001, 002 | C16 |
| Canjear la invitación y definir la contraseña | RF-IDE-003 | C01 |
| Asignar y quitar ubicaciones | RF-IDE-006 | C16 |
| Suspender y reactivar; proteger al último administrador | RF-IDE-007, 008 | C16 |
| Restablecer acceso con motivo | RF-IDE-009 | C16 |
| Elegir la ubicación activa | RF-IDE-010 | Barra superior |
| Consultar la bitácora | RF-IDE-012 | C17 |

## 7. Catálogo

- **Categorías (RF-CAT-001):** crear, editar y archivar. No se borra una categoría que
  ya se usó. Los grupos son los diez de RF-CAT-001.
- **Búsqueda (RF-CAT-002):** `GET /api/categorias?q=` sin distinguir mayúsculas ni
  tildes, tolerante a errores de tipeo (`pg_trgm`), sobre nombre y sinónimos. Menos de
  100 ms con el catálogo completo. El orden por uso en la ubicación queda preparado,
  pero se alimenta desde el Bloque 2, cuando existan movimientos.
- **Canasta (RF-CAT-003):** versionada por `vigente_desde`; `fuente` obligatoria.
  Cambiarla crea una fila nueva y no toca las anteriores.
- **Emergencias (RF-CAT-005):** API completa y la tarea diaria que pasa de `ACTIVA` a
  `EN_SEGUIMIENTO` al vencer `destacada_hasta`. La pantalla es parte de C18.

## 8. Interfaz

- **`packages/ui-tokens`** exporta los tokens del [sistema de diseño](../../03-diseno/sistema-diseno.md)
  a Tailwind y a variables CSS. Ningún componente escribe un color hexadecimal; CI lo
  revisa.
- **Componentes base:** botón, campo numérico, campo de texto, tarjeta de categoría,
  distintivo de antigüedad, estados vacío, de carga y de error, hoja inferior y
  conmutador de contexto.
- **Estructura de la SPA:** rutas públicas y rutas de consola, protegidas por rol. El
  portal público queda como página vacía hasta el Bloque 1.
- **Pantallas:** C01 Acceso, C02 Tablero (vacío por rol), C16 Usuarios y accesos, C17
  Bitácora, C18 Catálogo maestro.
- **Cada pantalla se revisa contra su lienzo** de Claude Design ([ADR-0009](../../02-arquitectura/adr/ADR-0009-mockups-claude-design.md))
  en 360 × 640 px antes de darla por terminada.

## 9. Criterios de salida del bloque

- [ ] Un equipo recién clonado levanta todo con `cp .env.example .env` y
      `docker compose -f infra/docker-compose.yml -f infra/docker-compose.dev.yml up`,
      probado en los equipos de los cuatro integrantes
- [ ] El recorrido del §1 funciona de punta a punta, y el correo de invitación llega a
      Mailpit
- [ ] Un correo enviado desde la API por el SMTP del dominio llega a un buzón real sin
      caer en spam (RTA-04)
- [ ] CI en verde en `main`: lint, tipos, dependency-cruiser, pruebas unitarias y de
      integración
- [ ] Prueba de concurrencia: la misma invitación canjeada dos veces a la vez produce
      un solo usuario activo
- [ ] La base rechaza `UPDATE` y `DELETE` sobre `bitacora` con el rol de la API
- [ ] La búsqueda encuentra «Pañal adulto» con «panal» y «Arroz» con «aroz» en menos
      de 100 ms
- [ ] El *seed* es idempotente: correrlo dos veces deja 39 categorías y 10 filas de
      canasta
- [ ] axe-core sin violaciones críticas en C01, C16 y C18

## 10. Riesgos del bloque

| Riesgo | Qué se hace |
|---|---|
| NestJS es nuevo para el equipo (RTA-01) | El spike [#19](https://github.com/Proyecto-IngSoftware/acopio/issues/19) va primero y deja el patrón controlador → servicio → Prisma que copian los demás módulos |
| El adaptador local crece hasta ser un segundo sistema de autenticación | Solo las cuatro operaciones del puerto. Nada de recuperación por correo ni verificación en dos pasos |
| El correo del dominio cae en spam | Configurar SPF, DKIM y DMARC del dominio antes de la prueba de salida |
| El Compose no levanta en un equipo con Windows | Se prueba en los cuatro equipos en la primera semana, no al final ([#27](https://github.com/Proyecto-IngSoftware/acopio/issues/27)) |

## 11. Cambios al construir

**2026-09-28.** El backend del bloque quedó construido y probado: 21 pruebas unitarias
y 55 de integración contra PostgreSQL real, incluida la concurrencia. Lo que cambió
respecto de esta especificación:

| Sección | Cambio | Detalle |
|---|---|---|
| §3 D-01 | TypeScript 6.0, NestJS 11, Prisma 7.10 | TypeScript 7 no lo soporta typescript-eslint; NestJS 12 es solo ESM; la última de Prisma es una versión candidata |
| §3 D-01 | Imagen de la API en Debian trixie | `oven/bun:1.3` es trixie; el motor de migraciones de Prisma que se baja al construir tiene que servir al ejecutar |
| §4 | `comun/autorizacion` guarda los decoradores y el tipo del usuario autenticado | `identidad` usa la bitácora de `auditoria` y `auditoria` usaba los decoradores de `identidad`: era un ciclo |
| §5 | Columnas nuevas: `usuario.tokens_validos_desde`, `invitacion.revocada_en`, `bitacora.ubicacion_id`; `correo_saliente` con texto y HTML | Ver [modelo de datos](../../02-arquitectura/modelo-datos.md#identidad) |
| §6 | El guard lee las llaves del adaptador local en proceso | Son las que publica `/api/auth/.well-known/jwks.json`; con Supabase, el JWKS remoto |
| §6 | Sin endpoint público que resuelva usuario a correo | La API resuelve el usuario y llama al proveedor ([P-028](../../01-requerimientos/pendientes.md)) |
| §6 | Bloqueo ordenado de administradores al suspender o cambiar un rol | La prueba de concurrencia encontró un interbloqueo |
| §8 | **La interfaz se hace con Google Stitch** | [ADR-0011](../../02-arquitectura/adr/ADR-0011-interfaz-con-stitch.md). El §8 sigue como requisito; el flujo de trabajo se fija en el bloque de interfaz |
| — | Contrato OpenAPI para el frontend | [docs/03-diseno/api/](../../03-diseno/api/README.md) |

### Criterios de salida, a la fecha

- [x] El recorrido del §1 funciona de punta a punta en Docker Compose, con el correo de
      invitación en Mailpit
- [ ] Probado en los equipos de los cuatro integrantes ([#27](https://github.com/Proyecto-IngSoftware/acopio/issues/27))
- [ ] Correo real por el SMTP del dominio sin caer en spam (RTA-04): falta el dominio
- [x] CI escrita: lint, tipos, dependency-cruiser, pruebas unitarias y de integración.
      Falta verla en verde en GitHub
- [x] La misma invitación canjeada diez veces a la vez produce un solo usuario activo
- [x] La base rechaza `UPDATE` y `DELETE` sobre `bitacora` con el rol de la API
- [x] «panal» encuentra «Pañales de adulto» y «aroz» encuentra «Arroz», en menos de 100 ms
- [x] El *seed* es idempotente
- [ ] axe-core en C01, C16 y C18: llega con la interfaz
