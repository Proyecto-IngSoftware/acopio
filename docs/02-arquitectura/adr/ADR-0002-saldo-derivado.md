---
title: "ADR-0002 · El saldo se deriva, no se guarda"
type: adr
tags: [arquitectura, adr]
estado: vigente
adr: 2
decision: aceptada
actualizado: 2026-08-20
---

# ADR-0002 · El saldo se deriva, no se guarda

**Fecha:** 2026-08-20 · **Estado:** aceptada

## Contexto

El inventario es el cimiento del sistema. Todo lo demás —el semáforo, el estado
*no recibir*, el motor de emparejamiento, la trazabilidad— se apoya en saber
cuánto hay de cada categoría en cada ubicación.

Además, el registro debe funcionar sin conexión: en zona de desastre y en la
bodega de un acopio, la señal es intermitente.

## Decisión

**Se almacenan movimientos inmutables. El saldo es una vista derivada.**

```
movimiento   append-only · sin UPDATE · sin DELETE
saldo        Σ (cantidad × signo)  →  vista materializada
```

Un error no se corrige editando: se registra un `AJUSTE` de signo contrario con
motivo escrito obligatorio.

La prohibición de `UPDATE` y `DELETE` se hace cumplir con permisos de base de
datos, no solo con disciplina en el código.

## Alternativas consideradas

**Tabla de saldos editable.** Lo obvio: una fila por ubicación y categoría que se
actualiza en cada operación. Más simple de escribir y de consultar. Descartada por
tres razones que resultan decisivas en este dominio.

**Event sourcing completo.** Reconstruir todo el estado desde eventos, con
proyecciones y reproducción. Descartada por sobredimensionada: solo el inventario
necesita esta propiedad, y aplicarla al sistema entero multiplicaría la
complejidad sin beneficio.

## Consecuencias

### A favor

1. **Explicabilidad.** «¿Por qué hay 1.240 L?» se responde con la lista de los 37
   movimientos que lo produjeron. Un saldo editable solo puede responder «porque
   sí».

2. **Auditoría gratis.** No hay que construir un registro aparte y mantenerlo
   sincronizado con la verdad. La tabla de movimientos *es* la auditoría.

3. **Sincronización offline sin conflictos.** Es la razón más importante.
   Un movimiento es un hecho inmutable —*entraron 200 L a las 3:14 pm*—, no un
   estado. Dos dispositivos que sincronizan colas de hechos simplemente los
   insertan todos; el orden no altera la suma. Sincronizar un *saldo* editable
   exigiría detectar y resolver conflictos, que es un problema difícil y una
   fuente inagotable de errores sutiles.

4. **La trazabilidad se apoya en algo real.** Un comprobante se vincula a un
   movimiento concreto, no a un cambio de número.

### En contra

- Consultar el saldo exige agregación. Se resuelve con vista materializada
  refrescada por disparador, con refresco selectivo por fila.
- La tabla crece sin límite. A la escala de este proyecto —decenas de miles de
  filas por emergencia— es irrelevante. Si algún día importa, se particiona por
  emergencia.
- Corregir un error es más ceremonioso: exige un ajuste con motivo. **Esto es
  deliberado.** En logística de donaciones, que corregir deje rastro es una
  virtud, no una molestia.

### Implicación de pruebas

La prueba de concurrencia —dos operadores registrando simultáneamente en el mismo
acopio sin producir saldos incorrectos— es **la prueba más importante del
proyecto**. Si el inventario miente, todo lo que se construye encima miente.
