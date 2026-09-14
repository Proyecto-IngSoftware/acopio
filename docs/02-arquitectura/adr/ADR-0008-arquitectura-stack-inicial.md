---
title: "ADR-0008 · Arquitectura y selección tecnológica inicial"
type: adr
tags: [arquitectura, adr, entrega]
estado: vigente
adr: 8
decision: aceptada
actualizado: 2026-09-14
---

# ADR-0008 · Arquitectura y selección tecnológica inicial

**Fecha:** 2026-09-14 · **Estado:** aceptada

> **Equivale al «ADR-001: Arquitectura y selección tecnológica inicial»** del
> [Avance 3](../../entregas/avance-03-arquitectura.md) del curso. En la bóveda lleva
> el número 0008 porque los números asignados no se reutilizan
> ([P-011](../../01-requerimientos/pendientes.md)). Es la decisión global: los
> ADR-0001 a 0007 son decisiones de detalle que esta enmarca y cita.

## Contexto

Hay que decidir cómo se organiza técnicamente Acopio y con qué tecnologías se
construye durante el semestre. Las siete decisiones anteriores resolvieron piezas
sueltas —autenticación, saldo, roles, frontend, modo sin conexión, color,
Donador—; falta la que las reúne y responde la pregunta de fondo: qué arquitectura
permite desarrollar la solución de forma viable en un semestre.

### Tipo de solución

Plataforma **web responsive, móvil primero** ([RNF-01](../../01-requerimientos/no-funcionales.md)),
sin aplicación nativa, con dos superficies sobre un mismo dominio:

- **Portal público**, sin cuenta: mapa de acopios con lo que urge y lo que ya no
  reciben, directorio de causas verificadas, reserva de turnos de voluntariado y
  seguimiento de donaciones por folio. Lo consulta el donante desde el teléfono, a
  veces con conexión 3G.
- **Consola interna**, autenticada: inventario, comprobantes, zonas afectadas, motor
  de emparejamiento, remisiones y administración. La usan cuatro roles internos
  —Administrador, Auditor, Operador y Receptor— más el Donador auto-registrado
  ([ADR-0007](ADR-0007-donador-excepcion-rol.md)).

### Requisitos que condicionan la arquitectura

| Requisito | Qué le exige a la arquitectura |
|---|---|
| **RNF-06 · Integridad del inventario** | Transacciones reales con control de concurrencia: dos operadores registrando a la vez no pueden dejar un saldo negativo. `movimiento` no admite `UPDATE` ni `DELETE`, garantizado por permisos de base de datos, y el saldo se deriva de los movimientos ([ADR-0002](ADR-0002-saldo-derivado.md)) |
| **RNF-02 · Registro en menos de 10 s** | Cliente liviano y API que responda un movimiento en menos de 500 ms ([RNF-05](../../01-requerimientos/no-funcionales.md)) |
| **RNF-07 · Degradación sin conexión** | Cola local en el cliente, limitada al registro de movimientos ([ADR-0005](ADR-0005-offline-solo-movimientos.md)). Si el proveedor de autenticación cae, las sesiones activas siguen operando |
| **Motor de emparejamiento (RF-MOT)** | Cálculo de déficit y superávit sobre todo el inventario en menos de 5 s con 50 zonas × 40 categorías. Exige consultas agregadas y reglas puras que se puedan probar aisladas |
| **RNF-08 · Seguridad** | Autorización verificada en cada request contra la base de datos ([ADR-0003](ADR-0003-rol-global-alcance-multiple.md)); archivos en almacenamiento privado, accesibles solo por URL firmada |
| **RNF-09 · Ley 1581 de 2012** | Las facturas contienen datos personales: se guardan en almacenamiento propio y nunca se exponen en superficie pública |
| **RNF-10 · Auditoría** | Bitácora append-only de toda operación de escritura |
| **RNF-13 · Mantenibilidad** | Un módulo por límite de dominio, sin dependencias circulares; reglas de negocio escritas una sola vez y compartidas entre cliente y servidor |
| **RF-RED-011 · Fuentes externas** | Leer puntos de acopio de un sistema ajeno, sin API pública, y tolerar que cambie de formato sin dejar el mapa vacío |

