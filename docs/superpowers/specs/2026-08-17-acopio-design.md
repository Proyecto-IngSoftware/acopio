# Acopio — Especificación de diseño

**Fecha:** 2026-08-17
**Estado:** aprobado, pendiente de plan de implementación
**Nombre de trabajo:** Acopio (provisional)

---

## 1. Resumen

Plataforma de coordinación logística para respuesta a desastres. Nace del terremoto
de 2026 en Colombia.

Resuelve tres problemas distintos con una sola base de datos:

1. **Quien quiere ayudar no sabe cómo ni dónde.** Directorio de causas con pasos
   claros, mapa de centros de acopio, y turnos de voluntariado con cupo.
2. **Los centros de acopio se saturan de unos insumos y se quedan sin otros.**
   Inventario por categoría con umbrales y estado *no recibir*, publicado en el mapa.
3. **Las donaciones llegan mal repartidas a las zonas afectadas.** Motor que
   calcula déficit por zona y superávit por acopio, y propone traslados ordenados
   por criticidad.

La plataforma **no recibe dinero**. Para donaciones monetarias entrega el paso a
paso y dirige al sitio oficial de la entidad responsable.

### Contexto del proyecto

| | |
|---|---|
| Naturaleza | Académico. Se evalúa documentación y software funcional |
| Equipo | 3 a 5 personas |
| Duración | Un semestre |
| Entregable | Documentación completa de los 7 subsistemas + implementación de 4 a 5 |

---

## 2. Problema

Tras el terremoto surgieron patrones repetidos:

- Gente en otras ciudades y países quiere ayudar, pero solo encuentra canales para
  donar a personas. Otras causas —animales, adultos mayores, personas
  desaparecidas, rescatistas— quedan invisibles.
- En Bogotá, principal ciudad de origen de las donaciones, no hay un listado
  confiable de centros de acopio. Voluntarios viajan y son devueltos porque ya
  hay suficiente personal.
- Unos centros acumulan agua, papel o granos hasta no poder moverse, mientras
  otros carecen de lo mismo.
- En zona de desastre, unas veredas reciben todo y otras quedan olvidadas.
- No hay control de qué entró, qué salió ni a dónde fue. El donante no puede
  verificar que su donación llegó.

**Causa raíz común:** no existe un inventario compartido con antigüedad conocida.
Sin cantidades no hay comparación posible, y sin comparación cada decisión de
reparto es una corazonada.

---

## 3. Alcance

### Dentro

Los siete módulos se **documentan** por completo. Se **implementan** los cuatro de
núcleo más los dos ligeros; el séptimo cae primero si el calendario aprieta.

| Módulo | Documentado | Implementado | Profundidad |
|---|:-:|:-:|---|
| M4 Inventario de acopio | ✓ | ✓ | Núcleo. Completo |
| M5 Comprobantes y cadena de custodia | ✓ | ✓ | Núcleo. Completo |
| M6 Zonas afectadas y motor | ✓ | ✓ | Núcleo. **Aporte original** |
| M2 Mapa de centros de acopio | ✓ | ✓ | Completo. Alimenta el uso público |
| M1 Directorio de causas | ✓ | ✓ | Ligero. Contenido curado, lógica mínima |
| M7 Home público | ✓ | ✓ | Ligero. Vitrina, sin backend propio |
| M3 Turnos y cupos de voluntariado | ✓ | parcial | **Primer recorte.** Reserva por correo sin eventos complejos |

Esto es la **opción A, vertical logístico**: se construye completo el eje
`acopio → inventario → comprobante → motor → zona`, porque el motor de
emparejamiento solo tiene sentido si sus tres cimientos están terminados. Un
vertical profundo se sustenta mejor que siete módulos flojos.

Dentro de M3, el orden de recorte es: primero el voluntariado especializado
(RF-TUR-007), luego la administración avanzada de jornadas (RF-TUR-005). La
reserva básica se conserva: es la respuesta al problema del voluntario que viaja
en vano.

### Fuera, con razón

Ver `docs/00-contexto/fuera-de-alcance.md`. Resumen:

- **Gestión de datos de personas desaparecidas.** Dato sensible bajo Ley 1581,
  riesgo de revictimización y de difundir información falsa. La causa se enlaza a
  UBPD, Cruz Roja y Medicina Legal, sin almacenar nada.
