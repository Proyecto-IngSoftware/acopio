---
title: "RF-RED · Acopios, zonas, entidades y causas"
type: requerimientos
tags: [requerimientos, rf]
estado: vigente
modulo: red
bloque: 1
actualizado: 2026-10-06
---

# RF-RED · Acopios, zonas, entidades y causas

**Bloque 1**

---

### RF-RED-001 · Gestionar centros de acopio
**Actor:** Administrador · **Prioridad:** DEBE

**Ajuste del 2026-09-30 ([P-033](../pendientes.md)).** El Operador asignado maneja lo
operativo de su acopio: pausar y reactivar, horario, indicaciones de acceso y teléfono.
Crear, cerrar y cambiar entidad, nombre, dirección o coordenadas sigue siendo del
Administrador.

**Criterios de aceptación:**
- [ ] Nombre, entidad responsable, dirección, coordenadas, teléfono, horario semanal
- [ ] Estado: `ACTIVO`, `PAUSADO`, `CERRADO`
- [ ] Indicaciones de acceso en texto libre: dónde parquear, por qué puerta entrar
- [ ] Un acopio con movimientos no se elimina, se cierra
- [ ] Al pausar o cerrar un acopio, los Donadores con folios `PREPARADO` hacia él
      reciben aviso por correo: pueden entregar en otro, el folio sirve igual
      (RF-CMP-001C)
- [ ] Las coordenadas se pueden fijar arrastrando un pin en el mapa

### RF-RED-002 · Mapa público de acopios
**Actor:** Cualquiera · **Prioridad:** DEBE

**Criterios de aceptación:**
- [ ] Leaflet con OpenStreetMap, sin API key
- [ ] Filtros: **qué recibe** · **qué no recibe** · abierto ahora · tiene cupo de
      voluntariado
- [ ] El filtro *qué no recibe* es el que evita el viaje inútil con el insumo
      equivocado
- [ ] Botón «cerca de mí», con permiso de ubicación y alternativa por dirección
- [ ] Funciona con el teclado y tiene una vista de lista equivalente para lectores
      de pantalla
