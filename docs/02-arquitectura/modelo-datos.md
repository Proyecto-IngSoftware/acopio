---
title: "Modelo de datos"
type: arquitectura
tags: [arquitectura]
estado: vigente
actualizado: 2026-09-28
---

# Modelo de datos

PostgreSQL 16 · Prisma. Nombres en español, iguales a los del
[glosario](../00-contexto/glosario.md).

---

## Principio rector

**El saldo no se guarda. Se deriva de movimientos inmutables.**

```
Movimiento  →  append-only  →  Saldo (vista materializada)
```

Tres propiedades que se obtienen gratis:

1. **Explicabilidad** — «¿por qué hay 1.240 L?» se responde con los 37 movimientos.
2. **Auditoría** — no hay que construirla; es la tabla misma.
3. **Sincronización offline sin conflictos** — un movimiento es un hecho, no un
   estado. Reenviar la cola en orden basta.

---

## Diagrama

```
Emergencia ─┬─ Acopio ──┬─ Movimiento ──┬── Comprobante ── LineaComprobante
            │           │               └── Remision ──┬── LineaRemision
            │           ├─ Umbral                      └── RemisionComprobante
            │           └─ Jornada ── Reserva
            │
            ├─ Zona ────┬─ Movimiento
            │           ├─ Umbral
            │           └─ ReporteNecesidad
            │
            ├─ Entidad ─── Causa
            │
            └─ Sugerencia (Acopio → Zona)

Categoria ──┬─ CanastaEstandar
            ├─ CodigoBarras
            ├─ Movimiento
            └─ Umbral

Usuario ────┬─ UsuarioAsignacion → (Acopio | Zona)
            ├─ Invitacion
            ├─ Bitacora
            └─ Comprobante (como Donador)
```

---

## Tablas

### Raíz y catálogo

```
emergencia
  id · nombre · tipo · inicio · horizonte_dias (7)
  estado  ACTIVA | EN_SEGUIMIENTO | CERRADA
  destacada_hasta date        al pasarla, ACTIVA → EN_SEGUIMIENTO (tarea diaria)
  cerrada_en timestamptz? · motivo_cierre text?
  CHECK (estado <> 'CERRADA' OR cerrada_en IS NOT NULL)

configuracion_motor           una sola fila, global (ADR-0010)
  id smallint PK · CHECK (id = 1)
  pesos jsonb   {criticidad, urgencia, proximidad, magnitud} · suman 1
  cantidad_minima numeric · actualizado_por · actualizado_en

categoria
  id · nombre · grupo · unidad_base (LITRO|KILOGRAMO|UNIDAD)
  perecedero bool · sinonimos text[] · archivada bool

canasta_estandar
  id · categoria_id · cantidad_persona_dia numeric
  fuente text NOT NULL · vigente_desde date
  UNIQUE (categoria_id, vigente_desde)

codigo_barras
  ean text PK · categoria_id · creado_por · revisado bool
  descripcion text? · contenido numeric?    unidad base que trae una unidad
```

`codigo_barras.contenido` es opcional: con él, quien escanea cuenta presentaciones
—12 botellas— y el sistema convierte a la unidad base de la categoría; sin él, la
cantidad se escribe directo en la unidad base.

`canasta_estandar` es versionada por `vigente_desde`: cambiar la canasta no
reescribe el histórico. El campo `fuente` es obligatorio — sin cita, el cálculo de
necesidad no se puede defender.

### Red

```
entidad
  id · nombre · tipo · nit · sitio_web · contacto · logo_url
  verificacion  SIN_VERIFICAR | VERIFICADA | RECHAZADA
  verificada_por · verificada_en · vence_en · documento_soporte_key

causa
  id · entidad_id · emergencia_id? · titulo · categoria_causa · descripcion · imagen_url
  pasos jsonb   [{orden, texto}]
  url_oficial · publicada bool
  vigente_hasta date?          opcional · pasada, se archiva sola
  archivada bool DEFAULT false · archivada_en timestamptz?
  CHECK (NOT archivada OR archivada_en IS NOT NULL)

acopio
  id · entidad_id? · nombre · direccion · lat · lng
  telefono · horario jsonb · indicaciones_acceso
  estado  ACTIVO | PAUSADO | CERRADO
  tipo    OPERADO | REFERENCIADO      REFERENCIADO = importado, sin inventario
  fuente text? · fuente_id text? · fuente_actualizado_en timestamptz?
  fuente_estado text? · fuente_necesidades jsonb?   copia textual de la fuente
  oculto_por_admin bool DEFAULT false
  UNIQUE (fuente, fuente_id)
  CHECK (tipo = 'OPERADO' OR fuente IS NOT NULL)
  CHECK (tipo = 'REFERENCIADO' OR entidad_id IS NOT NULL)

zona
  id · emergencia_id · nombre · municipio · lat · lng
  poblacion_estimada int · poblacion_fuente · poblacion_fecha
  estado  SIN_ATENDER | EN_ATENCION | CUBIERTA
```