- **Procesamiento de pagos.** Decisión de producto. La plataforma dirige, no recauda.
- **Optimización de rutas de transporte.** Problema de investigación de operaciones
  que consumiría el semestre. El motor ordena por proximidad, no calcula recorridos.
- **Conteo físico de personas en el sitio.** El aforo se administra por reservas.
- **Doble factor y permisos granulares por acción.** Rol más alcance cubre los casos
  reales.

---

## 4. Arquitectura

### Dos superficies, un backend

```
┌──────────────────────┐   ┌───────────────────────────┐
│  HOME (público)      │   │  CONSOLA (autenticada)    │
│  vitrina de la causa │   │  inventario               │
│  carrusel entidades  │   │  comprobantes             │
│  mapa de acopios     │   │  zonas y necesidades      │
│  reserva de turnos   │   │  motor de sugerencias     │
│  guía de donación    │   │  remisiones y QR          │
│    (enlaza afuera)   │   │  administración           │
└──────────┬───────────┘   └────────────┬──────────────┘
           └───────── API REST ─────────┘
                         │
        ┌────────────────┼─────────────────┐
    PostgreSQL         MinIO         Supabase Auth
    (contenedor)     (contenedor)      (nube, externo)
```

### Stack

| Capa | Elección | Razón |
|---|---|---|
| Backend | NestJS + TypeScript | Módulos con límites explícitos e inyección de dependencias |
| ORM | Prisma | Migraciones versionadas, tipos generados |
| Base de datos | PostgreSQL 16 | Transacciones reales, obligatorias para inventario |
| Frontend | React + Vite + TypeScript + Tailwind + shadcn/ui | Salida de Lovable |
| Mapa | Leaflet + OpenStreetMap | Sin API key ni tarjeta de crédito |
| Geo | Columnas `lat`/`lng` + Haversine | PostGIS agrega fricción sin beneficio a esta escala |
| Archivos | MinIO, buckets privados | Compatible con S3 si migra a nube |
| Escáner | `@zxing/browser` | Códigos de barras y QR con la cámara. Un componente para ambos |
| Autenticación | Supabase Auth (nube) | Solo emite el token |
| Autorización | NestJS contra `public.usuario` | Roles y alcance son nuestros |

### Monorepo

```
acopio/
├─ apps/
│  ├─ api/     NestJS · un módulo por límite de dominio
│  └─ web/     front de Lovable
├─ packages/
│  ├─ shared/     tipos y reglas puras: unidades, déficit, semáforo
│  └─ ui-tokens/  tokens de diseño, fuente única de verdad del color
├─ infra/         docker-compose, nginx, scripts
├─ prisma/        esquema y migraciones
└─ docs/
```

`packages/shared` evita que frontend y backend inventen dos definiciones distintas
de "escaso". La regla se escribe una vez y ambos la importan.

### Reparto entre 3-5 personas

Los límites de módulo del backend son también los límites de las personas:

| Persona | Módulo NestJS | Pantallas |
|---|---|---|
| 1 | `catalogo`, `acopios` | C18, C03, C07, P05, P06 |
| 2 | `inventario` | C04, C05, C06 — incluye offline |
| 3 | `comprobantes` | C08, P09, P10 |
| 4 | `zonas`, `motor` | C09, C10, C11, C12, C13 |
| 5 | `identidad`, `turnos`, home | C01, C14, C15, C16, C17, P01-P04, P07, P08 |

---

## 5. Modelo de dominio

### Principio rector: el saldo no se guarda, se deriva

```
Movimiento   append-only · nunca UPDATE · nunca DELETE
  ubicacion_tipo  ACOPIO | ZONA
  ubicacion_id    uuid
  categoria_id    uuid
  cantidad        numeric      siempre positiva
  signo           +1 | -1
  tipo            ENTRADA | SALIDA | AJUSTE | RECEPCION
  usuario_id      uuid
  ocurrido_en     timestamptz  cuándo pasó en el mundo real
  registrado_en   timestamptz  cuándo llegó al sistema (difiere si fue offline)
  comprobante_id  uuid?
  remision_id     uuid?
  vence_en        date?
  motivo          text?        obligatorio si tipo = AJUSTE

Saldo = Σ (cantidad × signo)  →  vista materializada por (ubicacion, categoria)
```

Tres propiedades que se obtienen gratis:

