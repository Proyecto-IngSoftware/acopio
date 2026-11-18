---
title: "Plan de remediación de main y cambio de correo a Hostinger"
type: plan
tags: [plan, turnos, inventario, correo, operacion]
estado: vigente
actualizado: 2026-11-18
---

# Plan de remediación de main y cambio de correo a Hostinger

La revisión del commit `3b2daad` reprodujo dos fallos de turnos en PostgreSQL
aislado, identificó un riesgo de atribución en la sincronización sin conexión y
confirmó que Compose omite dos variables de RedAcopio. Joseph indicó que Hostinger
es el proveedor de correo. La [configuración del servidor](../06-operacion/despliegue.md#correo-de-acopio-con-hostinger)
recoge el cambio; falta validar el buzón desde el servidor.

El orden propuesto es purga de correo, sincronización, recordatorios y Compose.
Preparar el SMTP y verificar la conexión puede avanzar en paralelo con la purga.
El equipo aplica los cambios de datos con fixtures sintéticos primero. Joseph
configura el buzón y las credenciales en los paneles.

## 1. P1 · Borrar las copias de datos de reservas

- Asociar los mensajes de turnos a su reserva y calcular su vigencia a partir
  del fin actual de la jornada. La tarea de
  [purga](../../apps/api/src/modulos/turnos/tareas-turnos.service.ts)
  cubre las copias de la cola en todos los estados, incluidas las enviadas.
  Al mover una jornada, el plazo se calcula con su nuevo fin.
- Impedir que el trabajador reclame mensajes vencidos y coordinar la purga con el
  préstamo del trabajador. Un mensaje que SMTP ya aceptó queda sujeto a la
  retención del buzón receptor. El plazo de 30 días cubre las copias bajo control
  de Acopio.
- Para los registros anteriores, hacer primero una consulta que entregue conteos.
  Clasificar mediante datos que identifiquen con certeza la reserva y el tipo de
  mensaje. Revisar los casos ambiguos antes de decidir su tratamiento. Un mismo
  buzón puede recibir correos de varias reservas y de otros módulos.

La [consulta de inventario histórico](../../scripts/auditar-correo-turnos.sql)
devuelve conteos por plantilla. Para confirmaciones, distingue las que tienen
un código y un enlace que apuntan a la misma reserva. La consulta solo lee.
La clasificación y el tratamiento de las filas históricas siguen pendientes
de ejecutar con los resultados de esa revisión.

**Aceptación.** Con una reserva vigente y otra vencida, PostgreSQL conserva los
mensajes de la primera y borra o anonimiza las copias personales de la segunda,
incluidos el destinatario y el cuerpo. La prueba cubre estados pendiente, enviado
y fallido, un reclamo simultáneo, una purga repetida y correo de otros módulos.

## 2. P2 · Aislar la sincronización al cambiar de sesión

- Asociar cada envío con la sesión que lo inició. Al cerrar o cambiar de sesión,
  detener el lote e impedir que se programen más solicitudes de esa cuenta.
  Usar cancelación para las solicitudes que todavía se puedan abortar.
- Asegurar también en la API que una entrada sin conexión se atribuya a la cuenta
  que la registró. Acordar la transición para clientes instalados y colas
  existentes. Conservar las entradas pendientes ante un cambio de sesión o una
  respuesta ambigua. El identificador del movimiento permite reintentar sin
  duplicarlo.

**Aceptación.** Una prueba de regresión con dos sesiones sintéticas y una solicitud
pendiente demuestra que la sincronización se detiene al cambiar de sesión. Al
restaurar la sesión original, las entradas se sincronizan una vez y la bitácora
las atribuye a la cuenta correspondiente.

## 3. P2 · Rearmar los recordatorios de jornadas reprogramadas

- Asociar el reclamo del recordatorio al inicio vigente de la jornada. Un cambio
  de inicio permite reclamar un recordatorio para la nueva fecha y descarta el
  aviso de la fecha anterior si todavía espera envío. Mantener el aviso de cambio
  como mensaje separado.
- Coordinar la edición y el reclamo para que dos instancias de la API no encolen
  el mismo recordatorio ni usen una fecha reemplazada.

**Aceptación.** Después de enviar el primer recordatorio y mover la jornada,
aparece uno para la nueva fecha. Dos ejecuciones simultáneas encolan uno solo.
Cambiar el título o cancelar la jornada preserva las reglas de envío que
corresponden a cada operación.

## 4. P3 · Pasar la configuración de RedAcopio a Compose

- Pasar `IMPORTACION_ORIGEN` e `IMPORTACION_PROGRAMADA` de Compose a la API.
  Mantener los valores por defecto `archivo` y `false`. La activación en el
  servidor sigue el pendiente de la [pieza E](../01-requerimientos/pendientes.md#p-076--lo-que-falta-de-rf-red-011-después-de-la-pieza-e).

**Aceptación.** `docker compose config` revela ambos valores por defecto y los
valores alternativos `http` y `true` cuando se configuran. En un entorno de
pruebas con fuente simulada, la API selecciona el adaptador y la tarea respeta
el interruptor.

## Cambio de SMTP a Hostinger

1. Confirmar en hPanel el buzón remitente y el producto de correo. Los MX
   publicados de `josephqaz.dev` apuntan a Hostinger Mail. El ejemplo usa
   `no-reply@josephqaz.dev`, el remitente histórico documentado. El panel debe
   confirmar que el buzón existe.
2. Revisar en el DNS del dominio los registros que indique hPanel y la cuota
   del buzón. Cargar en Dokploy las variables de la
   [guía de SMTP](../06-operacion/despliegue.md#correo-de-acopio-con-hostinger)
   con la contraseña del buzón.
3. Ejecutar `verify()` desde el contenedor de la API. Probar con un buzón de
   prueba autorizado un registro de Donador y una reserva sintética. Revisar
   el estado en la cola, la recepción y el enlace. Probar el restablecimiento
   en el flujo administrativo de Acopio.
4. Registrar los resultados en el seguimiento de [#26](https://github.com/Proyecto-IngSoftware/acopio/issues/26).
   Si falla el cambio, restaurar la última configuración operativa disponible.
   Revisar la cola antes de reintentar mensajes para evitar duplicados.

## Cierre

Cada tarea se cierra con su prueba de regresión, CI en verde y evidencia de su
verificación. La [medición en preproducción](../01-requerimientos/pendientes.md#p-090--validar-la-carga-en-preproducción-aislada)
puede hacerse con la misma base sintética. El plan agrupa los hallazgos en
[P-091](../01-requerimientos/pendientes.md#p-091--remediación-de-la-revisión-de-main-y-hostinger).
