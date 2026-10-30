---
title: "Sesión 2026-10-30 · Complemento de la sustentación"
type: informe
tags: [operacion, sesion]
estado: vigente
actualizado: 2026-10-30
---

# Sesión 2026-10-30 · Complemento de la sustentación

El docente pidió un complemento para la sustentación del segundo corte
(`docs/talleres/Complemento Proyecto – IS1.pdf`): el diagrama de paquetes al día con un ADR-002,
un diagrama de comportamiento y, como bonificación, un patrón de concurrencia. Los tres puntos
quedaron escritos, con el Word unido al documento compartido. El correo vuelve a encenderse con
Resend para mostrar la cola en vivo, y solo falta la API key.

## Qué cambió

| PR o commit | Qué trae |
|---|---|
| Rama `docs/evidencia-resend` | Capturas del envío por Resend en la ficha, el Word regenerado (una captura sola va a todo el ancho) y los planes al día |
| #185, rama `docs/complemento-sustentacion` | Plan [2026-10-30-complemento-sustentacion.md](../../05-planes/2026-10-30-complemento-sustentacion.md); etiqueta de `AlmacenamientoService` en `paquetes.html` y PNG regenerados; [ADR-0023](../../02-arquitectura/adr/ADR-0023-organizacion-en-paquetes.md); nota [comportamiento.md](../../02-arquitectura/comportamiento.md) con el diagrama de estados de la donación, que `build.mjs` ahora extrae; [complemento-sustentacion.md](../../entregas/complemento-sustentacion.md), `generar-complemento.py` y el Word unido; bloque de Resend en `.env.example`; P-055 al día y P-089 nuevo |

Al regenerar los diagramas, `build.mjs` también actualizó el C4 de contenedores, que todavía
decía «pendiente: importacion».

Fuera del repositorio: el `.env` local apunta a Resend (`smtp.resend.com`, 465, usuario
`resend`, remitente `no-reply@josephqaz.dev`), con `SMTP_PASSWORD` vacío para que Joseph ponga la
llave.

## Pruebas

Verificación completa con Node 22, código de salida 0: lint, typecheck, depcruise (241 módulos
sin violaciones), `revisar-colores.sh`, unitarias (116 de shared, 100 de la API y 1256 de la web)
e integración (552) contra un PostgreSQL aparte en el puerto 5439.

Antes de dibujar, las dependencias del diagrama se compararon contra los imports del código:
`grep` de `from '../almacenamiento/'` en `apps/api/src/modulos` devuelve `acopios`,
`comprobantes`, `importacion` y `motor`. Cada flecha del diagrama de estados se comprobó contra
su método en `comprobantes/*.service.ts` y `tareas-custodia.service.ts`, y los números de línea
de la ficha de concurrencia contra `notificacion.service.ts`. El Word se revisó renderizado a PDF
página por página.

Envío real por Resend, en la API local con la llave de Joseph en el `.env`: un registro de Donador
para `contacto@josephqaz.dev` respondió 202 y encoló el correo de confirmación a las 05:50:11
(hora de Colombia). El consumidor lo envió a las 05:51:01, en el primer intento y sin error, y
Joseph confirmó que llegó a la bandeja desde `no-reply@josephqaz.dev`. Las dos capturas están en
`docs/entregas/evidencia/complemento/` y en la ficha. Se probó con el registro de Donador en vez
de una invitación porque en la base local la contraseña del administrador ya no coincide con
`SEED_ADMIN_CONTRASENA`, y los intentos de entrar llegaron al límite de la API (429).

## Decisiones

- ADR-002 del curso = ADR-0023 del repositorio, porque los números no se reutilizan (C, en el
  [plan](../../05-planes/2026-10-30-complemento-sustentacion.md)).
- Diagrama de estados sobre la donación, no de actividades (C, aprobado por Joseph).
- Bonificación con la cola de correo y no con el candado del inventario, porque el PDF pide
  productor y consumidor o cola de mensajes (C, Joseph lo dejó a criterio).
- Resend por SMTP, sin SDK: solo cambian variables (Joseph eligió Resend; P-055).

## Errores y correcciones

- La primera etiqueta del diagrama de paquetes quedó encima de la línea punteada del grupo; se
  movió al tramo libre debajo de `comprobantes`.
- En el primer render del diagrama de estados se encimaba la etiqueta del rechazo y el bucle de
  PENDIENTE salía sin texto. Se cambió el bucle por una nota y la orientación a vertical.
- El hook de humanizer rechazó escrituras cuando la invocación cubría otro archivo; se invocó por
  cada texto.

## Pendiente

- Encender Resend en el servidor de pruebas
  ([plan, tarea 4](../../05-planes/2026-10-30-complemento-sustentacion.md),
  [plan de acción, fila 23](../../05-planes/plan-de-accion.md)).
- Cola de correo con dos instancias de la API ([P-089](../../01-requerimientos/pendientes.md)).
- El issue [#26](https://github.com/Proyecto-IngSoftware/acopio/issues/26) (remitente de correo)
  queda con el remitente decidido; el resto del issue sigue abierto.

## Depende de Joseph

- La API key de Resend en `.env` y en el panel de Dokploy de `acopio-app-yrtfbo`, con
  `CORREO_ACTIVO=true` y las variables de `.env.example`, y redesplegar
  ([P-055](../../01-requerimientos/pendientes.md)).