1. **Explicabilidad.** "¿Por qué hay 1.240 L?" → aquí están los 37 movimientos.
2. **Auditoría.** No hay que construirla aparte; es la tabla misma.
3. **Sincronización offline sin conflictos.** Un movimiento es un hecho inmutable,
   no un estado editable. Reenviar la cola en orden basta. Sincronizar un *saldo*
   editable exigiría resolución de conflictos.

La distinción entre `ocurrido_en` y `registrado_en` es la que hace honesto el
modo offline: un movimiento capturado sin señal a las 3:14 pm y sincronizado a
las 6:02 pm conserva las dos marcas.

### Entidades

| Grupo | Entidades |
|---|---|
| Raíz | `Emergencia` |
| Catálogo | `Categoria` (unidad base, perecedero) · `CanastaEstandar` (cantidad/persona/día) · `CodigoBarras` (EAN → categoría) |
| Red | `Entidad` (verificación) · `Causa` (pasos + URL externa) · `Acopio` · `Zona` |
| Existencias | `Movimiento` · `Saldo` (vista) · `Umbral` (min, max, `no_recibir`) |
| Custodia | `Comprobante` · `Remision` + `LineaRemision` |
| Motor | `Sugerencia` |
| Turnos | `Jornada` · `Reserva` |
| Transversal | `Usuario` · `UsuarioAsignacion` · `Invitacion` · `Bitacora` |

`Emergencia` como raíz cuesta una llave foránea hoy e imposibilita el retro-encaje
mañana. Se incluye aunque el proyecto arranque con una sola.

### Reglas de integridad

- `Movimiento` no admite `UPDATE` ni `DELETE`. Se corrige con un `AJUSTE` de signo
  contrario y motivo obligatorio.
- El saldo de una categoría nunca puede quedar negativo. La transacción falla.
- `Umbral.min <= Umbral.max`.
- Una `Reserva` solo existe si `reservas_activas < Jornada.cupo_maximo`.
  Se resuelve dentro de la transacción con bloqueo sobre la jornada.
- `Comprobante` en estado `CONCILIADO` exige un `movimiento_id`.
- `LineaRemision` no puede exceder el saldo disponible en el acopio de origen.
- Todo dato operativo mostrado en interfaz lleva su antigüedad. Un número sin
  marca de tiempo es una afirmación no verificable.

---

## 6. Identidad y control de acceso

### Reparto de responsabilidades

**Supabase Auth solo emite el token.** No conoce roles, no conoce zonas, no crea
accesos. Autentica: prueba que quien escribe es quien dice ser.

**La autorización es nuestra**, en `public.usuario` y `public.usuario_asignacion`.

### Tablas

```
usuario
  id             uuid pk
  username       citext UNIQUE NOT NULL   lo escribe el admin
  nombre         text
  correo         citext UNIQUE NULL       opcional, ver más abajo
  rol            ADMIN | OPERADOR | COORDINADOR | VERIFICADOR | OBSERVADOR
  supabase_uid   uuid UNIQUE NULL         se estampa en el primer ingreso
  estado         INVITADO | ACTIVO | SUSPENDIDO

usuario_asignacion
  usuario_id      fk
  ubicacion_tipo  ACOPIO | ZONA
  ubicacion_id    uuid
  asignado_por    fk usuario
  asignado_en     timestamptz
  pk (usuario_id, ubicacion_tipo, ubicacion_id)

invitacion
  id            uuid pk
  usuario_id    fk
  token_hash    bytea         SHA-256 del token; el token no se guarda
  expira_en     timestamptz   7 días
  usada_en      timestamptz?
  motivo        text?         obligatorio si es restablecimiento
  creada_por    fk usuario
```

**Rol global, alcance múltiple.** Un operador es operador en todos los acopios que
le asignen. Rol distinto por asignación sería más flexible y bastante más caro en
guards y en interfaz; los casos reales no lo piden.

### Nombre de usuario sobre correo

Supabase identifica por correo. La persona escribe `jlopez`; el frontend resuelve
ese username contra un endpoint público que devuelve el correo asociado, y con ese
correo llama a Supabase.

- **Con correo real:** hay recuperación de contraseña autónoma.
- **Sin correo real:** se genera `jlopez@usuarios.acopio.local`. Autentica bien,
  pero **no hay recuperación**; si la olvida, el administrador restablece el acceso.
  Es una salida legítima para voluntarios sin correo activo, siempre que sea una
  decisión consciente. El formulario muestra la advertencia.

### Flujo de invitación

