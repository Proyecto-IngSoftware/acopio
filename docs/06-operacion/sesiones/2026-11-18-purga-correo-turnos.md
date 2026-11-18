---
title: "Sesión 2026-11-18 · Purga de correo de turnos"
type: informe
tags: [operacion, sesion, correo, turnos]
estado: vigente
actualizado: 2026-11-18
---

# Sesión 2026-11-18 · Purga de correo de turnos

Implementé la primera fase de [P-091](../../01-requerimientos/pendientes.md#p-091--remediación-de-la-revisión-de-main-y-hostinger).
Los correos nuevos de turnos apuntan a su reserva. La purga elimina los
mensajes vinculados a una reserva vencida en la misma transacción que borra
sus datos personales. El trabajador consulta el fin vigente de la jornada
al reclamar o renovar un mensaje.

## Configuración SMTP

El `.env` de la raíz quedó con el servidor, puerto, TLS y remitente de Hostinger.
El envío quedó desactivado hasta cargar la contraseña del buzón. La credencial
del proveedor anterior quedó en un archivo de respaldo local ignorado por Git.

## Pruebas

Pasaron lint, tipos, límites entre módulos, la suite unitaria y 564 pruebas de
integración con PostgreSQL 16 aislado.

- La prueba de entorno rechaza un SMTP autenticado con la contraseña vacía
  cuando el correo está activo. El diagnóstico de Hostinger sigue disponible
  con el envío desactivado.
- La prueba de purga cubre mensajes pendientes, enviados y fallidos. También
  conserva mensajes vigentes y de otros módulos que comparten destinatario.
- La prueba del trabajador verifica el bloqueo de reclamos y renovaciones tras
  el vencimiento, incluso si el aviso tuvo un préstamo antes de la purga.
- La consulta histórica produjo los conteos esperados con datos sintéticos,
  incluidos casos con y sin un enlace que identifique la reserva.

## Pendiente

- Cargar la contraseña del buzón y comprobar la entrega desde Dokploy.
  [Guía de Hostinger](../despliegue.md#correo-de-acopio-con-hostinger)
- Tomar los conteos del correo histórico y decidir cómo tratar los mensajes
  que no se pueden vincular con certeza. [Plan de remediación](../../05-planes/2026-11-18-remediacion-main-y-hostinger.md)
- Implementar el aislamiento de la cola sin conexión, el rearme de recordatorios
  y las variables de RedAcopio. [Plan de remediación](../../05-planes/2026-11-18-remediacion-main-y-hostinger.md)
