---
title: "Sesión 2026-11-18 · Remediación de main y SMTP de Hostinger"
type: informe
tags: [operacion, sesion, correo]
estado: vigente
actualizado: 2026-11-18
---

# Sesión 2026-11-18 · Remediación de main y SMTP de Hostinger

El [plan de remediación](../../05-planes/2026-11-18-remediacion-main-y-hostinger.md)
ordena los cuatro hallazgos de la revisión de `main` y define una prueba por
cada corrección. La plantilla y la [guía de despliegue](../despliegue.md#correo-de-acopio-con-hostinger)
recogen Hostinger como proveedor SMTP.

## Comprobaciones

Los MX públicos del dominio documentado apuntan a Hostinger. La API de Acopio
encola y envía los mensajes de invitación, confirmación de Donador y
restablecimiento administrativo con su propio SMTP. El adaptador de Supabase
crea o actualiza las credenciales de esos usuarios.

Validé que Compose pasa el ajuste SMTP a la API y conserva Mailpit en desarrollo.
Verifiqué el certificado de `smtp.hostinger.com:465` desde el entorno local. El
comando documentado se autenticó contra Mailpit con TLS y credenciales sintéticas.

## Pendiente

- Confirmar el buzón en hPanel, configurar sus credenciales en Dokploy y
  comprobar conexión y entrega desde el servidor. [#26](https://github.com/Proyecto-IngSoftware/acopio/issues/26)
- Implementar y verificar las cuatro correcciones. [P-091](../../01-requerimientos/pendientes.md#p-091--remediación-de-la-revisión-de-main-y-hostinger)
