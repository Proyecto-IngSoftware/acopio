---
title: "Patrones y prácticas de código"
type: arquitectura
tags: [arquitectura, patrones, buenas-practicas]
estado: vigente
actualizado: 2026-10-09
---

# Patrones y prácticas de código

Esta nota reúne los patrones de diseño que usa el código, los que se descartaron y por qué, las prácticas que se repiten en la API y en la web, y un catálogo de lo que ya existe para reutilizar. Antes de crear un archivo, una clase o una función, se busca aquí si ya hay algo que sirva.

Los patrones no se eligieron por adelantado. La arquitectura sí ([ADR-0008](adr/ADR-0008-arquitectura-stack-inicial.md): cliente-servidor y un monolito modular en capas); los patrones fueron entrando cuando un requerimiento los pidió. Una abstracción nueva necesita un segundo caso real que la use.

## Patrones en uso

| Patrón | Dónde | Por qué existe | Cuándo se repite |
|---|---|---|---|
| Monolito modular en capas | `apps/api/src/modulos/*`: controlador, servicio y DAO en cada módulo | Un solo despliegue para un equipo de cuatro, con límites de dominio que se pueden revisar ([ADR-0008](adr/ADR-0008-arquitectura-stack-inicial.md)) | Cada módulo nuevo sigue la misma forma y entra en la tabla «Dependencias permitidas» de [vista-general.md](vista-general.md) y en `apps/api/.dependency-cruiser.cjs` |
| DAO sobre Prisma ([ADR-0019](adr/ADR-0019-dao-sobre-prisma.md)) | `modulos/<módulo>/dao/*.dao.ts`: `MovimientoDao`, `SaldoDao`, `UmbralDao` y `NoRecibirDao` en `inventario`; `ComprobanteDao` en `comprobantes`; `SugerenciaDao`, `RemisionDao`, `NecesidadDao` y `ConfiguracionDao` en `motor`; `CategoriaDao` y `CodigoBarrasDao` en `catalogo`; `AcopioDao` y `ZonaDao` en `acopios`; `UsuarioDao` y `SaludDao` | El servicio guarda las reglas de negocio y el DAO las consultas. Cada método recibe la `tx` de quien llama, así la bitácora y el candado del saldo siguen en la misma transacción | Toda consulta nueva en un módulo migrado (`MIGRADOS_A_DAO` en `.dependency-cruiser.cjs`) va en su DAO. Al tocar un módulo sin migrar, se migra entero |
| Unidad de trabajo | `Transacciones.ejecutar` en `comun/prisma/transacciones.ts` | El servicio decide qué operaciones van juntas sin tocar Prisma | Toda operación que escriba en más de una tabla o registre bitácora |
| Factory Method | `fabricarProveedorIdentidad` en `modulos/identidad/proveedor/fabrica-proveedor.ts`, con `useFactory` en `identidad.module.ts` | El adaptador de identidad se elige con `AUTH_PROVEEDOR` en un solo lugar | Cuando un puerto tenga dos implementaciones reales que se elijan por configuración |
| Singleton por el contenedor | `ENTORNO` (`config/config.module.ts`, `leerEntorno()` una vez) y `PrismaService` | El entorno se valida al arrancar y toda la API comparte un pool de conexiones | Todo proveedor de Nest es una sola instancia por defecto; nada se construye con `new` fuera de las pruebas |
| Proxy | `GeocodificacionService` en `modulos/acopios/geocodificacion.ts`, delante del puerto `GEOCODIFICADOR` | El endpoint de geocodificación es público y Nominatim pide una consulta por segundo como máximo: el proxy guarda en caché 24 horas, pone las consultas en una cola con tope y hace que las iguales que llegan juntas compartan una llamada | Cuando un servicio externo tenga cuota o sea lento y se consulte desde un endpoint público |
| Fachada | `AlmacenamientoService`: `guardarImagen` y `urlFirmada` | Quien guarda una foto no sabe de sharp, miniaturas ni S3 | Cuando un servicio externo pida varios pasos para una sola operación del dominio |
| Cadena de responsabilidad | Guards globales en `app.module.ts`: `OrigenGuard`, `LimiteIntentosGuard`, `AutenticacionGuard`; luego el pipe de validación y `FiltroErrores` | Cada revisión de la petición es independiente y puede cortarla | Una revisión nueva que aplique a toda petición es un guard más en ese arreglo, en el lugar que le toca |
| Puertos y adaptadores (estrategia elegida por inyección de dependencias) | `ProveedorIdentidad` con `local` y `supabase`; el almacén de archivos (`almacen.ts`) con `almacen-s3.ts` para Garage ([ADR-0012](adr/ADR-0012-almacenamiento-garage.md)) y `almacen-memoria.ts`; geocodificación con Nominatim y un adaptador falso en las pruebas | Cambiar un servicio externo sin tocar el dominio y probar sin red | Cuando un servicio externo tiene dos implementaciones reales, o una real y una de prueba. `importacion` llevará un adaptador por fuente |
| Inversión de dependencias | `VerificadorUbicaciones` en `comun/ubicaciones`, que implementa `acopios` y usa `identidad` | Rompe el ciclo entre `identidad` y `acopios` | Cuando dos módulos se necesitan entre sí: el contrato va a `comun/` y lo implementa el módulo que tiene los datos |
| Registro de solo inserción con saldo derivado | `movimiento` y la tabla `saldo`, que mantiene un disparador ([ADR-0002](adr/ADR-0002-saldo-derivado.md), [ADR-0015](adr/ADR-0015-saldo-en-tabla-por-disparador.md), [ADR-0018](adr/ADR-0018-movimientos-de-zona.md)) | El inventario se puede auditar y nunca queda negativo | Todo cambio de existencias es un movimiento nuevo; nada actualiza un saldo a mano |
| Bandeja de salida transaccional | La cola `correo_saliente`: `NotificacionService.encolar` dentro de la transacción y un `@Cron` que envía cada minuto | Un correo no sale si la operación se revierte, y no se pierde si el servidor de correo falla | Cualquier efecto hacia afuera (correo, en el futuro push) que dependa de una operación |
| Bitácora en la misma transacción | `BitacoraService.registrar(tx, …)` desde cada servicio, con los datos de antes y después | Un interceptor no ve el estado anterior ni comparte la transacción | Toda escritura que cambie estado de negocio |
| Decoradores y guards | `@Publico()`, `@Roles()`, `@TambienDonador()`, `@UsuarioActual()`, `OrigenGuard`, `LimiteIntentosGuard` | La autorización se declara en el endpoint y no se repite en cada servicio | Endpoints nuevos: se exige sesión salvo `@Publico()` y se restringe con `@Roles()` |
| Cliente tipado desde el contrato | `apps/web/src/api/esquema.d.ts`, generado del OpenAPI, y `api` en `api/cliente.ts` | La web no puede llamar un endpoint con una forma que la API no acepta | Al cambiar un endpoint se regeneran el contrato (`openapi`) y los tipos (`api:tipos`) |
| Adaptador de sesión en la web | `ClienteAuth` en `apps/web/src/sesion/`, con `clienteFalso` en las pruebas | La web nunca ve el token ([ADR-0014](adr/ADR-0014-sesion-en-cookie.md)) y las pruebas no tocan la API | Toda pantalla obtiene la sesión con `useSesion()` |
| Observador en la caché de la web | TanStack Query: los componentes se suscriben a una consulta y se vuelven a pintar cuando cambia | Varias pantallas leen el mismo dato sin pedirlo dos veces | Un dato nuevo de la API se expone como un hook `useAlgo` en `apps/web/src/api/` |

