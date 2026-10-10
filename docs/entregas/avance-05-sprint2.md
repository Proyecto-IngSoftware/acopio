---
title: "Sprint 2 — borrador del registro y reunión del 9 de octubre"
type: entrega
tags: [entrega, is1, sprint-2]
estado: borrador
actualizado: 2026-10-09
---

# Sprint 2 — borrador del registro y reunión del 9 de octubre

La consigna llegó el 9 de octubre: [Avance de Proyecto 5](../talleres/Avance%20de%20Proyecto%205%20–%20IS1.pdf),
«Sprint 2: interfaz funcional y aplicación de patrones de diseño». El Sprint 2 va de la
semana 10 a la 12 y la sustentación del segundo corte es el viernes 23 de octubre. Esta
nota junta lo que pide la guía, la agenda de la reunión del 9, el borrador del Planning
y las tablas del seguimiento y de la Review, con el formato del
[Avance 4](avance-04-sprint1.md).

## Qué pide la guía

El avance no se califica solo: es evidencia para la sustentación del 23 de octubre, en
la que basta con mostrar el proyecto en ejecución y el diagrama de paquetes del Avance 4.
Se entrega actualizando el mismo documento de OneDrive, sin crear uno nuevo.

| Parte | Qué lleva | Dónde está |
|---|---|---|
| Incremento | API con base de datos, Docker Compose reproducible con volumen, variables de entorno sin credenciales en el repositorio, manejo de errores y validaciones | Ya está desde el Sprint 1 |
| Colaboración | Commits, ramas, pull requests y revisión de cambios en GitHub | Desde el 9 de octubre, cada cambio va en una rama con PR revisado y fusionado por Joseph ([P-051](../01-requerimientos/pendientes.md)) |
| Pantallas | Una o dos pantallas conectadas a la API, con datos reales, mensajes de confirmación, validación o error y un flujo completo. En el documento, capturas, explicación del flujo e historias relacionadas | Hay muchas más. Falta elegir cuáles se documentan |
| DAO | Obligatorio: DAOs por entidad, usados desde los servicios, sin acceso a datos en controladores ni en la interfaz. Un ORM no basta | [ADR-0019](../02-arquitectura/adr/ADR-0019-dao-sobre-prisma.md): `inventario` y `comprobantes` migrados, con su regla en dependency-cruiser ([#59](https://github.com/Proyecto-IngSoftware/acopio/issues/59)) |
| DTO | Si aplica: qué transporta, en qué flujo y en qué se diferencia de la entidad persistida. Si no aplica, una justificación | [Sección DTO](#dto) |
| Patrones | Al menos dos creacionales, dos estructurales y uno de comportamiento (el texto de la guía dice dos), cada uno con código, problema que resuelve, beneficio y complejidad | [Sección de patrones](#patrones-de-diseño): dos creacionales, dos estructurales y tres de comportamiento ([#59](https://github.com/Proyecto-IngSoftware/acopio/issues/59)) |
| Planning | Sprint Goal, historias con sus criterios, tareas técnicas, responsables, riesgos y Definition of Done, con captura del tablero del Sprint 2 | [Borrador abajo](#borrador-del-sprint-planning) |
| Daily Scrum | Al menos un seguimiento con captura y la tabla por integrante | [Abajo](#seguimientos-del-sprint-2) |
| Review y retrospectiva | Evidencia (video, capturas de Postman o de contenedores), tabla por historia y retrospectiva en párrafos que termina en una acción concreta y verificable | [Abajo](#sprint-review) |
| Entrega | Enlace al repositorio público, explicación de los patrones y registro del Sprint 2 en el documento de OneDrive | Se arma en la semana 12 |

## Patrones de diseño

Borrador de la sección del documento. Cada patrón tiene código que se puede abrir; las
rutas son de `apps/api/src/` salvo que digan otra cosa. El detalle de cada uno y cuándo
se repite está en [patrones y prácticas](../02-arquitectura/patrones-y-practicas.md).

### DAO

El acceso a datos pasa por DAO ([ADR-0019](../02-arquitectura/adr/ADR-0019-dao-sobre-prisma.md)).
Cada tabla o agregado tiene uno en `modulos/<módulo>/dao/`: `ComprobanteDao`,
`MovimientoDao`, `SaldoDao`, `UmbralDao`, `NoRecibirDao`, `CategoriaDao`, entre otros.
Los servicios los usan y abren la transacción con `Transacciones.ejecutar`; los
controladores no los ven. Por dentro usan Prisma, pero en `inventario`, `comprobantes` y
`salud` ningún otro archivo lo toca, y dependency-cruiser lo revisa en cada PR.

- Beneficio: el servicio de recepción, por ejemplo, se lee como reglas de negocio (qué
  líneas se confirman, cuándo se rechaza) sin consultas en medio. Una consulta se cambia
  en un solo lugar.
- Complejidad: una capa más, y cada consulta nueva pide un método en el DAO. La
  transacción viaja como parámetro para que la bitácora quede en la misma.

### DTO

Sí aplica. Hay dos clases de DTO, todas con `createZodDto`, que valida y además genera el
contrato OpenAPI del que la web saca sus tipos:

- De entrada, en cada controlador: `CrearDonacionDto` lleva el acopio y las líneas
  (categoría, código de barras, cantidad, vencimiento) cuando el Donador prepara una
  donación; `RecibirDto` lleva lo que el Operador confirma de cada línea al recibir.
- De respuesta, en `comun/respuestas.ts` (51 clases): `ComprobanteDto` es lo que la web
  muestra de una donación.

Se diferencian de la entidad persistida en lo que dejan fuera y en la forma.
`ComprobanteDto` no trae el donador, las claves de la factura en Garage ni quién la
verificó; trae el nombre del acopio y de cada categoría en vez de sus identificadores, y
`tieneFactura` en vez de la clave. Los nombres van en camelCase y las cantidades como
números, no como `Decimal`.

### Creacionales

| Patrón | Dónde | Problema que resuelve | Beneficio | Complejidad |
|---|---|---|---|---|
| Factory Method | `fabricarProveedorIdentidad` en `modulos/identidad/proveedor/fabrica-proveedor.ts`, registrada con `useFactory` en `identidad.module.ts` | La API autentica con un proveedor local en desarrollo y con Supabase en producción. Quien inicia sesión o verifica un token no debe saber cuál | Cambiar de proveedor es cambiar `AUTH_PROVEEDOR`. Ningún servicio tiene un `if` por proveedor | Los dos adaptadores se construyen aunque se use uno. La elección vive en la configuración del módulo, lejos de quien la usa |
| Singleton | `ENTORNO` en `config/config.module.ts`, que lee y valida las variables una sola vez con `leerEntorno()`; `PrismaService`, una sola conexión con su pool para toda la API | Validar el entorno en cada uso sería lento, y abrir un cliente de base por servicio agotaría las conexiones | Una variable inválida detiene el arranque; todos comparten el mismo pool | Es el contenedor de Nest el que garantiza una sola instancia (alcance por defecto), no la clase. Un `new PrismaService()` a mano lo rompería |

### Estructurales

| Patrón | Dónde | Problema que resuelve | Beneficio | Complejidad |
|---|---|---|---|---|
| Adapter | `ProveedorLocal` y `ProveedorSupabase` frente al puerto `ProveedorIdentidad`; `AlmacenS3` y `AlmacenMemoria` frente a `Almacen`; el geocodificador de Nominatim | Supabase, el SDK de S3 y Nominatim tienen interfaces propias. El dominio necesita una sola, en español y con sus tipos | Las pruebas usan el almacén en memoria y el geocodificador falso, sin red. Cambiar de proveedor no toca el dominio | Una interfaz y un archivo por servicio externo, y el adaptador hay que mantenerlo cuando cambia el SDK |
| Facade | `AlmacenamientoService` en `modulos/almacenamiento/` | Guardar la foto de una factura exige convertirla a WebP, hacer la miniatura, subir las dos, borrar la primera si falla la segunda y firmar URLs | `FacturasService` llama a `guardarImagen` y a `urlFirmada` y no sabe nada de sharp ni de S3 | Si alguien necesita algo que la fachada no ofrece, tiene que ampliarla en vez de ir al almacén directamente |

### De comportamiento

| Patrón | Dónde | Problema que resuelve | Beneficio | Complejidad |
|---|---|---|---|---|
| Chain of Responsibility | Los guards globales de `app.module.ts`: `OrigenGuard`, luego `LimiteIntentosGuard`, luego `AutenticacionGuard`. Después, el pipe de validación y el filtro de errores | Cada petición pasa por varias revisiones independientes: origen de las escrituras con cookie, límite de intentos, sesión y rol | Cada eslabón decide si deja pasar o corta con su error. Agregar una revisión es agregar un guard, sin tocar los demás | El orden importa y está en un solo arreglo. Un error en un eslabón corta la cadena y puede esconder lo que habrían dicho los siguientes |
| Strategy | El mismo puerto `ProveedorIdentidad` usado por `SesionService` e `InvitacionesService`, y `Almacen` usado por `AlmacenamientoService` | Iniciar sesión o guardar un archivo tiene dos algoritmos válidos según el ambiente | Quien usa la estrategia no cambia al cambiarla. Las pruebas de integración inyectan la de memoria | Se solapa con Adapter en las mismas clases: el adaptador traduce la interfaz y la estrategia es poder intercambiarlas |
| Observer | TanStack Query en la web (`apps/web/src/api/`): cada pantalla se suscribe a una consulta con un hook `useAlgo` | Varias pantallas muestran el mismo dato, por ejemplo los saldos de un acopio, y tienen que actualizarse juntas tras una salida | Al invalidar una consulta después de una escritura, todas las suscritas se vuelven a pintar | Hay que saber qué consultas invalidar después de cada escritura; si falta una, la pantalla muestra datos viejos |

Un Builder propio no hace falta todavía: ningún objeto del dominio se arma en muchos
pasos opcionales. La remisión de la etapa 2 del motor es candidata, y si se usa se agrega
aquí.

## Reunión del viernes 9 de octubre, después de la clase

Virtual, justo al terminar la clase. Una sola reunión cubre el cierre del Sprint 1 y el
arranque del Sprint 2.

| # | Punto | Qué sale | Issue |
|:-:|---|---|---|
| 1 | Captura de la reunión con los cuatro conectados | `evidencia/avance-04/seguimiento.png` | [#45](https://github.com/Proyecto-IngSoftware/acopio/issues/45) |
| 2 | Seguimiento del Sprint 1: cada integrante dice qué terminó, qué sigue y qué lo bloquea | Las filas de Brayan, Alejandra y Michael en la tabla del [Avance 4](avance-04-sprint1.md#3b-seguimiento-del-equipo-daily-scrum) | [#45](https://github.com/Proyecto-IngSoftware/acopio/issues/45) |
| 3 | Leer juntos la retrospectiva del Sprint 1 y confirmarla o corregirla | Retrospectiva sin la marca de borrador | [#45](https://github.com/Proyecto-IngSoftware/acopio/issues/45) |
| 4 | Captura del tablero con las historias del Sprint 1, **antes** de mover tarjetas al Sprint 2 | `evidencia/avance-04/tablero.png` | [#21](https://github.com/Proyecto-IngSoftware/acopio/issues/21) |
| 5 | Repasar la consigna del Sprint 2 que acaba de dar el docente: semanas, entregables, formato | Notas para ajustar el calendario y esta nota | [#47](https://github.com/Proyecto-IngSoftware/acopio/issues/47) |
| 6 | Primer Planning del Sprint 2 sobre el borrador de abajo: Sprint Goal, historias, responsables por rol y Definition of Done | Tabla del Planning y de tareas confirmadas | [#47](https://github.com/Proyecto-IngSoftware/acopio/issues/47) |
| 7 | Mover en el tablero las historias del Sprint 2 y asignar responsables | Tarjetas con «Sprint 2» | [#47](https://github.com/Proyecto-IngSoftware/acopio/issues/47) |

El orden de los puntos 4 y 7 importa: si las tarjetas se mueven antes de la captura, el
tablero ya no muestra el Sprint 1.

## Borrador del Sprint Planning

Todo lo de esta tabla es propuesta y se confirma en el Planning. El sprint va hasta el
domingo 25 de octubre, con la Review en la validación de clase del viernes 23
([P-047](../01-requerimientos/pendientes.md)). Con una semana menos de la que suponía
este borrador, la pieza C (HU-02 y HU-15) probablemente pasa al Sprint 3; se decide en el
Planning.

| Elemento | Propuesta |
|---|---|
| Sprint Goal | El administrador decide cada traslado con el ranking del motor y lo despacha con una remisión que la zona confirma al recibir, y el portal muestra solo causas de entidades verificadas |
| Historias seleccionadas | Del Sprint 1, sin terminar: HU-10a Ver a dónde falta y de dónde sobra (8) y HU-10b Aprobar o descartar un traslado (5). Nuevas: HU-11 Despachar con un documento verificable (5), HU-12 Confirmar la llegada sin contar unidad por unidad (3) y HU-13 Contar lo que la fórmula no ve (3). Pendientes del Sprint 1: HU-02 Donar a una causa real (3) y HU-15 No dirigir donantes a una estafa (3). Suman 30 puntos. Los criterios de aceptación están en el [Avance 2](avance-02-requisitos.md#historias) |
| Tareas técnicas | DAO, DTO y patrones de diseño ([#59](https://github.com/Proyecto-IngSoftware/acopio/issues/59)). API de la etapa 2 del motor y simulador ([#46](https://github.com/Proyecto-IngSoftware/acopio/issues/46)). Contrato OpenAPI sin arreglos en los nullable ([#38](https://github.com/Proyecto-IngSoftware/acopio/issues/38)). Maquetas en Stitch de C10, C11 y las pantallas de remisión y recepción. Interfaz del motor en tres ciclos ([#35](https://github.com/Proyecto-IngSoftware/acopio/issues/35)). Pieza C del Bloque 1: verificación de entidades y causas ([#48](https://github.com/Proyecto-IngSoftware/acopio/issues/48)). Servidor de pruebas ([#26](https://github.com/Proyecto-IngSoftware/acopio/issues/26)) |
| Responsables iniciales | Según los roles del Sprint 0 ([Avance 1, §5](avance-01-sprint0.md#5-roles-iniciales-y-acuerdos-de-trabajo)): Joseph, arquitectura, modelo de datos e integración; Brayan, requerimientos y diseño UI/UX; Alejandra, coordinación del sprint y documentación; Michael, calidad, pruebas y despliegue. El responsable hace el seguimiento de su área; la programación se reparte entre los cuatro. Detalle por tarea en la tabla de abajo |
| Dependencias o riesgos | La interfaz del motor depende de la API de la etapa 2 y de las maquetas aprobadas. El servidor de pruebas depende de decidir proveedor, dominio y remitente antes del 18 de octubre. Microsoft 365 retira el SMTP con contraseña a fines de 2026 (RTA-04) |
| Definition of Done | La misma del Sprint 1 ([Avance 4](avance-04-sprint1.md#3a-sprint-planning)), con un punto más: el cambio entra por un pull request con el CI en verde, que Joseph revisa y fusiona ([P-051](../01-requerimientos/pendientes.md)) |

**Tareas y responsables (propuesta).** Cada tarea queda con quien tiene ese rol desde
el Sprint 0. Una tarea con responsable no es de una sola persona: el responsable
garantiza que avance y quede documentada.

| Tarea | Responsable | Rol del Sprint 0 | Apoyo |
|---|---|---|---|
| Validar los criterios de aceptación de las siete historias antes de construir | Brayan | Análisis de requerimientos | Alejandra los deja en el tablero |
| Maquetas en Stitch de C10, C11, remisión, recepción y P3 y P4 (causas) | Brayan | Diseño UI/UX | Joseph las aprueba antes de escribir código |
| Modelo de datos y migraciones de la pieza C ([#48](https://github.com/Proyecto-IngSoftware/acopio/issues/48)) | Joseph | Arquitectura y modelo de datos | |
| API de la etapa 2 del motor y simulador ([#46](https://github.com/Proyecto-IngSoftware/acopio/issues/46)) | Joseph | Arquitectura e integración | Michael, pruebas de integración |
| Contrato OpenAPI sin arreglos en los nullable ([#38](https://github.com/Proyecto-IngSoftware/acopio/issues/38)) | Joseph | Integración entre la web y la API | Michael revisa |
| Interfaz del motor en tres ciclos ([#35](https://github.com/Proyecto-IngSoftware/acopio/issues/35)) | Joseph | Liderazgo de integración | Brayan, maquetas; Michael, recorridos |
| API e interfaz de la pieza C ([#48](https://github.com/Proyecto-IngSoftware/acopio/issues/48)) | Se reparte en el Planning | Desarrollo compartido | |
| Pruebas y recorridos de punta a punta del motor y de la pieza C | Michael | Pruebas | |
| Revisión de los pull requests | Michael | Revisión de calidad | Todos revisan al menos uno |
| Servidor de pruebas, contenedores y runbook ([#26](https://github.com/Proyecto-IngSoftware/acopio/issues/26)) | Michael | Despliegue | Joseph, decisión de proveedor y dominio |
| Planning, seguimientos semanales, tablero y cierre del sprint ([#47](https://github.com/Proyecto-IngSoftware/acopio/issues/47)) | Alejandra | Coordinación de Sprint | |
| Registro del sprint, «Cambios al construir», pendientes, ADR nuevos y Word del avance | Alejandra | Documentación | Joseph genera el Word |

**Rotación de roles.** El Avance 1 dice que los roles rotan cada sprint. El equipo
decidió el 2026-10-07 que en el Sprint 2 no rotan: siguen los del Sprint 0
([P-048](../01-requerimientos/pendientes.md)).

**Calendario del sprint.**

| Semana | Fecha máxima | Qué tiene que estar listo |
|:-:|---|---|
| 10 | domingo 11 oct | Cierre del Avance 4, Planning del Sprint 2 |
| 11 | domingo 18 oct | API de la etapa 2 del motor, contrato corregido, DAO y patrones, decisión de VPS y dominio |
| 12 | domingo 25 oct | Interfaz del motor (Bloque 4 cerrado), Avance 5 en OneDrive antes del viernes 23, Review en la validación de clase de ese día y retrospectiva |

## Seguimientos del Sprint 2

Uno por semana, el miércoles o el viernes, con captura y una fila por integrante. La
guía pide al menos uno.

| Semana | Fecha | Captura |
|:-:|---|---|
| 11 | por definir | `evidencia/avance-05/seguimiento-semana-11.png` |
| 12 | por definir | `evidencia/avance-05/seguimiento-semana-12.png` |

Tabla de cada seguimiento:

| Integrante | ¿Qué terminé desde el último seguimiento? | ¿Qué haré a continuación? | ¿Qué bloqueo o ayuda necesito? |
|---|---|---|---|
| Joseph | | | |
| Brayan | | | |
| Alejandra | | | |
| Michael | | | |

## Sprint Review

Se hace en la validación de clase del viernes 23 de octubre, que es también la
sustentación del segundo corte. Evidencia: video breve o capturas de los contenedores en
ejecución y de las pruebas de la API.

| Historia | ¿Se cumplió? | Criterios pendientes, ajustes u observaciones |
|---|---|---|
| HU-10a Ver a dónde falta y de dónde sobra | | |
| HU-10b Aprobar o descartar un traslado | | |
| HU-11 Despachar con un documento verificable | | |
| HU-12 Confirmar la llegada sin contar unidad por unidad | | |
| HU-13 Contar lo que la fórmula no ve | | |
| HU-02 Donar a una causa real | | |
| HU-15 No dirigir donantes a una estafa | | |

La retrospectiva responde en párrafos las cuatro preguntas del Avance 4, la última con
una acción concreta y verificable, y revisa si se cumplió la
acción del Sprint 1: cuántos pull requests abrió y revisó cada integrante
(`gh pr list --state merged`).

## Cuando llegue la consigna

Lo que se ajustó al llegar la consigna del Sprint 2:

- [x] Guardar la guía en `docs/talleres/`
- [x] Semanas del Sprint 2 en el [calendario](calendario.md) y en el [cronograma](../05-planes/cronograma.md). Los milestones semanales no cambian de fecha; cambian los issues de cada uno
- [x] Este borrador: lo que pide la guía, la Review en la semana 12 y el calendario del sprint
- [x] [P-047](../01-requerimientos/pendientes.md) resuelto; comentario en [#47](https://github.com/Proyecto-IngSoftware/acopio/issues/47)
- [ ] Un `generar-avance-05.py` con el formato del Avance 4, y el Word en `unificar-avances.py`