**La emergencia es de la zona, no del acopio (2026-09-14,
[ADR-0010](adr/ADR-0010-varias-emergencias-activas.md)).** Pueden estar activas
varias emergencias, y un mismo acopio atiende a todas: por eso `acopio`, `entidad` y
`movimiento` no tienen `emergencia_id`. `zona` sí lo tiene, y `causa` de forma
opcional. La emergencia de una `RECEPCION` se conoce por su zona.

**`causa.archivada` no es lo mismo que despublicar.** Una causa archivada sigue
visible, con su sello y su fecha — solo sale del espacio principal para dejarle
lugar a lo que necesita atención ahora (2026-09-12, P-019). Ver
[RF-RED-010](../01-requerimientos/funcionales/red.md#rf-red-010--archivar-una-causa).

**Dos clases de acopio (2026-09-14, P-022).** Un acopio `OPERADO` usa Acopio:
tiene entidad, inventario, umbrales, turnos y personas asignadas. Uno
`REFERENCIADO` llega de una fuente externa —la primera, RedAcopio Bogotá— y solo
aparece en el mapa y el directorio con los datos de su fuente, copiados tal cual:
su estado original en `fuente_estado`, sus necesidades en texto libre en
`fuente_necesidades`, sin traducirlas al catálogo. `fuente` + `fuente_id` hacen
que reimportar actualice en vez de duplicar. Ver
[RF-RED-011](../01-requerimientos/funcionales/red.md#rf-red-011--importar-acopios-de-una-fuente-externa).

### Existencias — el núcleo

```
movimiento
  id                uuid pk
  ubicacion_tipo    ACOPIO | ZONA
  ubicacion_id      uuid
  categoria_id      fk
  cantidad          numeric(12,3)   siempre > 0
  signo             smallint        +1 | -1
  tipo              ENTRADA | SALIDA | AJUSTE | RECEPCION
  usuario_id        fk
  ocurrido_en       timestamptz     cuándo pasó en el mundo real
  registrado_en     timestamptz     cuándo llegó al sistema
  comprobante_id    fk?
  remision_id       fk?
  vence_en          date?
  motivo            text?           obligatorio si tipo = AJUSTE
  origen_offline    bool

  CHECK (cantidad > 0)
  CHECK (tipo <> 'AJUSTE' OR length(motivo) >= 10)
  índices: (ubicacion_tipo, ubicacion_id, categoria_id)
           (registrado_en)
```

**Sin `UPDATE` ni `DELETE`.** No basta con no escribirlos en el código: se revoca
el permiso a nivel de base de datos. Un error se corrige con un `AJUSTE` de signo
contrario.

`ocurrido_en` frente a `registrado_en` es lo que hace honesto el modo offline: un
movimiento capturado sin señal a las 3:14 pm y sincronizado a las 6:02 pm conserva
ambas marcas y la interfaz lo distingue.

```
saldo   VISTA MATERIALIZADA
  ubicacion_tipo · ubicacion_id · categoria_id
  cantidad          = Σ (cantidad × signo)
  ultimo_movimiento = max(registrado_en)
  UNIQUE (ubicacion_tipo, ubicacion_id, categoria_id)
```

`ultimo_movimiento` es lo que alimenta la antigüedad visible exigida por RNF-04.

```
umbral
  ubicacion_tipo · ubicacion_id · categoria_id
  minimo numeric · maximo numeric
  no_recibir bool · no_recibir_hasta date?
  CHECK (minimo <= maximo)
  PK (ubicacion_tipo, ubicacion_id, categoria_id)
```

### Custodia

```
comprobante
  id · folio text UNIQUE       ACO-2026-7KQ4M · sufijo aleatorio, no secuencial
  acopio_id · descripcion
  donador_id fk                 usuario con rol DONADOR · obligatorio, 2026-09-12
  archivos jsonb?               [{key, tipo, tamano, miniatura_key}] · opcional,
                                respaldo adicional, no el dato principal
  estado  PREPARADO | PENDIENTE | CONCILIADO | RECHAZADO | CANCELADO
  motivo_rechazo · verificado_por · verificado_en · creado_en
  CHECK (estado <> 'RECHAZADO' OR motivo_rechazo IS NOT NULL)

linea_comprobante
  id · comprobante_id · categoria_id
  ean text? fk                    null si se buscó por palabra clave
  contenido_unitario numeric      copia de codigo_barras.contenido; 1 si no hay
  cantidad_declarada numeric      en unidades del producto · la ajusta el Donador
  cantidad_confirmada numeric?    en unidades del producto · la ajusta el Operador
  vence_en date?                  obligatoria al confirmar si es perecedera
  motivo_diferencia text?
  CHECK (cantidad_declarada > 0 AND cantidad_confirmada >= 0)

  **2026-09-12 · único camino para crear un comprobante.** Se retiró el camino
  anónimo por foto ([RF-CMP-001](../01-requerimientos/funcionales/comprobantes.md),
  descartado — ver [pendientes.md](../01-requerimientos/pendientes.md), P-017):
  un folio sin cuenta detrás es un código que se olvida y no tiene dónde
  recuperarse. Una entrada sin donación preparada sigue siendo posible — el
  Operador la registra como `movimiento` normal, sin comprobante ni folio.

remision
  id · acopio_origen_id
  zona_destino_id fk?          null = despacho general, sin zona fija al salir
  estado  BORRADOR | EN_TRANSITO | RECIBIDA | CANCELADA
  responsable · qr_token text UNIQUE
  despachada_en · recibida_en · evidencia_keys text[] · nota_recepcion text?
  sugerencia_id fk?
  CHECK (estado <> 'RECIBIDA' OR zona_destino_id IS NOT NULL)

  El Receptor confirma con un botón «Recibido» y al menos una foto —
  `evidencia_keys` — sin conteo por categoría; lo que llegó
  visiblemente distinto va como texto en `nota_recepcion`. Al confirmar,
  `linea_remision.cantidad_recibida` se iguala a `cantidad_planeada` para cada
  línea; un conteo exacto por unidad queda para una fase posterior. Si
  `zona_destino_id` llegó nulo —despacho general—, quien confirma fija su propia
  zona en ese momento, igual que el Operador reasigna el acopio de un folio
  (arriba).

linea_remision
  id · remision_id · categoria_id
  cantidad_planeada numeric · cantidad_recibida numeric?
  motivo_diferencia text?

remision_comprobante
  remision_id · comprobante_id · vinculado_por · vinculado_en
  PK (remision_id, comprobante_id)
```

Los archivos guardan **claves del objeto en el almacenamiento (Garage), nunca URLs**. Las URLs son firmadas y de
vida corta; almacenarlas sería guardar algo ya vencido.

**Ciclo de vida del comprobante (2026-09-12, P-018).** `PREPARADO` lo crea el
Donador y todavía no llega al acopio; `PENDIENTE` ya lo recibió un Operador y espera
al Auditor; `CONCILIADO` o `RECHAZADO` los decide el Auditor. `CANCELADO` es un
`PREPARADO` que el Donador anuló o que venció sin entregarse. La bandeja del Auditor
solo ve `PENDIENTE`: lo que todavía no llega no es trabajo suyo. **`CONCILIADO` es
el cierre real de la donación** (P-019) — lo que pasa después con el cargamento es
trazabilidad de mejor esfuerzo, ver `remision_comprobante` abajo.

**Por qué `contenido_unitario` se copia en la línea.** Quien escanea cuenta
presentaciones —12 botellas—, no litros. La `ENTRADA` que se genera al confirmar
lleva `cantidad_confirmada × contenido_unitario`, en la unidad base. Se copia y no
se consulta en vivo: si alguien corrige después el contenido de ese código, una
donación ya hecha no debe cambiar de tamaño.

**Por qué existe `remision_comprobante`.** El saldo es una suma, no lotes
([ADR-0002](adr/ADR-0002-saldo-derivado.md)): no hay forma automática de saber qué
entrada alimentó qué salida, y varios camiones salen de un mismo acopio, a veces
sin destino fijo. La donación se cierra para el Donador al conciliarse, no al
vincularse a una remisión. El vínculo lo declara el Operador al despachar, de
forma opcional y de mejor esfuerzo — riesgo aceptado, no garantía (P-019). Sin
vínculo, el folio se queda en «conciliado, en el acopio» — no se inventa un
destino.

### Motor

```
sugerencia
  id · emergencia_id · acopio_id · zona_id · categoria_id
  cantidad numeric · puntaje numeric
  desglose jsonb    {criticidad, urgencia, proximidad, magnitud}
  justificacion text
  estado  PROPUESTA | APROBADA | DESCARTADA
  motivo_descarte · decidida_por · decidida_en · generada_en
```

`desglose` guarda los cuatro componentes por separado: sin ellos, el ranking es
una caja negra y la justificación no se puede reconstruir a posteriori.

```
reporte_necesidad
  id             uuid pk
  zona_id        fk
  categoria_id   fk
  reportado_por  fk           usuario con rol RECEPTOR
  nota           text?
  resuelta       bool         true = ya no hace falta · cierra la necesidad
  reportado_en   timestamptz
```

**Append-only, igual que `movimiento`.** No admite `UPDATE` ni `DELETE` — se revoca
el permiso a nivel de base de datos. Complementa el cálculo automático de
`sugerencia`: la canasta estándar predice cantidades genéricas por persona y día,
pero no lo que el Receptor ve en el terreno y ninguna fórmula anticipa. La
necesidad vigente de una categoría en una zona es su `reporte_necesidad` más
reciente —si ese último viene marcado `resuelta`, no hay necesidad vigente; así se
retira una necesidad sin borrar nada—. Se deriva, no se guarda aparte, mismo
principio que [ADR-0002](adr/ADR-0002-saldo-derivado.md).

### Turnos

```
jornada
  id · acopio_id · inicio · fin · cupo_maximo int
  descripcion · requisitos jsonb · perfil_requerido?
  cupos_ajuste_manual int DEFAULT 0
  ajuste_actualizado_en · estado  ABIERTA | CERRADA | CANCELADA

reserva
  id · jornada_id · nombre · correo · telefono?
  codigo text UNIQUE · estado  ACTIVA | CANCELADA | ASISTIO | NO_ASISTIO
  consentimiento_en timestamptz NOT NULL
  UNIQUE (jornada_id, correo)
```

`cupos_ajuste_manual` es la salida para quien llega sin reservar:
`libres = cupo_maximo − reservas_activas − cupos_ajuste_manual`.

### Identidad

```
usuario
  id · username citext UNIQUE? · nombre · correo citext UNIQUE?
  rol  ADMIN | OPERADOR | AUDITOR | RECEPTOR | DONADOR
  supabase_uid uuid UNIQUE? · estado INVITADO | ACTIVO | SUSPENDIDO
  correo_sintetico bool
  tokens_validos_desde timestamptz?   tokens emitidos antes se rechazan (RF-IDE-009)
  CHECK (rol = 'DONADOR' OR username IS NOT NULL)
  CHECK (rol <> 'DONADOR' OR (correo IS NOT NULL AND NOT correo_sintetico))

  DONADOR es la excepción al resto: se auto-registra —no lo invita el
  Administrador—, inicia sesión por `correo`, no por `username` (por eso
  `username` deja de ser obligatorio), y **no tiene filas en
  `usuario_asignacion`** — no gestiona un acopio ni una zona, elige a cuál
  entregar en cada donación.

usuario_asignacion
  usuario_id · ubicacion_tipo · ubicacion_id
  asignado_por · asignado_en
  PK (usuario_id, ubicacion_tipo, ubicacion_id)
  índice (usuario_id, ubicacion_id)

invitacion
  id · usuario_id · token_hash bytea UNIQUE · expira_en
  usada_en? · revocada_en? · es_restablecimiento bool · motivo? · creada_por? · creada_en
  CHECK (NOT es_restablecimiento OR char_length(motivo) >= 20)

bitacora
  id · usuario_id?  (nulo en acciones del sistema: seed y tareas programadas)
  accion · entidad · entidad_id? · ubicacion_id?  (filtro de C17)
  datos_antes jsonb? · datos_despues jsonb?
  destacado bool · ocurrido_en

identidad_local               solo con AUTH_PROVEEDOR=local (P-025)
  id uuid PK                  es el `sub` del token y el valor de usuario.supabase_uid
  correo citext UNIQUE · password_hash text (bcrypt)
  correo_confirmado_en timestamptz? · creado_en
```

El índice `(usuario_id, ubicacion_id)` es el que permite verificar la autorización
en cada request sin cachearla en el token.

`identidad_local` hace, mientras el desarrollo es local, lo que después hará Supabase
Auth: guardar la credencial. Por eso está aparte de `usuario` y se enlaza igual que
Supabase, por `supabase_uid` y sin llave foránea. Al pasar a Supabase se exporta con
su UUID y su hash, y se elimina
([Bloque 0 §5](../superpowers/specs/2026-09-28-bloque-0-cimientos-design.md#5-datos)).

### Notificaciones

```
correo_saliente
  id · destinatario citext · asunto · cuerpo_texto · cuerpo_html?
  estado  PENDIENTE | ENVIADO | FALLIDO
  intentos int · ultimo_error text? · enviar_despues_de timestamptz
  creado_en · enviado_en?
  CHECK (estado <> 'ENVIADO' OR enviado_en IS NOT NULL)
```

Cola de correos. La tarea «reintentar correos fallidos» toma las filas `FALLIDO` cuyo
`enviar_despues_de` ya pasó; la espera crece con cada intento (1, 2, 4… minutos, hasta
dos horas) y se detiene a los 8 intentos.

**2026-09-28 · construido en el Bloque 0.** Además de las columnas de arriba, la
primera migración crea `acopio_sin_tildes(text)`, una envoltura `IMMUTABLE` de
`unaccent` para la búsqueda de categorías (RF-CAT-002), y el rol `acopio_app` con el
que se conecta la API: tiene `SELECT`, `INSERT`, `UPDATE` y `DELETE` en todas las
tablas, menos `UPDATE`, `DELETE` y `TRUNCATE` sobre `bitacora`. Las tablas futuras
heredan esos permisos; las append-only los revocan en su propia migración.

---

## Invariantes

Cada uno se hace cumplir donde no se pueda evadir.

| Invariante | Dónde |
|---|---|
| `movimiento` no admite `UPDATE` ni `DELETE` | Permisos de base de datos |
| El saldo nunca queda negativo | Transacción con bloqueo de fila |
| `umbral.minimo <= umbral.maximo` | `CHECK` |
| `AJUSTE` exige motivo de 10 caracteres o más | `CHECK` |
| Una reserva solo existe si hay cupo libre | Transacción con bloqueo sobre la jornada |
| `CONCILIADO` exige al menos un movimiento vinculado | Transacción |
| Una línea de remisión no excede el saldo de origen | Transacción |
| Una causa publicada exige entidad `VERIFICADA` | Transacción |
| No se puede suspender al último `ADMIN` activo | Transacción |
| `reporte_necesidad` no admite `UPDATE` ni `DELETE` | Permisos de base de datos |
| Un usuario interno tiene `username`; un Donador, correo real | `CHECK` |
| Un Donador no tiene filas en `usuario_asignacion` | Transacción |
| `comprobante.donador_id` apunta a un usuario con rol `DONADOR` | Transacción |
| Solo un comprobante `PREPARADO` se puede recibir en el acopio | Transacción con bloqueo de fila |
| `RECHAZADO` exige motivo | `CHECK` |
| Línea de comprobante: declarado > 0, confirmado ≥ 0 | `CHECK` |
| Una remisión `RECIBIDA` tiene zona — un despacho general la toma al recibirse | `CHECK` |
| Una causa archivada tiene fecha de archivado | `CHECK` |
| Un acopio `REFERENCIADO` tiene fuente; uno `OPERADO` tiene entidad | `CHECK` |
| Un punto importado existe una sola vez por fuente | `UNIQUE (fuente, fuente_id)` |
| Un acopio `REFERENCIADO` no tiene movimientos, umbrales, jornadas ni asignaciones | Transacción |
| Una emergencia `CERRADA` tiene fecha de cierre | `CHECK` |
| Una emergencia `CERRADA` no recibe zonas nuevas ni genera sugerencias | Transacción |
| `configuracion_motor` tiene una sola fila y sus pesos suman 1 | `CHECK` |
| `bitacora` no admite `UPDATE` ni `DELETE` | Permisos de base de datos (rol `acopio_app`) |
| Un correo `ENVIADO` tiene fecha de envío | `CHECK` |

**Lo que se puede expresar en el esquema, va en el esquema.** Una regla que solo
vive en el código de la aplicación se rompe el día que alguien escribe un script.

---

## Estrategia de saldos

Vista materializada refrescada por disparador `AFTER INSERT` sobre `movimiento`,
con refresco selectivo de la fila `(ubicacion, categoria)` afectada.

Si el volumen lo justifica, se sustituye por una tabla `saldo` mantenida por el
mismo disparador, con reconciliación programada contra la suma real. Se mide antes
de complicar.

---

---

## Diagrama entidad-relación (Avance 3)

Todas las entidades están en el alcance del semestre: cada una responde a un `RF`
existente. `saldo` no aparece — es una vista materializada, no una tabla con llaves
propias; se deriva de `movimiento` como explica el principio rector arriba.

**Un diagrama por clúster, no uno solo.** Con 24 entidades y unas 40 relaciones, un
solo `erDiagram` de Mermaid es ilegible — la herramienta no tiene forma de acomodar
manualmente un diagrama tan grande. Se divide en los mismos siete grupos que ya
organizan la sección [Tablas](#tablas) de arriba. Cuando una entidad aparece en un
clúster solo como referencia de otro, se dibuja **liviana** — solo su llave primaria,
con una nota de dónde está completa — para no repetir atributos.

Atributos abreviados a lo principal — PK, FK y los campos que gobiernan una regla de
negocio. La lista completa de columnas está en [Tablas](#tablas).

### Raíz y catálogo

`emergencia` es la raíz de las zonas afectadas. Se dibuja aquí completa pero suelta:
no tiene relaciones dentro de este clúster — salen hacia Red (`zona` y, opcional,
`causa`) y Motor (`sugerencia`), donde aparece como referencia liviana que apunta de
vuelta a esta caja. Desde el 2026-09-14 pueden estar activas varias, y acopios,
entidades y movimientos no dependen de ella
([ADR-0010](adr/ADR-0010-varias-emergencias-activas.md)). `configuracion_motor`
guarda los pesos del motor, globales para todas las emergencias. El catálogo (`categoria`, `canasta_estandar`,
`codigo_barras`) es independiente de la emergencia: una categoría sirve para
cualquiera.

```mermaid
erDiagram
    CATEGORIA ||--o{ CANASTA_ESTANDAR : define
    CATEGORIA ||--o{ CODIGO_BARRAS : identifica

    EMERGENCIA {
        uuid id PK
        text nombre
        text estado "ACTIVA | EN_SEGUIMIENTO | CERRADA"
        date destacada_hasta "al pasarla, EN_SEGUIMIENTO"
        int horizonte_dias
    }
    CONFIGURACION_MOTOR {
        smallint id PK "fila única"
        jsonb pesos "globales · suman 1"
        numeric cantidad_minima
        uuid actualizado_por FK "usuario · clúster Identidad"
    }
    CATEGORIA {
        uuid id PK
        text nombre
        text unidad_base
        bool perecedero
    }
    CANASTA_ESTANDAR {
        uuid id PK
        uuid categoria_id FK
        numeric cantidad_persona_dia
        text fuente
        date vigente_desde
    }
    CODIGO_BARRAS {
        text ean PK
        uuid categoria_id FK
        uuid creado_por FK "usuario · clúster Identidad"
        bool revisado
        numeric contenido "opcional"
    }
```

### Red

```mermaid
erDiagram
    EMERGENCIA ||--o{ ZONA : contiene
    EMERGENCIA |o--o{ CAUSA : "enfoca · opcional"
    ENTIDAD ||--o{ CAUSA : publica
    ENTIDAD ||--o{ ACOPIO : administra
    USUARIO |o--o{ ENTIDAD : verifica

    EMERGENCIA {
        uuid id PK "clúster Raíz y catálogo"
    }
    USUARIO {
        uuid id PK "clúster Identidad"
    }
    ENTIDAD {
        uuid id PK
        uuid verificada_por FK
        text nombre
        text verificacion
        date vence_en "6 meses · al vencer archiva sus causas"
    }
    CAUSA {
        uuid id PK
        uuid entidad_id FK
        uuid emergencia_id FK "opcional"
        text titulo
        bool publicada
        bool archivada
        date vigente_hasta "opcional"
    }
    ACOPIO {
        uuid id PK
        uuid entidad_id FK "null solo si REFERENCIADO"
        text nombre
        text estado
        text tipo "OPERADO | REFERENCIADO"
        text fuente_id "UK junto con fuente"
    }
    ZONA {
        uuid id PK
        uuid emergencia_id FK
        text nombre
        int poblacion_estimada
        text estado
    }
```

### Existencias — el núcleo

El clúster más importante: es donde vive el saldo derivado de movimientos
inmutables ([ADR-0002](adr/ADR-0002-saldo-derivado.md)). Se dibuja en dos diagramas
—movimientos y umbrales— porque en uno solo las relaciones se cruzaban hasta volverlo
ilegible (2026-09-14).

```mermaid
erDiagram
    direction LR
    ACOPIO ||--o{ MOVIMIENTO : "ubicacion_tipo=ACOPIO"
    ZONA   ||--o{ MOVIMIENTO : "ubicacion_tipo=ZONA"
    CATEGORIA ||--o{ MOVIMIENTO : clasifica
    USUARIO ||--o{ MOVIMIENTO : registra
    COMPROBANTE |o--o{ MOVIMIENTO : concilia
    REMISION    |o--o{ MOVIMIENTO : origina

    ACOPIO {
        uuid id PK "clúster Red"
    }
    ZONA {
        uuid id PK "clúster Red"
    }
    CATEGORIA {
        uuid id PK "clúster Raíz y catálogo"
    }
    USUARIO {
        uuid id PK "clúster Identidad"
    }
    COMPROBANTE {
        uuid id PK "clúster Custodia"
    }
    REMISION {
        uuid id PK "clúster Custodia"
    }
    MOVIMIENTO {
        uuid id PK
        text ubicacion_tipo
        uuid ubicacion_id "sin FK real"
        uuid categoria_id FK
        uuid usuario_id FK
        uuid comprobante_id FK
        uuid remision_id FK
        numeric cantidad
        smallint signo
        text tipo
        timestamptz ocurrido_en
        timestamptz registrado_en
        date vence_en "obligatoria si es perecedera"
        text motivo "obligatorio si AJUSTE"
    }
```

```mermaid
erDiagram
    ACOPIO ||--o{ UMBRAL : "ubicacion_tipo=ACOPIO"
    ZONA   ||--o{ UMBRAL : "ubicacion_tipo=ZONA"
    CATEGORIA ||--o{ UMBRAL : limita

    ACOPIO {
        uuid id PK "clúster Red"
    }
    ZONA {
        uuid id PK "clúster Red"
    }
    CATEGORIA {
        uuid id PK "clúster Raíz y catálogo"
    }
    UMBRAL {
        text ubicacion_tipo PK
        uuid ubicacion_id PK "sin FK real"
        uuid categoria_id PK,FK
        numeric minimo
        numeric maximo
        bool no_recibir
    }
```

**Por qué `movimiento` y `umbral` no tienen una FK real hacia su ubicación.** Según
el valor de `ubicacion_tipo`, `ubicacion_id` apunta a `acopio.id` o a `zona.id`.
PostgreSQL no puede expresar una FK condicional con una sola columna, así que el
diagrama dibuja las dos relaciones posibles — la regla que obliga a que solo una
exista vive en la capa de aplicación, no en el esquema. Es la misma limitación
honesta que ya admitía [ADR-0002](adr/ADR-0002-saldo-derivado.md): lo que se puede
expresar en el esquema va en el esquema, y esto no se puede. Mismo caso en
`usuario_asignacion`, clúster Identidad.

### Custodia

```mermaid
erDiagram
    ACOPIO ||--o{ COMPROBANTE : recibe
    USUARIO |o--o{ COMPROBANTE : verifica
    USUARIO ||--o{ COMPROBANTE : "prepara · Donador"
    COMPROBANTE ||--o{ LINEA_COMPROBANTE : detalla
    CATEGORIA ||--o{ LINEA_COMPROBANTE : especifica
    CODIGO_BARRAS |o--o{ LINEA_COMPROBANTE : "escaneada como"
    ACOPIO ||--o{ REMISION : despacha
    ZONA   |o--o{ REMISION : recibe
    SUGERENCIA |o--o| REMISION : genera
    REMISION ||--o{ LINEA_REMISION : detalla
    CATEGORIA ||--o{ LINEA_REMISION : especifica
    REMISION ||--o{ REMISION_COMPROBANTE : lleva
    COMPROBANTE ||--o{ REMISION_COMPROBANTE : "viaja en"

    ACOPIO {
        uuid id PK "clúster Red"
    }
    ZONA {
        uuid id PK "clúster Red"
    }
    CATEGORIA {
        uuid id PK "clúster Raíz y catálogo"
    }
    USUARIO {
        uuid id PK "clúster Identidad"
    }
    SUGERENCIA {
        uuid id PK "clúster Motor"
    }
    CODIGO_BARRAS {
        text ean PK "clúster Raíz y catálogo"
    }
    COMPROBANTE {
        uuid id PK
        uuid acopio_id FK
        uuid verificado_por FK
        uuid donador_id FK
        text folio UK "no secuencial"
        text estado "PREPARADO → PENDIENTE → CONCILIADO"
    }
    LINEA_COMPROBANTE {
        uuid id PK
        uuid comprobante_id FK
        uuid categoria_id FK
        text ean FK
        numeric contenido_unitario "a unidad base"
        numeric cantidad_declarada
        numeric cantidad_confirmada
        date vence_en "obligatoria si es perecedera"
    }
    REMISION {
        uuid id PK
        uuid acopio_origen_id FK
        uuid zona_destino_id FK "null = despacho general"
        uuid sugerencia_id FK
        text qr_token UK
        text estado
    }
    LINEA_REMISION {
        uuid id PK
        uuid remision_id FK
        uuid categoria_id FK
        numeric cantidad_planeada
        numeric cantidad_recibida
    }
    REMISION_COMPROBANTE {
        uuid remision_id PK,FK
        uuid comprobante_id PK,FK
        uuid vinculado_por FK
    }
```

### Motor

Es el aporte original del proyecto ([spec §7](../superpowers/specs/2026-08-20-acopio-design.md)).

```mermaid
erDiagram
    EMERGENCIA ||--o{ SUGERENCIA : contextualiza
    ACOPIO ||--o{ SUGERENCIA : origen
    ZONA   ||--o{ SUGERENCIA : destino
    CATEGORIA ||--o{ SUGERENCIA : refiere
    USUARIO |o--o{ SUGERENCIA : decide
    SUGERENCIA |o--o| REMISION : genera

    ZONA ||--o{ REPORTE_NECESIDAD : reporta
    CATEGORIA ||--o{ REPORTE_NECESIDAD : refiere
    USUARIO ||--o{ REPORTE_NECESIDAD : "registra · Receptor"

    EMERGENCIA {
        uuid id PK "clúster Raíz y catálogo"
    }
    ACOPIO {
        uuid id PK "clúster Red"
    }
    ZONA {
        uuid id PK "clúster Red"
    }
    CATEGORIA {
        uuid id PK "clúster Raíz y catálogo"
    }
    USUARIO {
        uuid id PK "clúster Identidad"
    }
    REMISION {
        uuid id PK "clúster Custodia"
    }
    SUGERENCIA {
        uuid id PK
        uuid emergencia_id FK
        uuid acopio_id FK
        uuid zona_id FK
        uuid categoria_id FK
        uuid decidida_por FK
        numeric puntaje
        text estado
    }
    REPORTE_NECESIDAD {
        uuid id PK
        uuid zona_id FK
        uuid categoria_id FK
        uuid reportado_por FK
        text nota
        bool resuelta
        timestamptz reportado_en
    }
```

### Turnos

```mermaid
erDiagram
    ACOPIO ||--o{ JORNADA : abre
    JORNADA ||--o{ RESERVA : recibe

    ACOPIO {
        uuid id PK "clúster Red"
    }
    JORNADA {
        uuid id PK
        uuid acopio_id FK
        timestamptz inicio
        timestamptz fin
        int cupo_maximo
        int cupos_ajuste_manual
        text estado
    }
    RESERVA {
        uuid id PK
        uuid jornada_id FK
        text correo
        text codigo UK
        text estado
    }
```

### Identidad

```mermaid
erDiagram
    USUARIO ||--o{ USUARIO_ASIGNACION : tiene
    ACOPIO  ||--o{ USUARIO_ASIGNACION : "ubicacion_tipo=ACOPIO"
    ZONA    ||--o{ USUARIO_ASIGNACION : "ubicacion_tipo=ZONA"
    USUARIO ||--o{ INVITACION : recibe
    USUARIO ||--o{ BITACORA : genera
    USUARIO |o--o| IDENTIDAD_LOCAL : "supabase_uid = id, solo local"

    ACOPIO {
        uuid id PK "clúster Red"
    }
    ZONA {
        uuid id PK "clúster Red"
    }
    USUARIO {
        uuid id PK
        citext username UK "null solo si DONADOR"
        citext correo UK "obligatorio si DONADOR"
        uuid supabase_uid UK
        text rol
        text estado
    }
    USUARIO_ASIGNACION {
        uuid usuario_id PK,FK
        text ubicacion_tipo PK
        uuid ubicacion_id PK "sin FK real"
        uuid asignado_por FK
    }
    INVITACION {
        uuid id PK
        uuid usuario_id FK
        uuid creada_por FK
        bytea token_hash
        timestamptz expira_en
    }
    BITACORA {
        uuid id PK
        uuid usuario_id FK
        text accion
        text entidad "sin FK real, audita cualquier tabla"
        uuid entidad_id "sin FK real"
    }
    IDENTIDAD_LOCAL {
        uuid id PK "sin FK real, como Supabase"
        citext correo UK
        text password_hash
    }
```

### Roles secundarios de `usuario` no dibujados

Varias tablas referencian a `usuario` más de una vez con roles distintos —
`entidad.verificada_por`, `comprobante.verificado_por`, `sugerencia.decidida_por`,
`invitacion.creada_por`, `usuario_asignacion.asignado_por`,
`remision_comprobante.vinculado_por`—. Cada clúster dibuja solo
su relación principal con `usuario` para no saturar el diagrama; las demás quedan
documentadas en la lista de columnas de cada tabla, en [Tablas](#tablas).

**Restricciones de integridad:** las mismas que ya aplican al modelo completo — ver
la tabla de [Invariantes](#invariantes) más abajo. No se duplican aquí.