## Patrones para aplicar más adelante

Patrones que todavía no están en el código pero tienen un lugar claro en lo que falta
construir. Cada fila dice qué lo dispara: mientras eso no pase, el patrón sería
indirección sin uso. Al aplicar uno, su fila pasa a «Patrones en uso».

| Patrón | Dónde encaja | Cuándo aplicarlo | Qué se reutiliza |
|---|---|---|---|
| State (tabla de transiciones) | Los ciclos de vida del esquema: `EstadoComprobante` (cinco estados), `EstadoRemision` (`BORRADOR`, `EN_TRANSITO`, `RECIBIDA`, `CANCELADA`), `EstadoZona` y, con el Bloque 5, las reservas de turnos. Hoy hay 15 comparaciones `estado !== '…'` repartidas en los servicios | Con las remisiones de la etapa 2 del motor (#46): será el segundo ciclo de vida con acciones del usuario, y repetir las comparaciones a mano en dos módulos ya cuesta más que una tabla | Una tabla `TRANSICIONES` por entidad en `packages/shared` y una función que diga si una acción vale desde un estado. La API la usa antes del `cambiarSiEstado` del DAO y la web para mostrar u ocultar botones. El error sigue siendo `estadoInvalido` de `comprobantes/vistas.ts`, llevado a `comun/` |
| Builder | La remisión de la etapa 2: un borrador al que se agregan, cambian y quitan líneas, y que se valida contra el saldo de cada categoría antes de despachar. También los datos de las pruebas de integración, que hoy arman donaciones y movimientos campo por campo | Cuando un objeto se arme en varios pasos opcionales y cada paso tenga su validación. `RemisionesBorradorService` del motor es el primer candidato | El `ClienteBd` y los DAO: el builder acumula y valida, y al final un solo método del DAO escribe todo en la transacción |
| Template Method | El importador de la pieza E (#49): RedAcopio y la carga por CSV hacen lo mismo en el mismo orden (leer, validar, normalizar, descartar duplicados, guardar con bitácora) y solo difieren en cómo leen y normalizan cada fila | Al construir el segundo origen del importador. Con uno solo, el método plantilla no tiene qué variar | El adaptador por fuente que ya prevé «Puertos y adaptadores» para `importacion`; la plantilla ordena los pasos y cada adaptador implementa los suyos. Para geocodificar las direcciones importadas, `GeocodificacionService` (el Proxy de arriba), que ya respeta el límite de Nominatim |
| Command | La cola sin conexión de la web (`apps/web/src/sin-conexion/cola.ts`). Hoy guarda solo entradas de inventario, cada una con su `id` para que el reintento no la duplique | Cuando el Bloque 6 permita encolar otras operaciones sin red, como salidas o recepciones: cada una sería un comando con su tipo, sus datos y cómo se envía | El `id` generado en el cliente y la idempotencia que ya hace la API con él (`MovimientosService.entrada`) |
| Observer (eventos de dominio en la API) | Ver «Patrones descartados por ahora»: avisos al recibir o conciliar, turnos y remisiones | Cuando varias reacciones de módulos distintos dependan del mismo cambio | La bandeja de salida (`correo_saliente`) y la `tx` compartida: los eventos serían síncronos y dentro de la transacción |

## Patrones descartados por ahora

Eventos de dominio u Observer en la API. Hoy, cuando cambia una donación, el servicio escribe la bitácora y, solo al rechazarla, encola un correo: un único efecto no justifica la indirección. Además, `@nestjs/event-emitter` no comparte la transacción con los listeners y pierde los errores de los asíncronos, cosa que la bandeja de salida evita. Se reconsidera cuando varias reacciones de módulos distintos dependan del mismo cambio (avisos al recibir o conciliar, turnos, remisiones de la etapa 2), y sobre todo si alguna obligaría a romper la tabla de dependencias. Llegado ese caso, los eventos serían síncronos, recibirían la `tx` y se despacharían dentro de la transacción.

Repositorio genérico (`Repositorio<T>` con `buscar`, `crear`, `actualizar`). Las consultas del proyecto no son CRUD: los saldos solo se leen y los movimientos no se actualizan. Los DAO del [ADR-0019](adr/ADR-0019-dao-sobre-prisma.md) tienen métodos con nombre de negocio.

Interceptor para la bitácora. Se descartó porque no conoce el estado anterior ni la transacción del servicio.

## Prácticas

En la API:

- Una regla de negocio incumplida lanza `ErrorDominio(codigo, mensaje, estado?)`. `FiltroErrores` la convierte en `{ estado, codigo, mensaje }`, el único formato de error.
- Las funciones que escriben reciben un `ClienteBd` (la conexión o una transacción abierta) para poder componerse dentro de otra transacción.
- Antes de una salida, un ajuste o cualquier operación que no deba correr dos veces en paralelo, se toma `pg_advisory_xact_lock(hashtextextended(…, 0))` con una clave que diga qué se protege (acopio y categoría, usuario, motor). `SELECT … FOR UPDATE` no sirve porque `acopio_app` no tiene `UPDATE` sobre `saldo`.
- Las cantidades se validan con `cantidadPositiva` o `cantidadNoNegativa`: tres decimales, como `numeric(12,3)`.
- Las respuestas se describen en `comun/respuestas.ts` para el contrato OpenAPI. Una respuesta nueva se agrega ahí.
- Las fórmulas puras (motor, horario, semáforo, distancias) van a `packages/shared` para que la web y la API calculen igual.
- Las tareas programadas no se registran con `NODE_ENV=test`; las pruebas llaman al método.

En la web:

- Un componente que se usa en más de una pantalla va a `apps/web/src/componentes/`. Uno que solo usa una pantalla se queda junto a ella.
- Cada recurso de la API tiene su archivo en `apps/web/src/api/` con sus tipos y sus hooks `useAlgo`. Las pantallas no llaman a `fetch` ni a `api` directamente.
- Colores solo desde `packages/ui-tokens` ([ADR-0013](adr/ADR-0013-estetica-desde-stitch.md)); íconos de Material Symbols, y tras usar uno nuevo se corre `node scripts/iconos.mjs`.
- Ninguna pantalla se escribe sin la maqueta aprobada en `docs/03-diseno/stitch/`.
- Las pruebas usan `envolver` y `responderSegun` de `src/pruebas/utilidades.tsx`; una petición sin simular falla como sin red.

En todo el repositorio:

- Los nombres salen del [glosario](../00-contexto/glosario.md) y van en español.
- Un comentario explica por qué, no qué hace la línea. Si un número o una regla viene de un requerimiento, se cita (`RNF-08`, `O-12`).
- Una abstracción, un helper o un componente compartido se crea cuando hay un segundo uso real, no antes. El bloqueo consultivo, por ejemplo, se escribe en una línea en cada servicio y todavía no tiene helper.

## Catálogo de lo reutilizable

Cada sección lista lo que hay, por archivo. Cuando se agrega una pieza reutilizable, se anota aquí en la misma sesión.

### API

| Archivo en `apps/api/src/comun/` | Qué ofrece |
|---|---|
| `autorizacion/decoradores.ts` | `Publico`, `Roles`, `TambienDonador`, `UsuarioActual` |
| `autorizacion/usuario-autenticado.ts` | Tipo `UsuarioAutenticado` que entrega `@UsuarioActual()` |
| `cookie-sesion.ts` | `COOKIE_SESION`, `leerCookie`, `opcionesCookie` |
| `errores/error-dominio.ts` | `ErrorDominio` para reglas de negocio incumplidas |
| `errores/filtro-errores.ts` | `FiltroErrores` y el tipo `RespuestaError` |
| `limite-intentos.guard.ts` | `LimiteIntentosGuard`, límite por IP que las pruebas pueden reemplazar |
| `origen.guard.ts` | `OrigenGuard`, rechaza escrituras con cookie desde otro `Origin` |
| `prisma/cliente-bd.ts` | Tipo `ClienteBd`: conexión o transacción |
| `prisma/errores.ts` | `esLlaveDuplicada` |
| `prisma/errores-prisma.ts` | `restriccionUnicaViolada` |
| `prisma/prisma.module.ts`, `prisma/prisma.service.ts` | `PrismaModule`, `PrismaService`. En un módulo migrado solo lo inyectan los DAO |
| `prisma/transacciones.ts` | `Transacciones.ejecutar(trabajo, opciones)`: abre la transacción que comparten los DAO, la bitácora y la cola de correo |
| `respuestas.ts` | DTO de respuesta para el contrato (`ComprobanteDto`, `SaldoDto`, `AcopioDto`…) |
| `ubicaciones/verificador-ubicaciones.ts` | Puerto `VerificadorUbicaciones` y su token |
| `validacion/cantidades.ts` | `cantidadPositiva`, `cantidadNoNegativa` (zod) |

DAO que otros módulos usan: `CategoriaDao` y `CodigoBarrasDao` (`catalogo/dao/`), `MovimientoDao`, `NoRecibirDao` y `SaldoDao` con `candadoSaldo` (`inventario/dao/`), `AcopioDao` (`acopios/dao/`) y `UsuarioDao` (`identidad/dao/`).

Servicios de otros módulos que se usan desde cualquier parte: `BitacoraService.registrar(tx, evento)` en `auditoria` y `NotificacionService.encolar(tx, destinatario, correo)` en `notificaciones`, con las plantillas de `notificaciones/plantillas.ts`.

### Compartido

| Archivo en `packages/shared/src/` | Qué ofrece |
|---|---|
| `formato.ts` | `formatearNumero`, `formatearCantidad` |
| `unidades.ts` | `UnidadBase`, `SIMBOLO_UNIDAD` |
| `distancia.ts` | `distanciaKm` entre dos `Punto` |
| `horario.ts` | `Horario`, `erroresHorario`, `abiertoAhora`, `tramoActual`, `diaEnBogota` |
| `inventario.ts` | `semaforo`, `vencimientoEstimado` |
| `motor/calculo.ts` | `necesidad`, `estadoZona`, `estadoAcopio`, `urgencia`, `puntaje`, `pesosValidos` y las constantes del motor |
| `motor/emparejar.ts` | `emparejar`, `clavePar` |
| `motor/justificar.ts` | `justificar`, el texto de cada sugerencia |
| `motor/remision.ts` | `TRANSICIONES_REMISION`, `puedeRemision`, `estadoTras`, `MAXIMO_EVIDENCIAS`: el ciclo de vida de la remisión para la API y la web |
| `motor/simulador.ts` | `simular` y `generador` (semilla): el escenario repartido por el motor, en partes iguales y al más cercano (RF-MOT-010) |
| `index.ts`, `motor/index.ts` | Reexportan lo anterior |

### Web

| Archivo en `apps/web/src/` | Qué ofrece |
|---|---|
| `componentes/Boton.tsx` | `Boton`, `EnlaceBoton` |
| `componentes/Campo.tsx` | `Campo`, `Selector` |
| `componentes/EditorHorario.tsx` | `EditorHorario` |
| `componentes/Esqueleto.tsx` | `Esqueleto` mientras carga |
| `componentes/EstadoError.tsx`, `componentes/EstadoVacio.tsx` | `EstadoError`, `EstadoVacio` |
| `componentes/EtiquetaEstado.tsx` | `EtiquetaEstado` |
| `componentes/EtiquetaSemaforo.tsx` | `EtiquetaSemaforo`, `ORDEN_URGENCIA` |
| `componentes/Hoja.tsx` | `Hoja`, panel inferior |
| `componentes/Icono.tsx` | `Icono` de Material Symbols |
| `componentes/Menu.tsx` | `SeccionMenu`, `FilaMenu` |
| `componentes/Pildora.tsx`, `componentes/Segmentado.tsx` | `Pildora`, `Segmentado` |
| `componentes/SubirAlNavegar.tsx` | `SubirAlNavegar` |
| `componentes/TarjetaNoTraigan.tsx` | `TarjetaNoTraigan` |
| `componentes/mapa/MapaLeaflet.tsx`, `componentes/mapa/MapaConPin.tsx`, `componentes/mapa/BuscadorDireccion.tsx` | Mapa base, mapa con pin y buscador de direcciones |
| `api/cliente.ts` | `api`, `desenvolver`, `ErrorApi`, `reintentarConsulta`, `alPerderSesion` |
| `api/*.ts` | Tipos y hooks por recurso (`useSaldos`, `useBandeja`, `useAcopio`…) |
| `formato.ts` | `diaLargo`, `haceCuanto`, `fechaHora` |
| `sesion/Sesion.tsx` | `SesionProveedor`, `useSesion` |
| `sesion/roles.ts` | `nombreRol`, `iniciales` |
| `sesion/ubicacion-activa.ts` | `useUbicacionActiva` |
| `sesion/useSalida.tsx` | `useSalida`, cerrar sesión con la cola sin enviar |
| `consola/RequiereRol.tsx` | `RequiereRol` para las rutas de `/consola` |
| `pruebas/utilidades.tsx` | `envolver`, `clienteFalso`, `responderSegun`, `responderJson`, `conEstado`, `responderError`, `peticiones`, `cuerpoDe` |
| `pruebas/accesibilidad.ts` | `violacionesGraves` |
| `pruebas/datos-red.ts` | `acopioDePrueba` |
| `pruebas/preparar.ts` | Hace fallar como sin red toda petición no simulada |

## Cómo se mantiene

El repositorio trae dos hooks de Claude Code en `.claude/settings.json`, con el script `.claude/hooks/reutilizar.mjs`. Ninguno bloquea; los dos le agregan contexto a Claude.

Antes de crear un archivo en `apps/*/src` o `packages/*/src`, el primero busca en el repositorio los nombres que el archivo exporta y avisa si alguno ya existe, con la ruta y la línea. También le pasa la sección de este catálogo que corresponde a la zona.

Después de escribir en `comun/`, `packages/shared/src`, `componentes/` o `pruebas/`, el segundo revisa si esta nota nombra el archivo y, si no, pide agregarlo al catálogo.

El hook lee las secciones del catálogo por su título (`### API`, `### Compartido`, `### Web`). Si se renombran, hay que cambiar también `ZONAS` en el script.