```
1  ADMIN   crea usuario: username · nombre · rol · correo? · asignaciones
           → estado INVITADO

2  API     genera token de 32 bytes aleatorios
           guarda solo SHA-256(token) · expira 7 días · un solo uso
           → enlace https://app/invitacion/<token>
           → se envía por correo si hay; siempre queda copiable
             para entregarlo por WhatsApp

3  PERSONA abre el enlace, ve su username y sus zonas, define su contraseña

4  API     valida el token
           crea el usuario en Supabase con la Admin API
             (service_role · email_confirm: true · esa contraseña)
           recibe el UUID → lo estampa en usuario.supabase_uid
           → estado ACTIVO · token invalidado

5  PERSONA entra con username + contraseña
```

El paso 4 ocurre **entero en el backend**. La `service_role` key de Supabase puede
crear y borrar cualquier usuario; filtrada al navegador entrega el sistema completo.
Nunca sale del servidor.

### Guard de autorización

En cada request:

1. Valida la firma del JWT contra el JWKS de Supabase (claves cacheadas).
2. Resuelve `supabase_uid` en `public.usuario`.
3. Si no existe fila, o el estado no es `ACTIVO` → **403**.
4. Para operaciones con `ubicacion_id`, verifica contra `usuario_asignacion`.

**Las asignaciones se consultan en base de datos, nunca se cachean en el token.**
Dentro del JWT, revocar un acceso no surtiría efecto hasta la expiración. Se
resuelve con un índice sobre `(usuario_id, ubicacion_id)`.

El conmutador de contexto de la interfaz es una comodidad, jamás una fuente de
autoridad. El `ubicacion_id` viaja en el cuerpo del request y se valida siempre.

### Reglas de gobierno

- **Nunca eliminar usuarios, solo suspender.** Quien registró movimientos queda
  referenciado para siempre; borrarlo rompe la auditoría.
- **Protección del último administrador.** El sistema rechaza suspender, degradar o
  eliminar al último `ADMIN` activo. Un administrador tampoco puede cambiarse el
  rol a sí mismo.
- **Aviso al desasignar.** Si la ubicación queda sin responsable activo, se advierte
  antes de confirmar. No lo bloquea.
- **Correo automático** al asignar y al revocar acceso.
- **Revocación inmediata** con `estado = SUSPENDIDO`. El token de Supabase sigue
  siendo válido —Supabase no sabe nada—, pero el guard lo rechaza en el siguiente
  request.

### Límite honesto del modelo

El administrador siempre podrá regenerar una invitación y apropiarse de una cuenta
ajena. Es inevitable en cualquier sistema con administrador, y quien tenga acceso a
la base de datos puede hacerlo de todos modos.

Lo que sí se elimina es el sigilo:

- Regenerar la invitación de un usuario `ACTIVO` es una acción distinta,
  **restablecer acceso**, con motivo escrito obligatorio.
- Notifica a la persona afectada y a todos los administradores.
- Queda en bitácora como evento destacado.
- Mientras el restablecimiento está pendiente, el usuario aparece marcado en la
  matriz de acceso.

### Contraseña

Mínimo 12 caracteres. Sin exigencia de símbolos —las reglas barrocas producen
`Acopio2026!` en todos los usuarios—. Se rechaza contra lista de contraseñas
comunes. Viaja del navegador a Supabase mediante nuestra llamada de servidor y
queda hasheada allí; la API no la persiste jamás.

### Reservas de turno no requieren cuenta

Correo más código de confirmación. Supabase Auth es solo para la consola interna:
pocas decenas de usuarios, holgado en el plan gratuito.

---

## 7. Motor de emparejamiento

Es el aporte original del proyecto.

### Cálculo

```
necesidad(z,c)  = canasta(c) × poblacion(z) × horizonte_dias
recibido(z,c)   = Σ movimientos RECEPCION en z de categoría c
deficit(z,c)    = max(0, necesidad − recibido)
cobertura(z,c)  = recibido / necesidad                       [0..1]

saldo(a,c)      = Σ movimientos en acopio a de categoría c
superavit(a,c)  = max(0, saldo − umbral_max(a,c))
   si no_recibir(a,c) → movible = max(0, saldo − umbral_min(a,c))
```

### Puntaje de una sugerencia

