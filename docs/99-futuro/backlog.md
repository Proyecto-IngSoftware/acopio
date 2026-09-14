---
title: "Backlog — aplazado, no descartado"
type: backlog
tags: [futuro]
estado: vigente
actualizado: 2026-08-20
---

# Backlog — aplazado, no descartado

Lo que **sí queremos** y no cabe en el semestre.

Distinto de [fuera-de-alcance.md](../00-contexto/fuera-de-alcance.md), que recoge
lo que **no queremos** y por qué.

---

## Alto valor, primeros candidatos si sobra tiempo

### B-01 · Rutas y logística de transporte
Optimización de recorrido para varias remisiones en un mismo vehículo, con
capacidad y vías cortadas. Hoy el motor solo usa distancia en línea recta con peso
0.15. Es un problema de investigación de operaciones y da para un proyecto propio.

### B-02 · Notificaciones push
Alertar al operador cuando su acopio entra en estado crítico, y al receptor
cuando una remisión sale hacia su zona. Hoy solo hay correo.

### B-03 · Historial y tendencia de saldos
Gráfico de cómo evolucionó el saldo de una categoría en el tiempo. Los datos ya
existen —los movimientos están todos—; falta la visualización.

### B-04 · Predicción de agotamiento
Con la tendencia de consumo, estimar en cuántos días se agota una categoría en una
zona. Convertiría el motor de reactivo en anticipatorio. Es la evolución natural
del proyecto.

### B-05 · Aplicación instalable
Empaquetar la consola como PWA instalable, con ícono en la pantalla de inicio y
service worker completo. Hoy el offline se limita a C04.

---

## Media prioridad

### B-06 · Voluntariado especializado extendido
Perfiles verificables —tarjeta profesional de veterinario, de médico— con
validación de documento. Hoy es un campo de texto (RF-TUR-007).

### B-07 · Doble factor para administradores
Ver [fuera-de-alcance](../00-contexto/fuera-de-alcance.md#doble-factor-de-autenticación).
Reabrir si el sistema pasa a operación real.

### B-08 · Múltiples emergencias simultáneas — promovido el 2026-09-14
Entra al semestre con [ADR-0010](../02-arquitectura/adr/ADR-0010-varias-emergencias-activas.md)
y [RF-CAT-005](../01-requerimientos/funcionales/catalogo.md). El aislamiento de
permisos por emergencia que se pensaba necesario no hace falta: las asignaciones son a
ubicaciones, y el acopio no pertenece a ninguna emergencia.

### B-09 · API pública de solo lectura
Para que medios y entidades consuman las métricas agregadas de transparencia sin
raspar el HTML.

### B-10 · Exportación contable
Informes en formato aceptado por contaduría para las entidades que deben rendir
cuentas de las donaciones recibidas.

### B-11 · Registro por voz
Dictar «doscientos litros de agua» en lugar de escribirlo. Muy pertinente para
manos ocupadas, pero la precisión del reconocimiento en bodega ruidosa es una
incógnita que habría que probar antes de comprometerla.

---

## Baja prioridad

### B-12 · Lenguas indígenas y traducción
Español es suficiente para el alcance actual. En zonas con comunidades indígenas
o población migrante podría no serlo.

### B-13 · Integración con sistemas oficiales
Consumir datos de la UNGRD o de alcaldías para poblar zonas y estimaciones de
población automáticamente. Depende de que existan APIs públicas.

### B-14 · Firma digital de remisiones
Firma del responsable en pantalla al despachar y al recibir. El QR más la
fotografía de evidencia ya cubren la necesidad práctica.

### B-15 · Modo oscuro
Poco útil en el caso de uso dominante —exteriores, de día—, y duplica el trabajo de
verificación de contraste.

---

## Cómo se promueve algo de aquí

1. Se agrega una entrada en [pendientes.md](../01-requerimientos/pendientes.md) con
   la razón por la que ahora sí cabe
2. Se discute en la revisión semanal
3. Si entra, pasa a `01-requerimientos/funcionales/` con su numeración `RF`
4. La entrada de este backlog se marca como promovida, con la fecha
