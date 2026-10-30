---
title: "Complemento de la sustentación del segundo corte · plan"
type: plan
tags: [plan, entregas, arquitectura, notificaciones]
estado: vigente
actualizado: 2026-10-30
---

# Complemento de la sustentación del segundo corte · plan

> **Para agentes:** se ejecuta con superpowers:executing-plans, tarea por tarea. Los pasos usan
> casillas (`- [ ]`).

**Objetivo:** cubrir los tres puntos del complemento que pidió el docente para la sustentación del
30 de octubre (`docs/talleres/Complemento Proyecto – IS1.pdf`) y volver a encender el correo con
Resend, que hace falta para mostrar en vivo el punto de concurrencia.

**Qué hay y qué falta (revisión del 30 de octubre):**

| Punto del PDF | Estado al empezar | Qué falta |
|---|---|---|
| 1. Diagrama de paquetes al día | `diagramas/paquetes.html` tiene los 12 módulos y casi todas las dependencias | Solo dibuja `comprobantes → almacenamiento`. En el código también lo importan `acopios`, `motor` e `importacion` |
| 1. ADR-002 | No hay un ADR sobre la organización en paquetes. El `ADR-0002` del repositorio trata del saldo derivado | Escribirlo con Contexto, Decisión, Alternativa, Justificación y Consecuencias |
| 2. Diagrama de comportamiento | No hay diagramas de estados ni de actividades | Diagrama de estados de la donación, con su párrafo |
| 3. Concurrencia (opcional) | La cola `correo_saliente` ya funciona como productor y consumidor, pero el correo está apagado en el servidor (P-055) | Correo encendido con Resend y la ficha que pide el PDF |

**Decisiones de esta sesión (Joseph aprobó el alcance el 30 de octubre):**

- El ADR va con el número siguiente, **ADR-0023**, porque los números no se reutilizan. En el
  documento del curso se presenta como «ADR-002 (ADR-0023 en el repositorio)».
- El diagrama de comportamiento es **de estados**, sobre la donación (`EstadoComprobante`). Es la
  entidad con más reglas en su ciclo de vida, y cada transición tiene un servicio y una prueba que
  se pueden señalar.
- Para la bonificación se usa **la cola de correo**, no el candado del inventario. El PDF pide
  productor y consumidor o cola de mensajes, y la cola encaja así. El candado consultivo del
  inventario es exclusión mutua. La cola además se puede mostrar en vivo: se dispara una
  invitación y el correo llega un minuto después.
- **Resend entra por SMTP**, sin su SDK. `NotificacionService` ya usa SMTP estándar (ADR-0008), así
  que el cambio es de variables: `smtp.resend.com`, puerto 465 con TLS, usuario `resend` y la
  llave de la API como contraseña. No se toca código de la API.

## Estado

| Tarea | Estado |
|---|---|
| 1. Diagrama de paquetes | ✅ Etiqueta de `AlmacenamientoService` y PNG regenerados |
| 2. ADR-0023 | ✅ Con fila en los dos índices |
| 3. Diagrama de estados | ✅ En [comportamiento.md](../02-arquitectura/comportamiento.md); `build.mjs` lo extrae como `comportamiento-01-…` |
| 4. Correo con Resend | 🟡 `.env` local y `.env.example` listos, P-055 al día. Faltan la API key de Joseph, la prueba de envío y las variables del panel de Dokploy |
| 5. Ficha de concurrencia | ✅ Limitación anotada como P-089. Faltan las capturas, que dependen de la tarea 4 |
| 6. Documento y cierre | 🟡 Word generado y unido; falta el PR |

## Task 1: Dependencias de `almacenamiento` en el diagrama de paquetes

**Archivos:** `docs/02-arquitectura/diagramas/paquetes.html`, los PNG de `docs/assets/diagramas/`.

- [ ] Agregar una etiqueta en la lámina 2, junto a la flecha que baja a `almacenamiento`, como
  las de `AlcanceService` y `BitacoraService`: «AlmacenamientoService: acopios, comprobantes,
  motor, importacion».
- [ ] Regenerar los PNG con `node exportar-paquetes.mjs` desde `docs/02-arquitectura/diagramas/`.
- [ ] Comprobar contra el código:
  `grep -rlE "from '\.\./almacenamiento/" apps/api/src/modulos --include=*.ts | grep -v test`
  nombra solo esos cuatro módulos.

## Task 2: ADR-0023, organización en paquetes

**Archivos:** `docs/02-arquitectura/adr/ADR-0023-organizacion-en-paquetes.md`, `adr/README.md`.

- [ ] Contexto: un equipo de cuatro personas con un módulo cada uno, una sola base de datos, la
  bitácora en la misma transacción que cada cambio y la web y la API en un solo repositorio.