```
puntaje = w1·criticidad + w2·urgencia + w3·proximidad + w4·magnitud

criticidad = 1 − cobertura(z,c)
urgencia   = 1 / (1 + dias_para_vencer)      1 si no es perecedero sin fecha
proximidad = 1 − (distancia / distancia_max)
magnitud   = min(1, movible / deficit)

pesos por defecto: 0.45 · 0.25 · 0.15 · 0.15   configurables por emergencia
cantidad_sugerida = min(movible(a,c), deficit(z,c))
```

### Generación

Heurística voraz por categoría: zonas ordenadas por criticidad descendente,
acopios por superávit descendente, emparejamiento sucesivo hasta agotar déficit o
superávit. Recalculo bajo demanda y de forma programada cada 15 minutos.

### Ciclo de vida

```
PROPUESTA ──aprobar──→ APROBADA ──→ genera Remision (BORRADOR)
    └──descartar──→ DESCARTADA (motivo obligatorio)
```

**Ninguna sugerencia se ejecuta sola.** Un humano aprueba, y esa aprobación es lo
que crea la remisión. El sistema recomienda; la persona decide y responde.

### Evaluación académica

El motor se compara contra una línea base de reparto igualitario, midiendo
desviación de cobertura entre zonas y proporción de insumo vencido. Eso convierte
el módulo en un resultado medible y no en una opinión.

---

## 8. Cadena de custodia

```
1  DONANTE   sube factura o foto contra un ID de acopio  (público, sin login)
             → Comprobante en estado PENDIENTE, con folio

2  OPERADOR  registra la entrada física en inventario     (C04)

3  VERIFICADOR  concilia comprobante contra movimiento    (C08)
             → CONCILIADO, o RECHAZADO con motivo

4  MOTOR     el insumo se despacha en una Remision con QR

5  COORDINADOR  escanea el QR en la zona, confirma cantidades,
                adjunta evidencia fotográfica                (C13)
             → Remision RECIBIDA

6  DONANTE   consulta su folio y ve el recorrido completo  (P10)
```

Los archivos viven en MinIO con **buckets privados sin excepción** — son facturas
con datos personales. La API entrega URLs firmadas de expiración corta; el
navegador nunca habla con MinIO directamente. Miniaturas con `sharp` en la API.

---

## 9. Superficies y pantallas

### Público — HOME

| # | Pantalla | Núcleo |
|---|---|---|
| P1 | Portada | Hero, cifras vivas, carrusel de entidades verificadas, tres botones: donar dinero · donar en especie · ser voluntario |
| P2 | Cómo ayudar | Bifurcación explicada. Aviso visible: esta plataforma no recibe dinero |
| P3 | Directorio de causas | Filtro: personas, animales, adultos mayores, desaparecidos, rescatistas |
| P4 | Ficha de causa | Entidad, sello de verificación, paso a paso numerado, salida al sitio oficial con aviso |
| P5 | Mapa de acopios | Filtros: qué recibe · qué no recibe · abierto ahora · tiene cupo |
| P6 | Ficha de acopio | Dirección, cómo llegar, horario, lo que urge, lo que ya no recibe, cupos, antigüedad del dato |
| P7 | Turnos y jornadas | Lista con cupo. Reserva con correo |
| P8 | Confirmación de reserva | Código, qué llevar, cómo cancelar |
| P9 | Registrar mi donación | Sin login. ID de acopio + foto de factura → folio |
| P10 | Seguir mi donación | Consulta por folio: recibida → conciliada → despachada a zona X |
| P11 | Transparencia | Métricas agregadas, nada personal |
| P12 | Legal | Privacidad (Ley 1581), términos, aviso de no recepción de dinero |

### Interno — CONSOLA

