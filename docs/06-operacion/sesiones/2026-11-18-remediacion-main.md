---
title: "Sesión 2026-11-18 · Remediación de main"
type: informe
tags: [operacion, sesion, turnos, inventario]
estado: vigente
actualizado: 2026-11-18
---

# Sesión 2026-11-18 · Remediación de main

Continuación de [P-091](../../01-requerimientos/pendientes.md#p-091--remediación-de-la-revisión-de-main-y-hostinger) tras la purga de correos vinculados a reservas.

## Qué cambió

- La cola sin conexión aborta al cerrar o cambiar de cuenta. La API comprueba la
  cuenta de captura y la web reutiliza la que ya guardaba IndexedDB.
- Un cambio de inicio rearma los recordatorios y retira los avisos que aún
  esperan envío. El reclamo y la edición toman el mismo candado de jornada.
- Compose pasa a la API el origen de RedAcopio y el interruptor de su tarea.
- Los scripts de correo histórico verifican el secreto de las confirmaciones
  antes de vincularlas. El ejemplo SMTP usa el buzón autenticado de Hostinger.

## Pruebas

Pasaron 1.478 pruebas unitarias, 566 de integración y las comprobaciones de lint,
tipos, dependencias y colores. Se regeneró el contrato OpenAPI y los tipos de la web. En PostgreSQL 16 aislado, los
datos sintéticos confirmaron el rearme por bitácora, la conservación de los
cambios que solo afectan al lugar y la vinculación idempotente de confirmaciones.
Se comprobó la interpolación de Compose con los valores por defecto y los
alternativos. La API eligió el adaptador y respetó el interruptor con una
fuente simulada. En Chromium pasaron los 12 pasos del recorrido sin conexión.

## Decisiones

Los recordatorios históricos cuyo inicio no puede verificarse quedan fuera del
envío automático. Se pueden revisar con la auditoría de correo histórico. La
verificación independiente detectó dos casos de transición que se corrigieron
antes de abrir el PR, el aborto de una solicitud al cambiar de usuario y el
rearme de jornadas movidas dentro de la ventana del recordatorio original.

## Errores y correcciones

El puerto local 3900 estaba ocupado. Se validó Compose con un proyecto aislado
y puertos propios. La suite web detectó consultas duplicadas al cargar la
sesión inicial. Se conservó la caché durante esa carga y se mantuvo su limpieza
al cambiar de cuenta.

## Pendiente

- Ejecutar la auditoría y vincular las confirmaciones verificadas en la base
  real. Revisar el correo histórico que sigue sin vínculo.
  [Plan de remediación](../../05-planes/2026-11-18-remediacion-main-y-hostinger.md#1-p1--borrar-las-copias-de-datos-de-reservas)
- Medir en preproducción con los datos y recursos del servidor.
  [P-090](../../01-requerimientos/pendientes.md#p-090--validar-la-carga-en-preproducción-aislada)

## Depende de Joseph

- Validar el SMTP y la entrega desde Dokploy.
  [Guía de despliegue](../despliegue.md#correo-de-acopio-con-hostinger) · [#26](https://github.com/Proyecto-IngSoftware/acopio/issues/26)