- [ ] Decisión: monorepo con `apps/web`, `apps/api`, `packages/shared` y `packages/ui-tokens`.
  Dentro de la API, un módulo por dominio, en capas (dominio arriba, transversales y hojas abajo)
  y dependencias solo hacia abajo. Se enlaza la tabla de `vista-general.md`.
- [ ] Alternativa considerada: organizar por capas técnicas (`controllers/`, `services/`,
  `repositories/`), que es la alternativa B de ADR-0008, y separar la web y la API en dos
  repositorios.
- [ ] Justificación: cada módulo coincide con lo que una persona tiene asignada, la regla se
  comprueba con `depcruise` en CI y `packages/shared` evita escribir dos veces las fórmulas.
- [ ] Consecuencias: qué facilita, qué limita (un módulo de abajo no puede llamar a uno de arriba,
  y por eso existen los puertos `VerificadorUbicaciones` y `ProveedorIdentidad`) y qué podría
  requerir ajustes (`motor` ya depende de siete módulos).
- [ ] Fila nueva en el índice de ADR.

## Task 3: Diagrama de estados de la donación

**Archivos:** `docs/02-arquitectura/diagramas/mmd/estados-01-donacion.mmd` y su SVG,
`docs/02-arquitectura/modelo-datos.md` o `funcionales/comprobantes.md`.

- [ ] Leer cada transición en `comprobantes/*.service.ts` y en `tareas-custodia.service.ts`:
  qué método la dispara, quién la puede pedir (rol) y con qué condición.
- [ ] Dibujar el `stateDiagram-v2` con PREPARADO, PENDIENTE, CONCILIADO, RECHAZADO y CANCELADO,
  cada flecha con evento, guarda y actor.
- [ ] Renderizar con `renderizar.mjs`, como los demás `.mmd`.
- [ ] Párrafo: qué entidad es, con qué historias de usuario (RF-CMP-001B, 001C, 004, 005, 006) y
  reglas se relaciona y por qué se eligió un diagrama de estados.
- [ ] Comprobar que cada flecha tiene su línea en el código y que no queda ninguna transición del
  código sin dibujar.

## Task 4: Correo con Resend

**Archivos:** `.env.example`, `docs/06-operacion/` (runbook o despliegue), `pendientes.md`.

- [ ] Prueba local: en `.env`, `SMTP_HOST=smtp.resend.com`, `SMTP_PORT=465`, `SMTP_SEGURO=true`,
  `SMTP_USER=resend`, `SMTP_PASSWORD=<llave de Resend>` y un `CORREO_REMITENTE` de un dominio
  verificado en Resend. Disparar una invitación y confirmar en el panel de Resend que salió y que
  la fila de `correo_saliente` quedó `ENVIADO`.
- [ ] En `.env.example`, un bloque comentado con esas variables para Resend, al lado del de
  Mailpit.
- [ ] Servidor de pruebas: Joseph pone las mismas variables y `CORREO_ACTIVO=true` en el panel de
  Dokploy. La llave no entra al repositorio.
- [ ] Cerrar P-055 con la fecha y dejar escrito que el proveedor es Resend.

## Task 5: Ficha de concurrencia

**Archivos:** `docs/entregas/complemento-sustentacion.md` (sección 3).

- [ ] Problema: enviar un correo dentro de la operación que lo pide (invitar, confirmar una
  donación) la haría fallar o tardar si el SMTP no responde.
- [ ] Componentes: productores (`UsuariosService`, `ReservasService` y los demás que llaman
  `NotificacionService.encolar` dentro de su transacción), la tabla `correo_saliente` como cola y
  el consumidor `procesarCola` (`@Cron` cada minuto, lotes de 50, reintentos con espera
  exponencial hasta 8 intentos).
- [ ] Código y evidencia: rutas con línea, `notificaciones.int.test.ts` y una captura del panel de
  Resend o de la fila `ENVIADO`.
- [ ] Limitaciones: la bandera `procesando` evita dos lotes a la vez en una instancia, pero no
  entre dos instancias de la API, que leerían las mismas filas. Hoy corre una sola. El arreglo es
  reclamar el lote con `FOR UPDATE SKIP LOCKED`, y queda como `P-089`. Además, si la API cae
  entre `sendMail` y `marcarEnviado`, el correo se reenvía: la entrega es al menos una vez.

## Task 6: Documento del curso y cierre

- [ ] `docs/entregas/complemento-sustentacion.md` con las tres secciones, y
  `generar-complemento.py`, como los avances anteriores. Agregarlo a `unificar-avances.py` para
  que entre al documento compartido.
- [ ] Verificación: `lint`, `typecheck`, `depcruise`, `test`, `test:int` y
  `scripts/revisar-colores.sh`, aunque el cambio sea de documentación, porque toca
  `.env.example`.
- [ ] Informe de sesión, fila en el plan de acción, PR y fusión cuando pase el CI.

## Registro de cambios

- 2026-10-30 · Plan creado tras revisar el PDF del complemento.
