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
| Rama `docs/diagramas-complemento` | Joseph pidió diagramas y textos más claros. El de estados se redibujó a mano en SVG (`comportamiento.html`), con colores por actor, flechas numeradas y notación «evento [guarda] / efecto»; el de paquetes de la API ganó un riel con las cinco capas; la cola de correo tiene su propio diagrama (`concurrencia.html`) con la línea de tiempo de la prueba real. `exportar-complemento.mjs` saca los PNG, `build.mjs` ya no extrae el Mermaid y el Word pone los diagramas apaisados en páginas horizontales. El documento del complemento explica cómo leer cada diagrama, los recorridos y una tabla de capas |
| #186, rama `docs/evidencia-resend` | Capturas del envío por Resend en la ficha, el Word regenerado (una captura sola va a todo el ancho) y los planes al día |
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
- El ADR-0023 y el documento decían que cada módulo importa solo a los de capas inferiores. Al
  armar la tabla de capas se vio que `comprobantes` importa `inventario` y que `identidad` importa
  `auditoria` y `notificaciones`, que están en su misma capa. Se corrigió a «ninguno importa hacia
  arriba» en el ADR, el documento y el riel del diagrama.
- El hook de humanizer rechazó escrituras cuando la invocación cubría otro archivo; se invocó por
  cada texto.

## Pendiente

- Cola de correo con dos instancias de la API ([P-089](../../01-requerimientos/pendientes.md)).
- El issue [#26](https://github.com/Proyecto-IngSoftware/acopio/issues/26) (remitente de correo)
  queda con el remitente decidido; el resto del issue sigue abierto.

## Depende de Joseph

Nada pendiente. Joseph puso la API key en el `.env` y las variables de Resend en Dokploy. Un
registro de Donador en el servidor (06:58 hora de Colombia) llegó a `contacto@josephqaz.dev` con
el enlace del servidor, y Joseph confirmó la cuenta
([P-055](../../01-requerimientos/pendientes.md)).
