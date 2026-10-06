---
title: "Actores"
type: contexto
tags: [contexto]
estado: vigente
actualizado: 2026-10-06
---

# Actores

Quién usa el sistema, en qué condiciones físicas, y qué necesita de él.

Las condiciones importan tanto como las funciones: la mitad de las decisiones de
interfaz salen de esta tabla, no de los requerimientos.

---

## Públicos, sin cuenta

### Donante remoto

Está en otra ciudad u otro país. Quiere ayudar y no sabe cómo.

- **Dispositivo:** teléfono, buena conexión.
- **Necesita:** encontrar una causa que le importe, confiar en que la entidad es
  real, y un paso a paso sin ambigüedad.
- **Abandona si:** el flujo tiene más de tres pasos, o si duda de la legitimidad.

### Donante en especie

Compra insumos y los lleva a un acopio.

- **Dispositivo:** teléfono, en la calle.
- **Necesita:** saber **qué hace falta antes de comprar**, dónde queda el acopio
  más cercano que sí reciba eso, y en qué horario.
- **2026-09-12 · puede entregar sin registrarse, pero sin seguimiento personal.**
  El Operador lo registra como entrada normal, igual que cualquier mercancía —
  sin comprobante ni folio. Para tener un folio y confirmar después que su
  donación llegó, tiene que registrarse como [Donador](#donador).

### Voluntario

Quiere donar tiempo, no cosas.

- **Dispositivo:** teléfono.
- **Necesita:** ver dónde falta gente, reservar un cupo y recibir confirmación.
- **Frustración a evitar:** viajar y ser devuelto.

---

## Público, con cuenta propia

**2026-09-12.** La única cuenta que no crea un administrador. Cualquiera se
registra solo, con correo y contraseña, directo contra Supabase — sin invitación,
sin `username`. No entra a la consola interna ni tiene ubicación asignada.

### Donador

Quiere que quede constancia exacta de lo que donó — el caso típico es alguien con
seguidores o feligreses a quienes rendirles cuentas: un influencer, un cantante,
una iglesia que recaudó en especie y necesita demostrar en qué se usó.

- **Dispositivo:** teléfono, antes de salir de casa y otra vez en el acopio.
- **Necesita:**
  - **Preparar la donación:** escanear el código de barras de cada producto y
    ajustar la cantidad, antes de moverse. El sistema le sugiere a qué acopio
    llevarla y le avisa qué no aceptaría cada uno; al confirmar, arma un folio
    con esas líneas y un QR para mostrar al llegar.
  - **Ver su historial completo** de donaciones al iniciar sesión — no tiene que
    guardar cada folio por separado.
- **Es el único camino para obtener un folio y seguimiento.** Un folio sin cuenta
  detrás es un código que se olvida y no tiene dónde recuperarse — por eso ya no
  existe la vía de subir solo una factura sin registrarse. Adjuntar la foto de la
  factura sigue existiendo, pero como respaldo opcional junto a las líneas
  escaneadas, no como sustituto.
- **Alcance:** ninguno fijo — elige a qué acopio entregar en cada donación, y
  puede terminar entregando en otro con el mismo folio.
- **Cómo entra (construido en el Bloque 3):** crea la cuenta con nombre y correo; el
  enlace del correo le pide elegir la contraseña y abre la sesión (P-040). Entra con
  correo y contraseña desde «Mi cuenta de Donador» (P13), no por la consola. Puede
  tener hasta cinco donaciones preparadas a la vez, y cada una vence a los siete días
  si no la entrega.

---

## Internos, con cuenta creada por un administrador

### Operador de acopio

Recibe y despacha mercancía. **Es el usuario más importante del sistema.**

- **Condiciones reales:** de pie, con una mano ocupada, con guantes, bajo sol,
  celular al 12 %, señal intermitente. A veces con una fila de gente esperando.
- **Necesita:** registrar una entrada en menos de diez segundos, ver de un vistazo
  qué sobra y qué falta, y marcar una categoría como *no recibir*.
- **Si el registro es tedioso, no lo hace.** Y si no lo hace, el sistema entero
  queda ciego. Todo lo demás depende de que esta persona colabore.
- **Alcance:** uno o varios acopios asignados.

### Receptor

Recibe el cargamento en la zona afectada y reporta lo que hace falta. No decide
traslados ni gestiona inventario — reportar una necesidad no es llevar control, es
decir lo que ve. Es la persona en el punto de entrega, no un coordinador de la
respuesta.

- **Condiciones reales:** las peores. Conexión mala o ausente, batería escasa,
  urgencia constante.
- **Necesita:**
  - Un botón «Recibido» para confirmar que un envío llegó, con al menos una foto
    de evidencia. Sin conteo unidad por unidad.
  - Reportar una necesidad tocando una o varias categorías del catálogo, con una
    nota corta opcional — no depende de que llegue un envío.
- **Por qué reporta y no decide:** la canasta estándar calcula cantidades
  genéricas; no anticipa un lote dañado o una talla específica. Ese dato solo lo
  tiene quien está ahí, y alimenta el mapa público de necesidades.
- **Alcance:** una o varias zonas asignadas.

### Auditor

Concilia comprobantes contra movimientos de inventario, y audita el resto del
sistema en solo lectura — bitácora, saldos, historial, matriz de acceso.

- **Condiciones:** escritorio, computador, con calma.
- **Necesita:** una bandeja de pendientes de comprobantes, comparar línea por línea
  lo declarado contra lo confirmado en el acopio —la foto de factura, cuando
  existe, es respaldo adicional, no el dato que se concilia—, y aprobar o rechazar
  con motivo. Fuera de eso, solo mira: no registra movimientos, no aprueba
  sugerencias, no cambia nada que no sea conciliar.

### Administrador

Gobierna el sistema.

- **Necesita:** crear usuarios y asignarles ubicaciones, verificar entidades,
  configurar el catálogo y la canasta estándar, dar de alta y actualizar zonas
  afectadas, archivar o reactivar causas, y aprobar o descartar las sugerencias
  del motor.
- **Es el único que crea accesos a la consola interna.** Nadie más se
  auto-invita — la única excepción es el Donador, que se auto-registra por fuera
  de la consola (ver arriba).
- **Concentra por ahora las decisiones que antes se pensaron para un coordinador de
  zona** —aprobar sugerencias, gestionar remisiones y zonas—, porque en la
  respuesta real nadie en el punto de entrega tiene el tiempo ni el mandato para
  decidir eso. Ver nota de fase abajo.

---

## Matriz de permisos

**2026-09-12 · cambio de esquema.** El diseño original tenía cinco roles con
cuenta: Administrador, Operador, Coordinador de zona, Verificador y Observador. El
equipo decidió, para esta primera fase, reducirlo a cuatro roles **internos**, por
invitación: Administrador, Operador, Auditor (fusiona Verificador y Observador) y
Receptor (reemplaza a Coordinador, reducido a confirmar y reportar). Las
decisiones que antes tenía Coordinador —aprobar sugerencias, gestionar remisiones y
zonas— pasan al Administrador. Detalle en
[pendientes.md](../01-requerimientos/pendientes.md), P-013.

Se suma un quinto valor de rol, **Donador**, que no es un rol interno: se
auto-registra, sin invitación ni ubicación asignada — ver
[arriba](#público-con-cuenta-propia). El resto de los públicos —Donante en especie,
Donante remoto, Voluntario— sigue sin cuenta de ningún tipo.

**2026-09-12.** Se retiró el comprobante anónimo por foto (RF-CMP-001, descartado):
crear un folio ahora exige ser Donador. Consultar uno sigue siendo público, sin
cuenta — ver la fila de abajo.

| Acción | Visitante | Voluntario | Donador | Operador | Receptor | Auditor | Admin |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Ver home, causas, mapa | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Reservar turno | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Consultar un folio (sin cuenta) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Preparar donación (escaneo + folio, factura opcional) | | | ✓ | | | | |
| Ver mi historial de donaciones | | | ✓ | | | | |
| Registrar movimiento | | | | ✓ | | | ✓ |
| Configurar umbrales / no recibir | | | | ✓ | | | ✓ |
| Conciliar comprobantes | | | | | | ✓ | ✓ |
| Aprobar sugerencia del motor | | | | | | | ✓ |
| Gestionar remisiones (despacho) | | | | ✓ | | | ✓ |
| Confirmar recepción en zona (botón + foto) | | | | | ✓ | | ✓ |
| Reportar necesidad de zona | | | | | ✓ | | ✓ |
| Gestionar jornadas y cupos | | | | ✓ | | | ✓ |
| Verificar entidades | | | | | | | ✓ |
| Archivar o reactivar causas | | | | | | | ✓ |
| Dar de alta y actualizar zonas | | | | | | | ✓ |
| Crear usuarios y asignar ubicaciones | | | | | | | ✓ |
| Ver bitácora y auditar en solo lectura | | | | | | ✓ | ✓ |

Operador, Receptor y Auditor solo actúan sobre las ubicaciones que tengan
asignadas; Donador no tiene ubicación asignada, elige acopio en cada donación.
Jornadas y cupos son solo de acopio — Receptor no aparece ahí porque las zonas no
tienen jornadas en el modelo.
