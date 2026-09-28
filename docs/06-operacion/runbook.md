---
title: "Runbook"
type: operacion
tags: [operacion]
estado: vigente
actualizado: 2026-09-12
---

# Runbook

Qué hacer cuando algo falla.

---

## ⚠ Antes de cualquier demostración o sustentación

**72 horas antes:**

- [ ] **Entrar al panel de Supabase.** El plan gratuito pausa proyectos inactivos
      tras aproximadamente una semana sin uso. **Si está pausado, nadie puede
      iniciar sesión el día de la sustentación.** Reactivarlo puede tardar minutos
- [ ] Iniciar sesión con una cuenta real de cada rol, incluido un Donador (por correo)
- [ ] Verificar que hay datos de demostración cargados
- [ ] Probar el recorrido completo: preparar donación → recibirla en el acopio →
      conciliar → sugerencia → remisión → recepción → consultar el folio
- [ ] Confirmar que la cuenta `AUDITOR` del evaluador funciona
- [ ] Revisar que los respaldos corrieron

**El día:** repetir el primer punto una hora antes.

---

## Nadie puede iniciar sesión

1. **¿El proyecto de Supabase está pausado?** Causa más frecuente. Reactivar desde
   el panel
2. ¿`SUPABASE_URL` y `SUPABASE_ANON_KEY` correctas en el contenedor `web`?
3. ¿El endpoint del JWKS responde? `curl $SUPABASE_JWKS_URL`
4. ¿El contenedor `api` está arriba? `docker compose ps`

**Mitigación de fondo:** las sesiones activas siguen funcionando aunque Supabase
esté caído. La captura offline de inventario también, en dispositivos ya
autenticados. Solo se bloquea el inicio de sesión nuevo.

## Un usuario específico no puede entrar

```sql
SELECT username, estado, supabase_uid, rol
FROM usuario WHERE username = 'xxx';
```

| Síntoma | Causa | Solución |
|---|---|---|
| `estado = INVITADO` | Nunca canjeó la invitación | Reenviar el enlace |
| `estado = SUSPENDIDO` | Acceso revocado | Reactivar si corresponde |
| `supabase_uid IS NULL` con estado `ACTIVO` | Estado inconsistente | Revisar bitácora; restablecer acceso |
| Todo correcto pero recibe 403 | Sin asignaciones | Asignar una ubicación |

## Un usuario olvidó su contraseña

- **Con correo real:** recuperación estándar de Supabase
- **Con correo sintético** (`@usuarios.acopio.local`): no hay recuperación
  autónoma. El administrador usa **restablecer acceso**, que exige motivo escrito y
  notifica a todos los administradores. Es deliberado: ver
  [ADR-0001](../02-arquitectura/adr/ADR-0001-supabase-solo-auth.md)

## Los saldos no cuadran

**Nunca edites la tabla `movimiento`.** Es append-only por diseño y por permisos.

1. Revisar el historial de la categoría en C06: cada movimiento con su autor
2. Buscar movimientos con `origen_offline = true` y `ocurrido_en` desfasado
3. Si el saldo derivado difiere de la suma real, refrescar la vista materializada:
   ```sql
   REFRESH MATERIALIZED VIEW CONCURRENTLY saldo;
   ```
4. Si hay una diferencia física real, se corrige con un **conteo físico** (C06),
   que genera un `AJUSTE` con motivo y queda auditado

## Movimientos atascados en la cola offline

En el dispositivo:
1. Verificar conexión real, no solo el ícono
2. Revisar la bandeja de rechazados: un movimiento puede haber sido rechazado por
   el servidor con motivo
3. Los rechazos frecuentes suelen ser saldo insuficiente por una salida registrada
   entretanto

**Los movimientos en cola no se pierden.** Persisten en IndexedDB hasta
sincronizarse o ser rechazados explícitamente.

## No se pueden ver las imágenes de comprobantes

1. ¿El contenedor `storage` está arriba?
2. ¿La API puede alcanzar a Garage por la red interna? `docker compose exec storage /garage status`
3. ¿El bucket existe y la llave de la API tiene permiso? `docker compose exec storage /garage bucket info comprobantes`
4. Las URLs firmadas vencen: si la pestaña llevaba horas abierta, recargar
5. **Nunca hagas público el bucket para arreglar esto.** Contiene facturas con
   nombre, cédula y dirección

## El motor no genera sugerencias

Lista vacía tiene dos causas legítimas y la interfaz debe distinguirlas:

1. Todas las zonas están cubiertas
2. Ningún acopio tiene excedente sobre su máximo

Si no es ninguna:
- ¿Hay canasta estándar definida para las categorías? Sin ella no hay necesidad
  calculada
- ¿Las zonas tienen `poblacion_estimada` distinta de cero?
- ¿Los umbrales máximos están configurados en los acopios?
- ¿La cantidad mínima de sugerencia está demasiado alta?

## El proxy devuelve 502

```bash
docker compose ps
docker compose logs api --tail=100
```

Causa habitual: `api` no arrancó por migración pendiente o `DATABASE_URL` mal
formada.

## Restaurar desde respaldo

```bash
docker compose stop api web
docker compose exec -T db psql -U $POSTGRES_USER -d acopio < respaldo.sql
rclone sync destino:acopio/comprobantes garage:comprobantes
docker compose start api web
```

Verificar después: saldos de un acopio conocido, y que las imágenes de un
comprobante conocido cargan.

---

## Contactos

| Rol | Persona | Contacto |
|---|---|---|
| Responsable de infraestructura | _por definir_ | |
| Responsable de base de datos | _por definir_ | |
| Administrador de Supabase | _por definir_ | |

Completar antes del despliegue. Un runbook sin contactos falla justo cuando se
necesita.
