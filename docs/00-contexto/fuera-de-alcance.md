---
title: "Fuera de alcance"
type: contexto
tags: [contexto]
estado: vigente
actualizado: 2026-09-12
---

# Fuera de alcance

Lo descartado **y por qué**. Este archivo existe para que en el mes 3 nadie
reabra una discusión ya cerrada.

Si quieres impugnar una de estas decisiones, no la discutas en un chat: agrega una
entrada en [pendientes.md](../01-requerimientos/pendientes.md) con el argumento
nuevo. Solo un argumento nuevo justifica reabrir.

---

## Descartado por riesgo legal o ético

### Gestión de datos de personas desaparecidas

**Qué se descartó:** almacenar, publicar o cruzar información de personas
desaparecidas.

**Por qué:**

- Es dato sensible bajo la Ley 1581 de 2012. Manejarlo exige garantías que un
  proyecto académico no puede sostener.
- Riesgo de revictimización de las familias.
- Riesgo de difundir información falsa o desactualizada en un contexto donde un
  dato errado tiene consecuencias graves.
- Existen entidades con mandato legal para esto. Duplicarlas empeora el panorama.

**Qué se hace en su lugar:** la causa *personas desaparecidas* existe en el
directorio y enlaza a la UBPD, la Cruz Roja Colombiana y Medicina Legal. La
plataforma no almacena absolutamente nada.

**Reabrir solo si:** hay convenio formal con una entidad con mandato legal y
asesoría jurídica de por medio.

---

## Descartado por decisión de producto

### Procesamiento de pagos

**Qué se descartó:** recibir, custodiar o transferir dinero.

**Por qué:** obligaciones de cumplimiento financiero, responsabilidad fiduciaria
sobre fondos ajenos, y un riesgo reputacional desproporcionado. Ya hay entidades
que lo hacen mejor.

**Qué se hace en su lugar:** paso a paso y salida al sitio oficial de la entidad,
con aviso de salida. El aviso *esta plataforma no recibe dinero* es visible en la
portada y en toda ficha de causa.

**Reabrir:** no. Es identidad del proyecto, no una limitación técnica.

---

## Descartado por costo frente a beneficio

### Optimización de rutas de transporte

**Qué se descartó:** calcular recorridos óptimos entre acopios y zonas.

**Por qué:** es un problema de investigación de operaciones —vehículos con
capacidad, ventanas de tiempo, vías posiblemente cortadas por el sismo— capaz de
consumir el semestre entero y dejar el resto del sistema sin terminar.

**Qué se hace en su lugar:** el motor incorpora la distancia en línea recta como
uno de cuatro criterios de puntaje, con peso 0.15. Suficiente para no proponer
traslados absurdos.

**Reabrir si:** el motor está terminado y sobra medio mes.

### Conteo físico de personas en el sitio

**Qué se descartó:** saber cuántos voluntarios hay en un acopio en tiempo real
mediante QR de entrada y salida.

**Por qué:** exige disciplina de escaneo en un contexto caótico. Un dato de
presencia mal alimentado es peor que no tenerlo, porque se le cree.

**Qué se hace en su lugar:** cupos por reserva. Si alguien llega sin reservar, el
encargado ajusta los cupos restantes a mano.

**Riesgo aceptado:** el aforo publicado es de reservas, no de presencia real. La
interfaz lo dice con esas palabras.

### Doble factor de autenticación

**Qué se descartó:** 2FA para administradores.

**Por qué:** son pocos usuarios en un entorno controlado, y agrega fricción de
recuperación en un contexto donde ya hay usuarios sin correo.

**Reabrir si:** el sistema pasa a operación real con datos de terceros.

### Permisos granulares por acción

**Qué se descartó:** un sistema de permisos tipo `puede_aprobar_comprobante`.

**Por qué:** rol más alcance cubre todos los casos reales identificados. Los
permisos finos son complejidad que se paga siempre y se usa casi nunca.

**Reabrir si:** aparece un caso real que rol + alcance no puedan expresar.

### Rol distinto por asignación

**Qué se descartó:** que alguien sea operador en el Acopio A y receptor en la
Zona 3.

**Por qué:** más caro en guards y en interfaz —incluido el conmutador de contexto,
que tendría que cambiar los permisos junto con el lugar—, y nadie lo pidió.

---

## Descartado por arquitectura

### Supabase como backend completo

**Qué se descartó:** usar Supabase para base de datos, API, RLS y almacenamiento.

**Por qué:** la lógica de negocio terminaría repartida entre políticas RLS y
funciones edge. El motor de emparejamiento y las transacciones de inventario son
el aporte académico del proyecto; delegarlos lo vacía.

**Qué se usa:** Supabase Auth, solo para emitir el token. Ver
[ADR-0001](../02-arquitectura/adr/ADR-0001-supabase-solo-auth.md).

### PostgREST expuesto

**Qué se descartó:** exponer tablas por HTTP.

**Por qué:** saltaría por encima de las reglas de negocio del inventario. Un
`INSERT` directo en `movimiento` sin pasar por la validación de saldo rompe el
invariante central del sistema. No es ahorro, es un agujero.

### PostGIS

**Qué se descartó:** extensión geoespacial.

**Por qué:** para distancias entre puntos en un país, Haversine sobre columnas
`lat`/`lng` basta y sobra. PostGIS agrega peso de imagen y fricción de despliegue
sin beneficio a esta escala.

**Reabrir si:** aparecen consultas de polígonos o áreas de cobertura.

---

## Aplazado, no descartado

Lo que sí queremos pero no cabe en el semestre está en
[99-futuro/backlog.md](../99-futuro/backlog.md), no aquí.