| # | Pantalla | Núcleo |
|---|---|---|
| C1 | Acceso | Login por username. Enlace de invitación y creación de contraseña |
| C2 | Tablero | Distinto por rol. Lo urgente arriba |
| C3 | Inventario | Saldo por categoría, semáforo, antigüedad |
| C4 | **Entrada rápida** | Pantalla más importante. Escáner, búsqueda por palabra clave, teclado numérico grande, confirmación en un toque. Funciona offline |
| C5 | Despacho | Salida hacia una remisión |
| C6 | Conteo físico | Ajuste con motivo obligatorio |
| C7 | Umbrales y no recibir | Mínimo, máximo e interruptor por categoría |
| C8 | Bandeja de comprobantes | Pendientes → conciliar → aprobar o rechazar |
| C9 | Zonas afectadas | Lista y mapa, población estimada, estado |
| C10 | Ficha de zona | Necesidad, recibido, déficit por categoría |
| C11 | **Motor de sugerencias** | Ranking con su porqué. Aprobar genera remisión |
| C12 | Remisiones | Borrador → en tránsito → recibida. QR imprimible |
| C13 | Recepción en zona | Escanear QR, confirmar cantidades, foto |
| C14 | Turnos y aforo | Crear jornada, ver reservas, cerrar cupo |
| C15 | Entidades | Alta, documento soporte, sello con fecha |
| C16 | Usuarios y accesos | Crear, invitar, asignar zonas, matriz de acceso |
| C17 | Bitácora | Auditoría filtrable, solo lectura |
| C18 | Catálogo maestro | Categorías, unidades, canasta estándar, mapeo EAN |
| C19 | Contenido del home | Noticias y carrusel |

---

## 10. Diseño visual

Detalle completo en `docs/03-diseno/sistema-diseno.md`.

**Restricción que manda sobre todas:** el color semántico está reservado. Rojo,
ámbar y verde significan *escaso*, *atención* y *suficiente*; morado significa
*saturado / no recibir*. Por eso la marca **no puede ser roja ni verde** — si el
botón primario es verde, el ojo deja de leer el verde como "hay suficiente". Esto
descarta la paleta obvia de ONG. Marca en teal profundo, neutros en gris cálido.

**Contexto de uso real:** de pie, con una mano, bajo sol, con guantes, con el
celular al 12% y datos malos. De ahí: área táctil mínima 48×48 px, cuerpo de 16 px
como piso, contraste AAA en datos, navegación inferior en móvil, cifras tabulares
con unidad al lado, y antigüedad visible en todo dato operativo.

**Móvil es la plataforma principal**, no una adaptación. La consola se diseña
primero para un teléfono en la mano de alguien que está descargando un camión.

---

## 11. Despliegue

```
docker compose:
  db       postgres:16          volumen persistente
  api      nestjs               multi-stage build
  storage  minio                buckets privados, volumen persistente
  web      nginx + build Vite
  proxy    nginx                / → web · /api → api · /files → api
```

Supabase Auth es externo, en la nube. MinIO **nunca** se expone directamente.
`docker-compose.dev.yml` añade recarga en caliente. El equipo clona y ejecuta
`docker compose up`.

---

## 12. Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Sin internet no se entra a la consola | Alto en emergencia real | Sesiones largas con refresh; la captura offline de inventario sigue operando en dispositivo ya autenticado |
| El plan gratuito de Supabase pausa proyectos inactivos | Demo caída el día de la sustentación | Está en el runbook: verificar el proyecto 72 h antes |
| Correos de usuarios salen del país | Legal | Aviso de transferencia internacional en la política de privacidad, Ley 1581 |
| El offline se come el tiempo del motor | Alto — el motor es el aporte original | El offline se limita al formulario de movimiento, que es append-only. Si se atrasa, se corta primero |
| Dato desactualizado tratado como verdad | Decisiones logísticas erradas | Antigüedad visible en todo dato operativo. Sin excepción |
| Dirigir donantes a una entidad fraudulenta | Reputacional grave | Sello de verificación con documento soporte y fecha. Sin sello no aparece en el carrusel |
| Voluntario llega sin reservar y satura el sitio | Medio | El encargado ajusta cupos restantes a mano; el mapa muestra el cupo real |

---

## 13. Orden de construcción

Cada bloque es un ciclo de especificación, plan e implementación propio.

```
Bloque 0  Cimientos      monorepo · docker · prisma · identidad · catálogo maestro
Bloque 1  Red            acopios · zonas · entidades · mapa · home
Bloque 2  Inventario     movimientos · saldos · umbrales · no recibir · entrada rápida
Bloque 3  Custodia       comprobantes · conciliación · MinIO · seguimiento por folio
Bloque 4  Motor          déficit · superávit · sugerencias · remisiones · QR
Bloque 5  Turnos         jornadas · reservas · aforo
Bloque 6  Extras         offline · bitácora enriquecida · transparencia
```

El Bloque 0 es prerrequisito de todo. Los bloques 1 a 3 pueden solaparse entre
personas distintas. El Bloque 4 exige que 2 y 3 estén cerrados. El Bloque 6 es lo
primero que se recorta si el calendario aprieta.