### Restricciones

- **Equipo y tiempo.** Cuatro estudiantes de pregrado, un semestre, desarrollo por
  Sprints. Los módulos se reparten por persona
  ([especificación §4](../../superpowers/specs/2026-08-20-acopio-design.md)), así que
  los límites de módulo son también límites de trabajo entre integrantes.
- **Presupuesto cero.** Solo servicios gratuitos o autoalojados: mapa sin API key ni
  tarjeta de crédito, autenticación en plan gratuito.
- **Diseño de interfaz con Claude Design**
  ([ADR-0009](ADR-0009-mockups-claude-design.md)): las pantallas se dibujan como
  mockups y el equipo las implementa a mano en React con TypeScript y Tailwind, sin
  generador de código en el camino.
- **Evaluación académica.** Se evalúa la arquitectura además del producto: la lógica
  de negocio —en especial el motor y las transacciones de inventario, que son el
  aporte original— tiene que quedar en código propio y probado, no delegada a un
  servicio externo ([ADR-0001](ADR-0001-supabase-solo-auth.md)).
- **Entorno reproducible.** Cualquier integrante levanta el sistema completo con un
  solo comando; producción en un VPS ([P-005](../../01-requerimientos/pendientes.md)).
- **Una emergencia activa a la vez** (RF-CAT-005), y una escala acotada: decenas de
  acopios y zonas, con 50 × 40 como techo de cálculo.

### Atributos de calidad, en orden de prioridad

1. **Integridad de datos.** Un saldo incorrecto produce un traslado equivocado; es la
   prueba más importante del proyecto (RNF-06).
2. **Usabilidad en terreno.** De pie, con guantes, bajo sol y con batería escasa
   (RNF-01 a RNF-04). Si registrar es tedioso, el operador no registra y el sistema
   queda ciego.
3. **Disponibilidad degradada.** Seguir registrando sin señal (RNF-07).
4. **Seguridad y privacidad** (RNF-08, RNF-09).
5. **Mantenibilidad**, porque cuatro personas trabajan en paralelo sobre el mismo
   código (RNF-13).
6. **Rendimiento** dentro de los objetivos de RNF-05.

**Escalabilidad horizontal no es un atributo priorizado:** con una emergencia activa
y decenas de puntos, un solo servidor alcanza. Decidir en función de ella sería
elegir por tendencia.

## Decisión

**Acopio se construye como una arquitectura cliente-servidor, con el backend
organizado como un monolito modular en capas.**

- **Cliente-servidor.** Una SPA en el navegador —con el portal público y la consola
  como dos superficies de la misma aplicación— habla con una API REST por HTTPS. El
  cliente nunca toca la base de datos ni el almacenamiento de archivos.
- **Monolito.** Una sola aplicación de backend, un solo proceso desplegable y una sola
  base de datos. Las transacciones de inventario ocurren dentro de un único
  PostgreSQL, sin coordinación entre servicios.
