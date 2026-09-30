---
title: "RF-INV · Inventario"
type: requerimientos
tags: [requerimientos, rf]
estado: vigente
modulo: inventario
bloque: 2
actualizado: 2026-09-30
---

# RF-INV · Inventario

**Bloque 2** · Núcleo del sistema.

Principio: **el saldo no se guarda, se deriva de movimientos inmutables.**

---

### RF-INV-001 · Registrar entrada
**Actor:** Operador · **Prioridad:** DEBE

**Criterios de aceptación:**
- [ ] Selecciona categoría por escáner de código de barras o por búsqueda de texto
- [ ] La búsqueda acepta palabras clave y tolera errores de tipeo y tildes
      («panal» encuentra «Pañal adulto»)
- [ ] Cantidad con teclado numérico grande; la unidad viene fija de la categoría
- [ ] Fecha de vencimiento opcional, obligatoria si la categoría es perecedera
- [ ] Confirmación en un solo toque
- [ ] **El recorrido completo toma menos de 10 segundos** (RNF-02)
- [ ] Al confirmar, se muestra el saldo resultante de esa categoría
- [ ] Si la categoría está marcada como *no recibir*, se advierte antes de
      confirmar, sin bloquear: la donación ya llegó físicamente

### RF-INV-002 · Escanear código de barras
**Actor:** Operador · **Prioridad:** DEBERÍA
**Depende de:** RF-CAT-004

**Criterios de aceptación:**
- [ ] Usa la cámara del dispositivo mediante `@zxing/browser`
- [ ] Un EAN conocido autocompleta la categoría
- [ ] Un EAN desconocido ofrece asociarlo a una categoría; queda aprendido para la
      próxima vez
- [ ] **El escáner es un atajo, jamás un requisito.** La entrada manual siempre
      está disponible al mismo alcance

### RF-INV-003 · Registrar salida
**Actor:** Operador · **Prioridad:** DEBE

**Criterios de aceptación:**
- [ ] Toda salida se asocia a una remisión, o a un motivo explícito si no la hay
- [ ] La transacción falla si el saldo quedaría negativo
- [ ] Al despachar perecederos, el sistema propone primero lo que vence antes

### RF-INV-004 · Ajustar por conteo físico
**Actor:** Operador · **Prioridad:** DEBE

**Criterios de aceptación:**
- [ ] Se ingresa la cantidad contada; el sistema calcula y registra la diferencia
- [ ] **Motivo escrito obligatorio**, mínimo 10 caracteres
- [ ] Genera un movimiento de tipo `AJUSTE`, nunca modifica movimientos anteriores
- [ ] Queda destacado en la bitácora

### RF-INV-005 · Consultar saldos
**Actor:** Operador, Auditor · **Prioridad:** DEBE

**Criterios de aceptación:**
- [ ] Tabla por categoría: saldo, unidad, semáforo y antigüedad del último movimiento
- [ ] Semáforo derivado de umbrales: rojo bajo el mínimo, ámbar cerca del mínimo,
      verde en rango, morado sobre el máximo
- [ ] **El semáforo lleva ícono y texto además de color** (RNF-11)
- [ ] Ordenable por criticidad, por nombre y por antigüedad
- [ ] Cada fila enlaza a su historial de movimientos

### RF-INV-006 · Ver historial de una categoría
**Actor:** Operador, Auditor · **Prioridad:** DEBE

**Criterios de aceptación:**
- [ ] Lista todos los movimientos con tipo, cantidad, usuario, momento y saldo
      corriente resultante
- [ ] Responde «¿por qué hay 1.240 L?» sin salir de la pantalla
- [ ] Distingue `ocurrido_en` de `registrado_en` cuando difieren, e indica que el
      registro fue offline

### RF-INV-007 · Configurar umbrales
**Actor:** Operador, Administrador · **Prioridad:** DEBE

**Criterios de aceptación:**
- [ ] Mínimo y máximo por categoría y por ubicación
- [ ] Valida `min <= max`
- [ ] Valores por defecto tomados de la canasta estándar, editables
- [ ] El máximo alimenta el cálculo de superávit del motor

### RF-INV-008 · Marcar «no recibir»
**Actor:** Operador · **Prioridad:** DEBE

**Construido en el Bloque 1 (2026-09-30, B-02).** Se adelantó para que el mapa público
pueda filtrar por lo que un acopio no recibe. Vive en el módulo `inventario`, en la tabla
`no_recibir`.

Ataca directamente el problema del acopio ahogado en un solo insumo.

**Criterios de aceptación:**
- [ ] Interruptor por categoría y por acopio, accesible en un toque
- [ ] **Se publica de inmediato en el mapa y en la ficha pública del acopio**
- [ ] Se muestra en el filtro *qué no recibe* de P05
- [ ] Se puede programar una fecha de reapertura opcional
- [ ] El motor considera movible todo lo que exceda el mínimo, no el máximo

### RF-INV-009 · Captura sin conexión
**Actor:** Operador · **Prioridad:** DEBERÍA

**Criterios de aceptación:**
- [ ] C04 funciona sin red en un dispositivo previamente autenticado
- [ ] Los movimientos se encolan en IndexedDB con su `ocurrido_en` local
- [ ] Un indicador permanente muestra cuántos hay pendientes de sincronizar
- [ ] Al recuperar señal se reenvían en orden, con reintento y espera creciente
- [ ] **Solo se sincronizan movimientos**, que son hechos append-only; no hay
      resolución de conflictos porque no hay estado editable
- [ ] Un movimiento rechazado por el servidor se muestra al operador con su motivo,
      y no se pierde
- [ ] El saldo mostrado offline se marca como estimado

### RF-INV-010 · Alerta de vencimiento
**Actor:** Operador · **Prioridad:** DEBERÍA

**Criterios de aceptación:**
- [ ] Los lotes que vencen en menos de 7 días se destacan en C03
- [ ] Elevan el criterio de urgencia en el puntaje del motor
- [ ] Resumen diario por acopio de lo próximo a vencer

### RF-INV-011 · Integridad transaccional
**Actor:** Sistema · **Prioridad:** DEBE

**Criterios de aceptación:**
- [ ] `movimiento` no admite `UPDATE` ni `DELETE`, garantizado por permisos de base
      de datos además de por código
- [ ] Dos operadores registrando simultáneamente en el mismo acopio no producen
      saldos incorrectos
- [ ] La vista materializada de saldos se refresca dentro de la misma transacción
      o mediante disparador
- [ ] Existe una prueba de concurrencia automatizada. **Es la prueba más importante
      del proyecto**
