---
title: "ADR-0001 · Supabase solo para autenticación"
type: adr
tags: [arquitectura, adr]
estado: vigente
adr: 1
decision: aceptada
actualizado: 2026-08-20
---

# ADR-0001 · Supabase solo para autenticación

**Fecha:** 2026-08-20 · **Estado:** aceptada

## Contexto

El frontend se genera con Lovable, que integra Supabase por defecto y produce
pantallas de login que ya hablan con `supabase.auth`. Supabase ofrece base de
datos, API automática, políticas RLS y almacenamiento.

El proyecto es académico y se evalúa la arquitectura, además del producto.

## Decisión

**Supabase Cloud se usa exclusivamente para autenticación.** Emite el token y nada
más. Base de datos, API y almacenamiento son nuestros, en contenedores.

- Supabase Auth (nube) — registro por invitación, contraseña, emisión de JWT
- PostgreSQL (contenedor) — todo el dominio
- NestJS (contenedor) — toda la lógica y toda la autorización
- MinIO (contenedor) — todos los archivos

## Alternativas consideradas

**Supabase completo.** El equipo avanzaría mucho más rápido: RLS, storage y auth
resueltos. Descartada porque la lógica de negocio terminaría repartida entre
políticas RLS y funciones edge. El motor de emparejamiento y las transacciones de
inventario son el aporte del proyecto; delegarlos lo vacía.

**Supabase autoalojado en el compose.** Compartir una instancia de Postgres
permitiría una llave foránea directa contra `auth.users`. Descartada por peso: el
compose oficial levanta unos nueve contenedores y pide más de 4 GB de RAM, contra
cinco en nuestra configuración.

**Autenticación propia con Passport.** Elimina la dependencia externa y funciona
sin internet. Descartada porque obligaría a reescribir las pantallas de acceso que
Lovable ya genera, y a implementar bien recuperación, verificación y rotación de
sesiones — trabajo conocido, sin aporte académico.

## Consecuencias

### A favor
- La lógica de negocio queda completa en un solo lugar, verificable con pruebas
- Se conserva lo que Lovable ya genera para el login
- Los datos operativos y los archivos son nuestros, exportables y respaldables
- Cinco contenedores, no nueve

### En contra
- **Sin internet no se puede iniciar sesión.** En un sistema de emergencia es un
  riesgo real. Se mitiga con sesiones largas con refresh, y con la captura offline
  que sigue operando en dispositivos ya autenticados
- **El plan gratuito pausa proyectos inactivos.** Va al runbook: verificar 72 horas
  antes de cualquier demostración
- **Los correos salen del país.** Exige aviso de transferencia internacional en la
  política de privacidad, conforme a la Ley 1581 de 2012
- El enlace de identidad es por UUID, sin llave foránea: `usuario.supabase_uid`
  contra el claim `sub`. La integridad referencial la garantiza la aplicación

### Implicación de seguridad

La `service_role` key puede crear y borrar cualquier usuario de Supabase. **Vive
solo en el backend.** Nunca en el frontend, nunca en una variable `VITE_*`, nunca
en el repositorio. Filtrarla entrega el sistema completo.
