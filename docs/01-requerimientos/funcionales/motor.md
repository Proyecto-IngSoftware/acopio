---
title: "RF-MOT · Zonas y motor de emparejamiento"
type: requerimientos
tags: [requerimientos, rf]
estado: vigente
modulo: motor
bloque: 4
actualizado: 2026-10-07
---

# RF-MOT · Zonas y motor de emparejamiento

**Bloque 4** · Aporte original del proyecto. Exige los bloques 2 y 3 cerrados.

Principio: **el sistema recomienda, la persona decide y responde.**

---

### RF-MOT-001 · Registrar zona afectada
**Actor:** Administrador · **Prioridad:** DEBE

**Criterios de aceptación:**
- [ ] Nombre, municipio, coordenadas, población estimada y fuente de esa estimación
- [ ] Pertenece a una emergencia. Si esa emergencia se cierra, la zona queda en solo
      lectura ([RF-CAT-005](catalogo.md#rf-cat-005--gestionar-emergencias))
- [ ] Estado: `SIN_ATENDER`, `EN_ATENCION`, `CUBIERTA`
- [ ] Fecha de la estimación de población, visible junto al número
- [ ] Aparece en el mapa interno con su color de criticidad

### RF-MOT-012 · Ajustar la población de una zona
**Actor:** Administrador · **Prioridad:** DEBE
**Depende de:** RF-MOT-001 · **Origen:** [P-002](../pendientes.md)

La población estimada es el otro factor de [RF-MOT-002](#rf-mot-002--calcular-necesidad-de-una-zona).
Cambia con los desplazamientos, así que el número tiene que poder corregirse sin perder
de dónde salió cada valor. C9 Zonas afectadas ya permite editarlo desde el Bloque 1;
este requerimiento fija las reglas.

**Criterios de aceptación:**
- [ ] El valor de partida es la proyección de población del DANE 2020-2035 para el
      municipio, como referencia ([I-005](../../00-contexto/investigaciones.md))
- [ ] Solo el Administrador cambia el número, desde C9
- [x] Cambiar el número exige una fuente y una fecha de estimación nuevas: no se
      guarda un número nuevo con la fuente del anterior. La fuente puede repetir el texto
      (la alcaldía actualiza su conteo), pero la fecha tiene que cambiar; si no, la API
      responde 422 `POBLACION_SIN_FUENTE_NUEVA`
- [x] La bitácora guarda el valor de antes y el de después, con quién lo cambió
- [ ] La zona muestra el número junto a su fuente y su fecha, en el mapa interno y en
      la ficha (RNF-04)
- [x] El cálculo de necesidad usa siempre el valor vigente

**Por afinar:** si el Receptor de la zona puede proponer un número que el
Administrador acepta o descarta.

### RF-MOT-002 · Calcular necesidad de una zona
**Actor:** Sistema · **Prioridad:** DEBE
**Depende de:** RF-CAT-003

```
necesidad(z,c) = canasta(c) × poblacion(z) × horizonte_dias
```

**Criterios de aceptación:**
- [x] Se calcula automáticamente para toda categoría con canasta definida
- [x] El horizonte en días es configurable por emergencia; por defecto 7. Cada zona
      usa el de su emergencia
- [ ] El administrador puede sobrescribir manualmente la necesidad de una categoría,
      y la interfaz muestra que ese valor es manual y quién lo puso. La sobrescritura vive
      en `necesidad_manual`, solo de inserción: vale la más reciente, y una sin cantidad
      vuelve al cálculo. La API ya la guarda y dice quién la puso; falta C10
- [ ] La pantalla muestra los tres términos del cálculo, no solo el resultado

### RF-MOT-003 · Calcular déficit y cobertura
**Actor:** Sistema · **Prioridad:** DEBE

```
recibido(z,c)  = Σ RECEPCION en z de c con ocurrido_en ≥ hoy − horizonte_dias
en_camino(z,c) = Σ líneas de remisiones BORRADOR o EN_TRANSITO con destino z
deficit(z,c)   = max(0, necesidad − recibido − en_camino)
cobertura(z,c) = min(1, recibido / necesidad)
```

**2026-10-06 (M-02, M-03 de la [especificación del Bloque 4](../../superpowers/specs/2026-10-06-bloque-4-motor-design.md)).** La necesidad
cubre el horizonte, así que lo recibido cuenta solo dentro de esa misma ventana: si no, una
zona bien atendida la primera semana quedaría cubierta para siempre. Lo que va en camino
se resta del déficit para que el motor no vuelva a proponer el mismo traslado.

**Criterios de aceptación:**
- [ ] Ficha de zona con tabla: categoría, necesidad, recibido, déficit, cobertura
- [ ] Barra de cobertura con color por criticidad
- [ ] Cobertura global de la zona: promedio de las coberturas por categoría, cada una
      topada en 1, con la categoría más baja al lado (M-11). Ninguna categoría tiene un
      peso de criticidad y litros y kilos no se suman. La API la calcula; falta C10

### RF-MOT-004 · Calcular superávit de un acopio
**Actor:** Sistema · **Prioridad:** DEBE

```
superavit(a,c) = max(0, saldo − umbral_max(a,c))
   si no_recibir(a,c) → movible = max(0, saldo − umbral_min(a,c))
```

**Criterios de aceptación:**
- [x] Se recalcula al registrarse cualquier movimiento: se deriva del saldo en cada
      lectura
- [x] Un acopio en *no recibir* libera hasta su mínimo, no solo hasta su máximo
- [x] Sin umbral en el acopio, la categoría no tiene excedente (M-12)
- [x] Lo que la estimación de vencimientos (V-02) da por vencido no se mueve, y el
      movible descuenta las líneas en `BORRADOR` que salen del acopio

### RF-MOT-005 · Generar sugerencias
**Actor:** Sistema · **Prioridad:** DEBE

```
puntaje = 0.45·criticidad + 0.25·urgencia + 0.15·proximidad + 0.15·magnitud

criticidad = 1 − cobertura(z,c)
urgencia   = 1 / (1 + dias_para_vencer)
proximidad = 1 − (distancia / distancia_max)
magnitud   = min(1, movible / deficit)

cantidad_sugerida = min(movible(a,c), deficit(z,c))
```

**Criterios de aceptación:**
- [x] Heurística voraz por puntaje (M-06): en cada categoría se puntúan todos los pares
      acopio y zona, se toma el mejor, se le asigna `min(movible, déficit)` y se repite.
      Así la proximidad decide quién atiende a quién. Distancia en línea recta;
      `distancia_max` es la mayor entre los pares candidatos de la ronda
- [x] Urgencia 0 en las categorías no perecederas o sin fecha; los días salen de la
      misma estimación de vencimientos que C3 (V-02)
- [ ] Los cuatro pesos son globales, configurables ([RF-CAT-006](catalogo.md#rf-cat-006--configurar-pesos-del-motor)),
      y suman 1
- [x] Un solo cálculo sobre las zonas de todas las emergencias `ACTIVA` y
      `EN_SEGUIMIENTO`. **La prioridad de una emergencia en el portal no altera el
      puntaje**: el reparto sigue a la necesidad, no a la visibilidad
      ([ADR-0010](../../02-arquitectura/adr/ADR-0010-varias-emergencias-activas.md))
- [x] Recálculo bajo demanda y programado cada 15 minutos. Cada recálculo reemplaza las
      propuestas abiertas; las decididas se conservan (M-04)
- [x] No genera sugerencias por debajo de una cantidad mínima configurable, para no
      proponer traslados irrisorios
- [x] Con 50 zonas y 40 categorías, el recálculo completo toma menos de 5 s
      (`motor-rendimiento.int.test.ts`, con 20 acopios)

### RF-MOT-006 · Presentar el ranking
**Actor:** Administrador · **Prioridad:** DEBE

**Criterios de aceptación:**
- [ ] Lista ordenada por puntaje descendente
- [ ] Cada fila: origen, destino, categoría, cantidad, puntaje y **su justificación
      en lenguaje natural** — «Zona 7 tiene 12 % de cobertura en agua; Acopio Norte
      tiene 800 L sobre su máximo, a 41 km»
- [ ] Filtrable por zona, por acopio y por categoría
- [ ] **La justificación no es opcional.** Nadie aprueba un traslado por un número
      que no entiende

### RF-MOT-007 · Aprobar o descartar una sugerencia
**Actor:** Administrador · **Prioridad:** DEBE

```
PROPUESTA ──aprobar──→ APROBADA → genera Remision en BORRADOR
    └──descartar──→ DESCARTADA (motivo obligatorio)
```

**Criterios de aceptación:**
- [x] **Ninguna sugerencia se ejecuta sola**: aprobar solo arma una remisión en borrador
- [ ] Al aprobar, la cantidad es editable antes de confirmar
- [x] Descartar exige motivo escrito (10 caracteres o más). El mismo par no se vuelve a
      proponer durante 24 horas
- [ ] Los motivos de descarte se agregan en un informe: sirven para afinar los pesos
- [x] Queda registrado quién aprobó y cuándo

### RF-MOT-008 · Gestionar remisiones
**Actor:** Operador, Administrador · **Prioridad:** DEBE

```
BORRADOR → EN_TRANSITO → RECIBIDA
```

**Criterios de aceptación:**
- [ ] Cabecera con origen, responsable y fecha; líneas de categoría y cantidad
- [ ] El destino es una zona específica, o queda como **despacho general** sin
      zona fija — varios camiones salen del mismo acopio y no siempre se sabe de
      entrada a dónde llega cada uno
- [ ] Al pasar a `EN_TRANSITO` se generan los movimientos de `SALIDA` del acopio
- [ ] Ninguna línea puede exceder el saldo disponible en origen
- [ ] Genera un documento imprimible con **código QR**
- [ ] Opcionalmente, vincula folios de donaciones a la remisión — ver
      [RF-CMP-007](comprobantes.md#rf-cmp-007)
- [ ] Una remisión en tránsito no se edita; se cancela y se rehace

### RF-MOT-009 · Confirmar recepción en zona
**Actor:** Receptor · **Prioridad:** DEBE

Diseñada para condiciones reales, no para una auditoría: la persona en la zona no
cuenta unidad por unidad, solo confirma que el envío llegó.

**Criterios de aceptación:**
- [ ] Ve la lista de remisiones en tránsito hacia su zona; escanear el QR es un
      atajo opcional, no obligatorio
- [ ] Una remisión de **despacho general**, sin zona fija, también aparece —
      cualquier Receptor la puede tomar; al confirmarla, `zona_destino_id` se fija
      a la suya propia, igual que el Operador reasigna el acopio de un folio
      ([RF-CMP-001C](comprobantes.md#rf-cmp-001c))
- [ ] Un botón **«Recibido»** confirma la llegada completa, sin pedir desglose por
      categoría
- [ ] **Al menos una fotografía de evidencia es obligatoria** para poder confirmar
- [ ] Al confirmar, genera automáticamente los movimientos de `RECEPCION` en la
      zona, usando la cantidad planeada de cada línea — no hay conteo estructurado
      en esta fase
- [ ] La remisión pasa a `RECIBIDA` y suma al conteo agregado de despachos
      recibidos — la donación de cada folio ya se cerró antes, al conciliarse
      ([RF-CMP-004](comprobantes.md#rf-cmp-004--conciliar-contra-movimiento))
- [ ] Si algo llegó visiblemente distinto, el Receptor lo anota como nota libre
      junto a la evidencia (`remision.nota_recepcion`), sin que eso bloquee la
      confirmación

### RF-MOT-011 · Reportar necesidad de zona
**Actor:** Receptor · **Prioridad:** DEBE

Distinto del cálculo automático de déficit ([RF-MOT-003](#rf-mot-003)):
la canasta estándar predice cantidades genéricas, pero no lo que la persona en el
terreno ve y que ninguna fórmula anticipa — un lote de medicinas dañado, ropa de
talla específica, algo que dejó de alcanzar.

**Criterios de aceptación:**
- [ ] El Receptor elige una o varias categorías del catálogo, con un toque cada una
- [ ] Nota corta opcional junto a la selección, sin exigir dato personal alguno
- [ ] **Append-only**: cada envío crea un reporte nuevo, nunca se edita ni se borra
      uno anterior — igual que `movimiento` ([ADR-0002](../../02-arquitectura/adr/ADR-0002-saldo-derivado.md))
- [ ] No depende de que haya una remisión en curso: se reporta en cualquier momento
- [ ] La necesidad vigente de una categoría en una zona es su reporte más
      reciente; si ese último viene marcado como resuelto, no hay necesidad vigente
- [ ] Quitar una categoría —porque ya llegó o dejó de hacer falta— es otro reporte,
      marcado como resuelto: la necesidad se cierra sin borrar la historia
- [ ] La interfaz advierte que la nota es pública: sin nombres, teléfonos ni
      direcciones
- [ ] Antigüedad visible en todo momento (RNF-04)
- [ ] Alimenta el mapa público — ver [RF-RED-009](red.md#rf-red-009)

### RF-MOT-010 · Evaluar el motor
**Actor:** Equipo · **Prioridad:** DEBERÍA

El módulo tiene que producir un resultado medible, no una opinión.

**Criterios de aceptación:**
- [ ] Simulador que compara el motor contra reparto igualitario y contra reparto
      por cercanía
- [ ] Mide desviación estándar de cobertura entre zonas y proporción de insumo vencido
- [ ] Resultados reproducibles con semilla fija
- [ ] Es el material central de la sustentación
