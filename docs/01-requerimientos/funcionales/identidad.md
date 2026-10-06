---
title: "RF-IDE · Identidad y accesos"
type: requerimientos
tags: [requerimientos, rf]
estado: vigente
modulo: identidad
bloque: 0
actualizado: 2026-10-05
---

# RF-IDE · Identidad y accesos

**Bloque 0** · Prerrequisito de todo lo demás.

Principio: **Supabase autentica, nosotros autorizamos.** Nadie se auto-registra,
salvo el Donador ([RF-IDE-013](#rf-ide-013--auto-registro-de-donador)), que no entra
a la consola.

---

### RF-IDE-001 · Crear usuario
**Actor:** Administrador · **Prioridad:** DEBE

El administrador crea un usuario con nombre de usuario, nombre completo, rol,
correo opcional y al menos una asignación de ubicación.

**Criterios de aceptación:**
- [ ] El nombre de usuario es único, sin distinguir mayúsculas
- [ ] El rol es uno de: `ADMIN`, `OPERADOR`, `AUDITOR`, `RECEPTOR`
- [ ] Se puede asignar una o varias ubicaciones, de tipo acopio o zona
- [ ] Si se omite el correo, el formulario advierte que no habrá recuperación de contraseña
- [ ] Sin correo, se genera uno sintético `<username>@usuarios.acopio.local`
- [ ] El usuario nace en estado `INVITADO`
- [ ] Ningún otro rol puede crear usuarios

**2026-09-28 · construido.** La asignación es obligatoria para Operador, Receptor y
Auditor. El Administrador tiene alcance global y puede crearse sin ubicaciones
([P-028](../pendientes.md)).

### RF-IDE-002 · Generar enlace de invitación
**Actor:** Sistema · **Prioridad:** DEBE
**Depende de:** RF-IDE-001

**Criterios de aceptación:**
- [ ] Token de 32 bytes de entropía criptográfica
- [ ] Se almacena únicamente `SHA-256(token)`; el token en claro no se persiste
- [ ] Vence a los 7 días
- [ ] Un solo uso
- [ ] Se envía por correo si hay uno real, y **siempre** queda copiable desde la
      interfaz para entregarlo por WhatsApp
- [ ] El administrador puede revocarlo o regenerarlo antes del vencimiento

### RF-IDE-003 · Canjear invitación y definir contraseña
**Actor:** Usuario invitado · **Prioridad:** DEBE
**Depende de:** RF-IDE-002

**Criterios de aceptación:**
- [ ] La pantalla muestra nombre de usuario, nombre completo y ubicaciones asignadas
- [ ] Contraseña de 12 caracteres mínimo, sin exigir símbolos
- [ ] Se rechaza contra lista de contraseñas comunes
- [ ] Al confirmar, el backend crea el usuario en Supabase con la Admin API y
      `email_confirm: true`. Mientras el desarrollo es local, en el adaptador local
      ([P-025](../pendientes.md))
- [ ] El UUID devuelto se guarda en `usuario.supabase_uid` y el estado pasa a `ACTIVO`
- [ ] El token queda invalidado
- [ ] Un token vencido, ya usado o inexistente produce el mismo mensaje genérico
- [ ] La `service_role` key no aparece en ningún artefacto del frontend

### RF-IDE-004 · Iniciar sesión con nombre de usuario
**Actor:** Usuario activo de un rol interno · **Prioridad:** DEBE

El Donador no pasa por aquí: entra con su correo ([RF-IDE-013](#rf-ide-013--auto-registro-de-donador)).

**Criterios de aceptación:**
- [ ] El formulario pide nombre de usuario, no correo
- [ ] ~~Un endpoint público resuelve el username a su correo asociado~~ La API recibe
      el nombre de usuario, lo resuelve a su correo y se lo pasa al proveedor. El
      correo nunca sale hacia el navegador ([P-028](../pendientes.md))
- [ ] El inicio de sesión tiene límite de intentos por IP y no revela si el usuario
      existe
- [ ] Un usuario `SUSPENDIDO` o `INVITADO` no puede iniciar sesión

### RF-IDE-005 · Autorizar cada request
**Actor:** Sistema · **Prioridad:** DEBE

**Criterios de aceptación:**
- [ ] Valida la firma del JWT contra el JWKS de Supabase, con claves cacheadas.
      En desarrollo local, el JWKS lo sirve el adaptador `local` de la API
      ([P-025](../pendientes.md))
- [ ] Resuelve `supabase_uid` en `public.usuario`
- [ ] Sin fila, o con estado distinto de `ACTIVO`, responde 403
- [ ] En operaciones con `ubicacion_id`, verifica contra `usuario_asignacion`
- [ ] **Las asignaciones se consultan en base de datos en cada request, nunca se
      cachean en el token**
- [ ] Suspender a un usuario le corta el acceso en el siguiente request, sin
      esperar a que expire su token

### RF-IDE-006 · Gestionar asignaciones
**Actor:** Administrador · **Prioridad:** DEBE

**Criterios de aceptación:**
- [ ] Agregar y quitar ubicaciones de un usuario existente
- [ ] Se registra quién asignó y cuándo, en la propia tabla
- [ ] Si al quitar una asignación la ubicación queda sin responsable activo, se
      advierte antes de confirmar, sin bloquear
- [ ] Se notifica por correo al asignar y al revocar
- [ ] Solo el administrador puede modificarlas

### RF-IDE-007 · Suspender usuario
**Actor:** Administrador · **Prioridad:** DEBE

**Criterios de aceptación:**
- [ ] **Nunca se elimina un usuario**, solo se suspende
- [ ] Un usuario suspendido desaparece de los selectores, pero permanece en la
      bitácora y en los movimientos que registró
- [ ] Se puede reactivar sin repetir el proceso de invitación

### RF-IDE-008 · Proteger al último administrador
**Actor:** Sistema · **Prioridad:** DEBE

**Criterios de aceptación:**
- [ ] Rechaza suspender, degradar o eliminar al último `ADMIN` activo
- [ ] Un administrador no puede cambiarse el rol a sí mismo
- [ ] El mensaje de error explica por qué

### RF-IDE-009 · Restablecer acceso
**Actor:** Administrador · **Prioridad:** DEBE

Regenerar la invitación de un usuario ya `ACTIVO` es una acción distinta de invitar.

**Criterios de aceptación:**
- [ ] Exige motivo escrito, mínimo 20 caracteres
- [ ] Notifica a la persona afectada y a **todos** los administradores
- [ ] Queda en bitácora como evento destacado
- [ ] Mientras está pendiente, el usuario aparece marcado en la matriz de acceso
- [ ] El acceso anterior queda invalidado al canjearse la nueva invitación

### RF-IDE-010 · Conmutador de contexto activo
**Actor:** Operador, Receptor · **Prioridad:** DEBE

**Criterios de aceptación:**
- [ ] Si el usuario tiene una sola ubicación, se selecciona sola y no se muestra
- [ ] Con varias, un selector fijo en la parte superior indica dónde está operando
- [ ] La ubicación activa persiste entre sesiones en el dispositivo
- [ ] **Es una comodidad de interfaz, jamás una fuente de autoridad**: el
      `ubicacion_id` viaja en el cuerpo del request y el servidor lo valida siempre

### RF-IDE-011 · Matriz de acceso
**Actor:** Administrador, Auditor · **Prioridad:** DEBERÍA

**Criterios de aceptación:**
- [ ] Vista `usuarios × ubicaciones` filtrable por rol, estado y ubicación
- [ ] Responde de un vistazo quién puede tocar una ubicación dada
- [ ] Marca los restablecimientos pendientes
- [ ] Los Donadores no aparecen: no tienen ubicaciones. Se consultan en un
      listado aparte, filtrable por estado, para poder suspender uno
- [ ] Exportable a CSV

### RF-IDE-012 · Bitácora de auditoría
**Actor:** Administrador, Auditor · **Prioridad:** DEBE

**Criterios de aceptación:**
- [ ] Toda escritura queda registrada con usuario, momento, acción y entidad
- [ ] Append-only, sin edición ni borrado desde la aplicación
- [ ] Filtrable por usuario, ubicación, tipo de acción y rango de fechas
- [ ] Los eventos destacados —restablecer acceso, cambio de rol, ajuste de
      inventario— se distinguen visualmente

### RF-IDE-013 · Auto-registro de Donador
**Actor:** Cualquiera, sin invitación · **Prioridad:** DEBE

**2026-09-12 · sube a DEBE.** RF-CMP-001B, que es DEBE, depende de este (P-018).

La única cuenta que no crea el administrador. No contradice «ningún otro rol puede
crear usuarios» de RF-IDE-001 — nadie más está creando la cuenta de otro, cada
quien crea la suya.

**Criterios de aceptación:**
- [ ] Formulario público: correo, contraseña, nombre a mostrar
- [ ] **2026-10-05 · el registro pasa por la API (C-03, C-09).** `POST
      /api/auth/registro` crea la credencial en el proveedor de identidad y la fila de
      `usuario` con `rol = DONADOR`, fijado en el servidor. Si la transacción falla, se
      borra la credencial. El navegador no habla con Supabase
- [ ] El correo se confirma antes del primer ingreso. El enlace sale por la cola
      `correo_saliente`, trae un token de un solo uso con vigencia limitada y se canjea
      en `POST /api/auth/registro/confirmar`
- [ ] El registro responde 202 con el mismo mensaje se haya creado la cuenta, ya
      existiera o la haya ganado otra petición en paralelo; a una cuenta existente le
      llega un correo que lo dice. Así nadie descubre qué correos están registrados
- [ ] `POST /api/auth/donador/sesion` entra con correo y contraseña. Una cuenta sin
      confirmar da 403 `CORREO_SIN_CONFIRMAR` solo si la contraseña es correcta; con una
      contraseña mala da el 401 genérico
- [ ] Nace en estado `ACTIVO` de una vez: no hay invitación que canjear
- [ ] Un correo que ya usa una cuenta interna no puede registrarse como Donador
- [ ] El Administrador puede suspender a un Donador (RF-IDE-007), igual que a
      cualquier otra cuenta
- [ ] Inicia sesión con **correo**, no con `username` — a diferencia de los cuatro
      roles internos
- [ ] No se le pide ni se le asigna ninguna ubicación
- [ ] Mismas reglas de contraseña que RF-IDE-003: 12 caracteres mínimo, contra
      lista de comunes