- [ ] Carga en menos de 3 s en 3G
- [ ] Distingue acopios **operados** de **referenciados**
      ([RF-RED-011](#rf-red-011--importar-acopios-de-una-fuente-externa)) con
      ícono y texto, no solo con color (RNF-11). Los filtros *qué recibe* y *qué
      no recibe* aplican solo a los operados
- [ ] Agrupa los marcadores cercanos cuando hay muchos en pantalla
- [ ] Muestra la atribución de OpenStreetMap y respeta su política de uso: no
      descarga mosaicos para uso sin conexión
- [ ] La búsqueda por dirección pasa por la API, que consulta Nominatim con caché
      y a no más de una petición por segundo — nunca desde el navegador

### RF-RED-003 · Ficha pública de acopio
**Actor:** Cualquiera · **Prioridad:** DEBE

**Criterios de aceptación:**
- [ ] Dirección, cómo llegar, horario y estado de apertura ahora
- [ ] **Lo que urge**: categorías bajo el mínimo, en positivo — «necesitamos»
- [ ] **Lo que ya no recibe**: categorías marcadas, en claro — «no traigan»
- [ ] Cupos de voluntariado disponibles, con enlace a reservar
- [ ] **Antigüedad visible en todo dato operativo** (RNF-04)
- [ ] Enlace directo a preparar una donación (RF-CMP-001B) con este acopio
      preseleccionado
- [ ] Botón de compartir por WhatsApp con metadatos Open Graph correctos
- [ ] Un acopio **referenciado** muestra solo lo que trae su fuente —estado,
      horario, necesidades en su texto original, contacto—, con la fuente nombrada,
      enlazada y con su antigüedad: «Fuente: RedAcopio Bogotá · actualizado hace
      3 h». No muestra «lo que urge» calculado ni el enlace a preparar una donación

### RF-RED-004 · Gestionar zonas afectadas
**Actor:** Administrador · **Prioridad:** DEBE

Ver [RF-MOT-001](motor.md#rf-mot-001--registrar-zona-afectada) y, para corregir la
población, [RF-MOT-012](motor.md#rf-mot-012--ajustar-la-población-de-una-zona).

### RF-RED-005 · Gestionar entidades
**Actor:** Administrador · **Prioridad:** DEBE

**Criterios de aceptación:**
- [ ] Nombre, tipo, NIT, sitio web, contacto, descripción y logotipo
- [ ] Una entidad puede tener varios acopios y varias causas

### RF-RED-006 · Verificar entidad
**Actor:** Administrador · **Prioridad:** DEBE

La plataforma no recibe dinero, pero **dirige tráfico**. Mandar donantes a una
estafa es el mayor riesgo reputacional del proyecto.

**Criterios de aceptación:**
- [ ] Estado: `SIN_VERIFICAR`, `VERIFICADA`, `RECHAZADA`
- [ ] Verificar exige adjuntar un documento soporte y dejar constancia de quién
      verificó y cuándo
- [ ] El sello se muestra con su fecha: «Verificada el 12 de agosto de 2026»
- [ ] **Una entidad sin verificar no aparece en el carrusel de la portada ni en el
      directorio de causas**
- [ ] La verificación caduca a los 6 meses y exige renovación
- [ ] Si caduca sin renovarse, las causas de esa entidad se archivan solas — no se
      despublican del todo, ver
      [RF-RED-010](#rf-red-010--archivar-una-causa)

### RF-RED-007 · Gestionar causas
**Actor:** Administrador · **Prioridad:** DEBE

**Criterios de aceptación:**
- [ ] Título, categoría, entidad responsable, descripción, imagen
- [ ] Categorías: personas, animales, adultos mayores, personas desaparecidas,
      rescatistas
- [ ] **Pasos numerados** para donar, en texto estructurado
- [ ] URL oficial de destino
- [ ] Duración opcional: pasada esa fecha, se archiva sola
- [ ] Solo se publica si su entidad está `VERIFICADA`

### RF-RED-008 · Directorio y ficha de causa
**Actor:** Cualquiera · **Prioridad:** DEBE

**Criterios de aceptación:**
- [ ] Directorio filtrable por categoría, con la de personas desaparecidas siempre
      presente
- [ ] La ficha muestra entidad, sello de verificación con fecha y pasos numerados
- [ ] Filtro aparte para ver también las archivadas — «causas atendidas», visibles
      por transparencia, fuera del listado principal
- [ ] El botón de salida advierte que se abandona la plataforma
- [ ] Aviso permanente: **esta plataforma no recibe dinero**
- [ ] **La categoría de personas desaparecidas solo enlaza a UBPD, Cruz Roja y
      Medicina Legal. No se almacena ningún dato de personas desaparecidas**
      (ver [fuera-de-alcance](../../00-contexto/fuera-de-alcance.md))

### RF-RED-010 · Archivar una causa
**Actor:** Sistema, Administrador · **Prioridad:** DEBERÍA

Una campaña no desaparece cuando deja de ser la prioridad — se archiva, para que
el espacio principal quede libre para lo que sí necesita atención ahora, sin
borrar la rendición de cuentas de lo anterior.

**Criterios de aceptación:**
- [ ] Se archiva sola al pasar su duración
      ([RF-RED-007](#rf-red-007--gestionar-causas)), o cuando la verificación de
      su entidad caduca sin renovarse
      ([RF-RED-006](#rf-red-006--verificar-entidad))
- [ ] El Administrador también puede archivarla o reactivarla a mano, en
      cualquier momento
- [ ] Una causa archivada deja de destacarse en la portada
      ([RF-HOM-003](home.md#rf-hom-003--gestionar-contenido)) y sale del
      directorio principal, pero sigue visible en el filtro de archivadas
      ([RF-RED-008](#rf-red-008--directorio-y-ficha-de-causa)) — con su sello de
      verificación y su fecha, igual que antes
- [ ] Archivar una causa no afecta a los acopios de la entidad: siguen operando
      según su propio estado ([RF-RED-001](#rf-red-001--gestionar-centros-de-acopio)),
      decisión aparte del Administrador

### RF-RED-009 · Mapa de necesidades por zona
**Actor:** Cualquiera · **Prioridad:** DEBERÍA

Extiende el mapa público más allá de los acopios: además de qué recibe y qué no
recibe cada acopio, muestra qué necesita cada zona, reportado por quien está ahí.
Cierra el círculo con el donante — ve qué falta en destino, no solo en el punto de
entrega, y decide qué comprar con esa información.

**Criterios de aceptación:**
- [ ] Capa o filtro adicional en el mapa (RF-RED-002) con las zonas y sus
      categorías reportadas como necesarias
- [ ] Zona representada como área aproximada, no como dirección exacta — **no
      invita a nadie a desplazarse hasta ahí**, la zona no recibe visitas
- [ ] Cada necesidad muestra su categoría, antigüedad y la nota si existe
- [ ] Se alimenta de [RF-MOT-011](motor.md#rf-mot-011)
- [ ] Si no hay reportes recientes para una zona, se muestra vacío, no "sin
      necesidad" — la ausencia de dato no es lo mismo que la ausencia de necesidad

### RF-RED-011 · Importar acopios de una fuente externa
**Actor:** Sistema, Administrador · **Prioridad:** DEBERÍA

La red de acopios de Bogotá ya la mapea y mantiene la comunidad; rehacerla a mano
duplica ese trabajo y envejece rápido. Los puntos importados entran como
**referenciados**: aparecen en el mapa y en el directorio con los datos de su
fuente, pero no operan inventario en Acopio. Decisión y riesgo aceptado en
[P-022](../pendientes.md); evidencia en
[I-003](../../00-contexto/investigaciones.md).

**Criterios de aceptación:**
- [ ] Un importador programado lee la fuente cada 60 minutos, con un User-Agent
      que identifica a Acopio y un contacto
- [ ] Primera fuente: RedAcopio Bogotá. Cada fuente es un adaptador aparte:
      agregar otra no toca el resto del sistema
- [ ] Solo se importan los puntos que la fuente marca como verificados
- [ ] Cada punto se identifica por `fuente` + `fuente_id`: reimportar actualiza,
      nunca duplica
- [ ] Estado: abierto → `ACTIVO` · lleno → `PAUSADO` · cerrado → `CERRADO` ·
      cualquier otro valor → `PAUSADO`. El texto original queda en `fuente_estado`
- [ ] Las necesidades se guardan y se muestran en el texto de la fuente; no se
      traducen a categorías del catálogo
- [ ] Un punto que deja de aparecer en la fuente se cierra, no se borra
- [ ] Si la lectura falla o el formato cambió —cero puntos, campos faltantes—, la
      sincronización se aborta completa, se conservan los últimos datos buenos y se
      avisa al Administrador
- [ ] El Administrador puede ocultar un punto referenciado, y el importador
      respeta esa marca
- [ ] El Administrador puede convertir un punto referenciado en operado cuando
      ese acopio empieza a usar Acopio: se le asigna entidad y deja de
      sincronizarse
- [ ] Alternativa siempre disponible: carga de puntos referenciados por CSV, con
      las mismas reglas

**Depende de:** RF-RED-001, RF-RED-002