- **Modular.** Dentro del monolito, once módulos NestJS. Ocho siguen un límite de
  dominio —`identidad`, `catalogo`, `acopios`, `inventario`, `comprobantes`,
  `motor`, `turnos` e `importacion`— y tres son transversales —`auditoria`,
  `notificaciones` y `almacenamiento`—. Las dependencias entre módulos van en una
  sola dirección y pasan por interfaces declaradas
  ([vista general](../vista-general.md#módulos-del-backend)). Las tareas
  programadas corren en el mismo proceso.
- **Sin microservicios.** Ninguna pieza lo justifica: el motor calcula 2.000 celdas
  en milisegundos, y el importador y el correo resuelven sus fallas con reintentos
  dentro del proceso. Los dos hablan con el exterior por adaptadores, así que se
  pueden extraer después sin tocar el dominio.
- **En capas.** Cada módulo separa tres capas: **controlador** (HTTP, validación de
  entrada, guards de autorización) → **servicio** (reglas de negocio y transacciones)
  → **acceso a datos** (Prisma). Las reglas puras —unidades, semáforo, fórmulas del
  motor— viven fuera de las capas, en `packages/shared`, y las importan tanto el
  cliente como el servidor.

```
Navegador ─ SPA React ──HTTPS──▶ API NestJS ─────────────────────────────┐
                                  │ controlador → servicio → Prisma      │
                                  │ 11 módulos · reglas en packages/shared│
                                  └───┬──────────────┬──────────────┬─────┘
                                  PostgreSQL 16     MinIO      Supabase Auth
                                  (contenedor)   (contenedor)   (nube, solo JWT)
```

### Tabla de decisión

| Área | Decisión preliminar | Requisito que la sostiene |
|---|---|---|
| **Tipo de solución** | Web responsive, móvil primero. Dos superficies —portal público y consola interna— en una sola SPA | RNF-01 |
| **Enfoque arquitectónico** | Cliente-servidor; backend como monolito modular en capas | RNF-06, RNF-13, equipo de cuatro |
| **Lenguaje** | TypeScript en cliente, servidor y reglas compartidas | RNF-13: cada regla se escribe una vez |
| **Framework o librería principal** | NestJS en la API · React con Vite en el cliente | Módulos con límites explícitos · SPA sin render en servidor |
| **Interfaz o cliente** | SPA React con TypeScript y Tailwind, implementada por el equipo a partir de mockups en Claude Design ([ADR-0009](ADR-0009-mockups-claude-design.md)). Mapa con Leaflet y OpenStreetMap, con agrupación de marcadores. Escáner de códigos con `@zxing/browser`. Cola sin conexión en IndexedDB ([ADR-0005](ADR-0005-offline-solo-movimientos.md)) | RNF-01 a RNF-03, RNF-07, presupuesto cero |
| **Backend o API** | API REST en NestJS, un módulo por límite de dominio. Autorización propia por rol y alcance, verificada en cada request ([ADR-0003](ADR-0003-rol-global-alcance-multiple.md)) | RNF-08, RNF-10 |
| **Autenticación** | Supabase Auth en la nube: emite el token y envía los correos de restablecer contraseña y verificar correo; la API valida el token contra el JWKS ([ADR-0001](ADR-0001-supabase-solo-auth.md)) | Presupuesto cero; lógica de negocio en código propio |
| **Persistencia** | SQL con el ORM Prisma y migraciones versionadas. Saldo derivado de los movimientos ([ADR-0002](ADR-0002-saldo-derivado.md)) | RNF-06, RNF-13 |
| **Motor de base de datos** | PostgreSQL 16: transacciones, restricciones `CHECK` y permisos por tabla para impedir `UPDATE` y `DELETE` sobre `movimiento` | RNF-06 |
| **Almacenamiento de archivos** | MinIO con buckets privados, acceso solo por URL firmada de expiración corta; compatible con S3 | RNF-08, RNF-09 |
| **Mapa y geocodificación** | Mosaicos de OpenStreetMap con atribución y sin descarga para uso sin conexión. Búsqueda por dirección con Nominatim, siempre desde la API, con caché y a una petición por segundo como máximo | RF-RED-002, presupuesto cero |
| **Fuentes externas de acopios** | Módulo `importacion`, un adaptador por fuente. Primera fuente: RedAcopio Bogotá, leída cada 60 minutos. Los puntos entran como referenciados, sin inventario | RF-RED-011 |
| **Tareas programadas** | `@nestjs/schedule` dentro del proceso de la API: sincronización de fuentes, vencimiento de folios, archivado de causas, alertas y reintentos de correo | Una sola instancia; sin orquestador aparte |
| **Contenerización** | Docker Compose con cinco servicios: `db`, `api`, `storage`, `web` y `proxy` | Entorno reproducible con un comando |
| **Gestión de trabajo** | GitHub Projects, en la organización del equipo ([P-007](../../01-requerimientos/pendientes.md)) | Vive junto al repositorio y los PR |
| **Herramientas de modelado y documentación** | Markdown en el repositorio, editado con Obsidian · diagramas en Mermaid ([P-008](../../01-requerimientos/pendientes.md)) | Los diagramas se versionan como texto junto al código |
| **Pruebas previstas** | Híbridas. **Automatizadas con Jest** ([P-009](../../01-requerimientos/pendientes.md)): unitarias para `packages/shared` y los servicios, de integración para la API con Supertest, y la prueba de concurrencia del inventario contra un PostgreSQL real. **Manuales:** cronómetro de registro, Lighthouse y axe-core | RNF-02, RNF-03, RNF-06, RNF-11 |
| **Despliegue previsto** | Local: Docker Compose en el equipo de cada integrante. Producción: VPS con Dokploy, que gestiona el mismo Compose con Traefik y HTTPS automático ([despliegue](../../06-operacion/despliegue.md)). Proveedor y dominio por definir ([P-005](../../01-requerimientos/pendientes.md)) | Entorno reproducible; URL estable para las invitaciones |
| **Correo transaccional** | SMTP estándar, sin SDK de un proveedor: cambiar de servidor es cambiar variables de entorno. En desarrollo, una cuenta personal de Microsoft 365 para pruebas rápidas ([P-004](../../01-requerimientos/pendientes.md)). Supabase Auth se configura con el mismo servidor, porque el suyo por defecto solo envía 2 correos por hora | Invitaciones, avisos y confirmación de turnos |

**Aceptado el 2026-09-14.** El enfoque y todas las filas de la tabla quedan
confirmados. Solo siguen por definir el proveedor del VPS y el dominio de producción
([P-005](../../01-requerimientos/pendientes.md)), que no cambian la decisión.

## Alternativas consideradas

### A. Supabase como backend completo

**Qué sería.** Sin backend propio: Supabase aporta la base de datos, una API REST
generada automáticamente, las políticas de seguridad por fila (RLS), el
almacenamiento y funciones en su nube. El cliente habla directo con Supabase.

**A favor.** Es la opción más rápida de arrancar: autenticación, API y
almacenamiento vienen resueltos, y sobran contenedores.

**Por qué se descarta.**
- **Vacía el aporte del proyecto.** El motor de emparejamiento y las transacciones
  concurrentes del inventario quedarían repartidos entre políticas RLS, funciones
  SQL y funciones en la nube de Supabase: difíciles de probar con Jest y de defender
  en la sustentación. Es la misma razón de
  [ADR-0001](ADR-0001-supabase-solo-auth.md).
- **La autorización se vuelve inauditable.** Rol global con alcance múltiple
  ([ADR-0003](ADR-0003-rol-global-alcance-multiple.md)) más la excepción del Donador
  ([ADR-0007](ADR-0007-donador-excepcion-rol.md)) tendrían que repetirse como
  políticas en cada una de las tablas, en lugar de un solo guard verificable.
- **El importador y las tareas programadas quedan fuera del repositorio**, como
  funciones en la nube del proveedor.
- **Una pausa lo tumba todo.** El plan gratuito pausa proyectos inactivos; hoy eso
  solo afecta el inicio de sesión, con todo en Supabase afectaría al sistema entero.

### B. Monolito MVC sin límites de módulo

**Qué sería.** Una sola aplicación organizada por tipo técnico —carpetas globales
de controladores, modelos y servicios— donde cualquier servicio puede llamar a
cualquier otro o leer cualquier tabla.

**A favor.** Es la estructura más simple de entender el primer día, y la guía del
curso la reconoce como suficiente para muchos proyectos.

**Por qué se descarta.**
- **Cuatro personas trabajan en paralelo.** Con carpetas compartidas, el cambio de
  una rompe el trabajo de otra; en Acopio los límites de módulo son también el
  reparto de trabajo entre integrantes.
- **Sin reglas de dependencia, el motor termina leyendo directo las tablas de
  inventario y comprobantes**, y un cambio de esquema rompe el cálculo sin que nadie
  lo note. RNF-13 exige módulos sin dependencias circulares.
- **La diferencia de costo es pequeña.** La decisión tomada conserva las capas del
  MVC —controlador, servicio, datos— dentro de cada módulo; solo agrega el límite
  por dominio, que NestJS impone casi gratis.

### C. Microservicios

**Qué sería.** Un servicio desplegable por dominio —inventario, comprobantes,
motor, identidad, notificaciones—, cada uno con su propia base o esquema,
comunicados por HTTP o por una cola de mensajes.

**A favor.** Despliegue y escalado independientes por servicio, y una falla queda
aislada en su servicio.

**Por qué se descarta.**
- **Rompe el atributo de calidad número uno.** Recibir una donación preparada
  registra entradas en el inventario y cambia el estado del comprobante en la misma
  operación; despachar una remisión valida el saldo de origen antes de registrar la
  salida. Con servicios separados, eso exige transacciones distribuidas o sagas: lo
  más difícil de hacer bien, justo donde un error produce un traslado equivocado.
- **Ningún requisito lo pide.** Una emergencia activa, decenas de puntos y un motor
  que calcula 2.000 celdas en milisegundos no necesitan escalar por partes. Elegirlo
  sería decidir por tendencia, lo que la guía del curso advierte.
- **Multiplica la operación** —red interna, trazas entre servicios, un despliegue
  por servicio— en un VPS de 4 GB y con un equipo de cuatro personas para el que
  NestJS es nuevo en el backend.
- **La puerta queda abierta.** `importacion` y `notificaciones` hablan con el
  exterior por adaptadores: si algún día hiciera falta, se extraen sin tocar el
  dominio.

## Justificación

La guía del curso señala que una arquitectura en capas, MVC o cliente-servidor
basta si está bien justificada. Esta decisión es exactamente eso —cliente-servidor,
con capas en el backend— más un único añadido, los límites de módulo por dominio,
que se justifica por el trabajo en paralelo de cuatro personas.

**Viabilidad.** Una API, una base de datos y cinco contenedores se levantan con
`docker compose up`; en producción, el mismo Compose corre en un VPS con Dokploy.
Todo el stack es gratuito o autoalojado: ninguna pieza exige pagar ni registrar una
tarjeta de crédito.

**Capacidad del equipo.** Un solo lenguaje, TypeScript, en cliente, servidor y
reglas compartidas: cualquier integrante puede leer y revisar cualquier pull
request. Prisma ya está en uso por el responsable del backend; NestJS es nuevo para
él y se trata como riesgo contenido en la matriz. A cambio, NestJS trae de fábrica la
estructura modular que de otro modo el equipo tendría que inventar y vigilar a mano.
La interfaz se diseña con mockups en Claude Design antes de programarla
([ADR-0009](ADR-0009-mockups-claude-design.md)).

**Alcance.** Los módulos coinciden con los bloques del orden de construcción y con
el reparto de personas: cada bloque agrega módulos sin reescribir los anteriores. El
vertical logístico —acopio, inventario, comprobante, motor, zona— se construye
completo, y lo que primero se recorta, el Bloque 6, sale sin tocar el núcleo.

**Requisitos y atributos de calidad.**

| Requisito o atributo | Cómo lo resuelve la arquitectura |
|---|---|
| Integridad — RNF-06 | Una sola base PostgreSQL: transacción local con bloqueo de fila, restricciones `CHECK` y permisos que impiden editar o borrar movimientos |
| Usabilidad en terreno — RNF-01, RNF-02 | SPA móvil primero, revisada en mockups antes de programarse; un registro es una sola petición a una API sin saltos entre servicios |
| Disponibilidad degradada — RNF-07 | Cola local en el navegador para los movimientos; la API valida el token con las llaves públicas de Supabase, así que las sesiones activas siguen si Supabase cae |
| Seguridad — RNF-08 | Autorización centralizada en la API, contra la base, en cada request; MinIO nunca se expone |
| Privacidad — RNF-09 | Facturas y datos operativos en contenedores propios; en Supabase solo quedan correos y credenciales, con aviso de transferencia internacional |
| Motor — RF-MOT | Módulo propio con reglas puras en `packages/shared`, que se prueban sin base de datos |
| Fuentes externas — RF-RED-011 | Importador aislado en un adaptador: si la fuente cambia de formato, falla un adaptador, no el mapa |
| Mantenibilidad — RNF-13 | Módulos con dependencias en un solo sentido, reglas escritas una vez y pruebas con Jest en cada capa |

## Consecuencias positivas

- **La integridad vive en un solo lugar.** Todas las operaciones que tocan saldo son
  transacciones locales de una sola base de datos, sin coordinación entre servicios.
- **El aporte original queda en código propio**, probado con Jest y defendible en la
  sustentación: el motor, las transacciones del inventario y la autorización.
- **Cuatro personas trabajan en paralelo sin pisarse**, porque cada módulo tiene
  dueño y sus dependencias van en un solo sentido.
- **Un solo lenguaje de punta a punta**, con las reglas de negocio escritas una sola
  vez y compartidas por cliente y servidor.
- **El mismo Compose va de desarrollo a producción**: lo que corre en el equipo de un
  integrante es lo que corre en el VPS.
- **Costo cero** durante todo el semestre.
- **Cambiar de proveedor no obliga a reescribir.** El correo es SMTP estándar, MinIO
  es compatible con S3 y cada fuente externa es un adaptador; si alguna pieza tuviera
  que separarse más adelante, sale sin tocar el dominio.
- **Las decisiones de detalle ya están registradas** en los ADR-0001 a 0009: cada
  pieza del stack tiene su porqué escrito.

## Consecuencias, riesgos y limitaciones

### Matriz de riesgos técnicos y arquitectónicos

| ID | Riesgo técnico o arquitectónico | Impacto | Probabilidad | Estrategia inicial |
|---|---|:-:|:-:|---|
| **RTA-01** | NestJS es nuevo para el responsable del backend, que sí domina Prisma. Una curva de aprendizaje mal medida retrasa el Bloque 0, del que depende todo lo demás | Medio | Media | **Riesgo contenido · investigar.** Lo asume quien lleva el backend. Spike en la primera semana del Sprint 1: un módulo completo controlador → servicio → Prisma, más el guard que valida el token de Supabase. El Sprint 1 se limita al Bloque 0 |
| **RTA-02** | Dos operadores registran a la vez en el mismo acopio y el saldo queda negativo o incorrecto. Es un error silencioso que el motor convertiría en un traslado equivocado | Alto | Media | **Mitigar.** Transacción con bloqueo de fila sobre el saldo, restricción `CHECK` de saldo no negativo y permisos que impiden editar movimientos. Prueba de integración con Jest que lanza transacciones simultáneas contra un PostgreSQL real; el Bloque 2 no se cierra sin ella |
| **RTA-03** | El plan gratuito de Supabase pausa el proyecto por inactividad, o el servicio cae, y nadie puede iniciar sesión, justo el día de una demostración | Alto | Media | **Mitigar.** Verificación del proyecto 72 horas antes de toda demostración ([runbook](../../06-operacion/runbook.md)). Sesiones largas con renovación y llaves públicas en caché, para que las sesiones activas sigan operando. Mensaje explícito en lugar de un error genérico (RNF-07) |
| **RTA-04** | El SMTP de la cuenta personal de Microsoft 365 exige OAuth o deja de aceptar usuario y contraseña (Microsoft lo retira en Exchange Online a fines de diciembre de 2026). Sin correo no hay invitaciones, restablecimiento de contraseña ni confirmación de turnos | Medio | Media | **Investigar.** En el spike del Sprint 1 se envía un correo de prueba desde la API y desde Supabase. Si falla, se cambia de servidor SMTP: al no usar SDK de proveedor, es cambiar variables de entorno. El remitente de producción se fija antes del primer despliegue ([I-004](../../00-contexto/investigaciones.md)) |
| **RTA-05** | El importador de RedAcopio se rompe cuando esa aplicación cambia su HTML, o su operador objeta el uso de los datos: la fuente no tiene API pública ni licencia de reutilización | Medio | Alta | **Mitigar.** Prueba automática contra una copia guardada de su HTML; aborto completo sin tocar los últimos datos buenos, con aviso al Administrador; User-Agent identificable, una lectura por hora y atribución visible; carga por CSV como respaldo. Se escribe al operador para pedir autorización o un endpoint ([P-022](../../01-requerimientos/pendientes.md)). Si falla, solo se pierden los puntos referenciados; los operados siguen |
| **RTA-06** | El modo sin conexión —cola local y sincronización— consume el tiempo que necesita el motor, que es el aporte original | Alto | Media | **Simplificar.** Solo cubre el registro de movimientos, que nunca se editan ([ADR-0005](ADR-0005-offline-solo-movimientos.md)). Vive en el Bloque 6, lo primero que se recorta si el calendario aprieta |
| **RTA-07** | La canasta estándar y la población por zona salen de fuentes usadas solo como referencia (Manual Esfera, DANE), y faltan valores para varias categorías ([P-001, P-002](../../01-requerimientos/pendientes.md)). Un número sin respaldo deja el cálculo de déficit sin defensa | Medio | Alta | **Mitigar.** Canasta y población configurables por el Administrador, con fuente obligatoria en cada valor (`canasta_estandar.fuente`, `zona.poblacion_fuente`). Cada sugerencia del motor muestra qué fuente usó. El motor se evalúa con datos sintéticos (RF-MOT-010) |
| **RTA-08** | Implementar a mano cada pantalla a partir de los mockups toma más tiempo del previsto, y la interfaz se atrasa frente a la API | Medio | Media | **Mitigar.** Componentes base construidos en el Bloque 0 a partir del [sistema de diseño](../../03-diseno/sistema-diseno.md); cada pantalla se revisa contra su lienzo. Si el tiempo aprieta, se simplifican primero las pantallas públicas secundarias, nunca la entrada rápida ([ADR-0009](ADR-0009-mockups-claude-design.md)) |

### Limitaciones aceptadas

- **Un solo proceso de backend.** Si la API cae, caen el portal y la consola a la
  vez. A esta escala se acepta: Dokploy reinicia el contenedor y los datos no se
  pierden.
- **Sin internet no se inicia sesión.** Las sesiones activas y la captura sin
  conexión siguen operando ([ADR-0001](ADR-0001-supabase-solo-auth.md)).
- **Sin render en servidor**, la portada indexa peor en buscadores. Se compensa con
  metadatos Open Graph para WhatsApp, el canal real de difusión
  ([ADR-0009](ADR-0009-mockups-claude-design.md)).
- **Las tareas programadas suponen una sola instancia de la API.** Con dos, cada
  tarea necesitaría un bloqueo en la base.
- **Dependencia de servicios gratuitos** —mosaicos de OpenStreetMap, Nominatim,
  Supabase— cuyas políticas de uso pueden cambiar ([I-004](../../00-contexto/investigaciones.md)).

### Qué se valida durante el Sprint 1

1. Spike de NestJS con Prisma y el guard que valida el token de Supabase — RTA-01
2. Envío de correo con la cuenta de Microsoft 365, desde la API y desde Supabase — RTA-04
3. El Docker Compose completo levanta en el equipo de los cuatro integrantes
4. Lectura del JSON de RedAcopio contra una copia guardada, con la prueba que detecta
   un cambio de formato — RTA-05
5. Esqueleto de la prueba de concurrencia contra PostgreSQL en contenedor — RTA-02
6. Elección del proveedor del VPS y del dominio de producción — P-005

