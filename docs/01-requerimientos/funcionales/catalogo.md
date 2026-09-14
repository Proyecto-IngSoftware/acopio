---
title: "RF-CAT · Catálogo maestro"
type: requerimientos
tags: [requerimientos, rf]
estado: vigente
modulo: catalogo
bloque: 0
actualizado: 2026-09-12
---

# RF-CAT · Catálogo maestro

**Bloque 0** · Prerrequisito del inventario y del motor.

Un catálogo mal dimensionado hunde el proyecto en las dos direcciones: demasiadas
categorías vuelven imposible la entrada rápida; demasiado pocas hacen inútil el
emparejamiento.

---

### RF-CAT-001 · Gestionar categorías
**Actor:** Administrador · **Prioridad:** DEBE

**Criterios de aceptación:**
- [ ] Nombre, grupo, unidad base, marca de perecedero, sinónimos de búsqueda
- [ ] Grupos previstos: alimentos, agua y bebidas, aseo personal, aseo del hogar,
      salud, ropa y abrigo, bebé, adulto mayor, animales, herramientas
- [ ] Unidad base: litro, kilogramo o unidad. **Fija; no se mezclan unidades dentro
      de una categoría**
- [ ] Los sinónimos alimentan la búsqueda por palabra clave de C04
- [ ] Una categoría con movimientos no se elimina, se archiva
- [ ] Objetivo de tamaño: entre 25 y 40 categorías activas (ver P-003)

### RF-CAT-002 · Buscar categoría por palabra clave
**Actor:** Operador · **Prioridad:** DEBE

**Criterios de aceptación:**
- [ ] Búsqueda insensible a mayúsculas, tildes y errores de tipeo
- [ ] «panal» encuentra «Pañal adulto»; «aroz» encuentra «Arroz»
- [ ] Los sinónimos definidos en RF-CAT-001 son términos de búsqueda válidos
- [ ] Resultados ordenados por frecuencia de uso en esa ubicación
- [ ] Responde en menos de 100 ms con el catálogo completo

### RF-CAT-003 · Definir la canasta estándar
**Actor:** Administrador · **Prioridad:** DEBE

**Criterios de aceptación:**
- [ ] Cantidad por persona y por día para cada categoría que aplique
- [ ] **Campo de fuente obligatorio**: norma Esfera, UNGRD, Cruz Roja u otra
- [ ] No todas las categorías tienen canasta; las que no, quedan fuera del cálculo
      automático de necesidad
- [ ] Los valores son versionados: cambiar la canasta no reescribe el histórico
- [ ] La fuente se muestra en la ficha de zona, junto al cálculo

**Nota:** este requerimiento está bloqueado por
[P-001](../pendientes.md). Sin fuente citable, el motor entero queda sin defensa.

### RF-CAT-004 · Mapear códigos de barras
**Actor:** Administrador, Operador · **Prioridad:** DEBERÍA

**Criterios de aceptación:**
- [ ] Tabla de EAN a categoría, muchos a uno
- [ ] Opcionalmente, descripción del producto y su **contenido en la unidad base**
      de la categoría —una botella de 600 ml es 0,6 L—, para que escanear cuente
      presentaciones y el sistema convierta. Sin contenido registrado, la cantidad
      se escribe directo en la unidad base
- [ ] Un operador puede asociar un EAN desconocido durante la entrada rápida, y
      queda aprendido para todos
- [ ] Las asociaciones creadas por operadores se marcan para revisión del
      administrador
- [ ] **El mapeo es un atajo, no la base del modelo.** Buena parte de la donación
      —ropa usada, grano a granel, cajas mixtas— no tiene código de barras

### RF-CAT-005 · Gestionar emergencias
**Actor:** Administrador · **Prioridad:** DEBE

**Criterios de aceptación:**
- [ ] Nombre, tipo, fecha de inicio, estado y horizonte de días por defecto
- [ ] Solo una emergencia activa a la vez en la interfaz
- [ ] Toda entidad operativa cuelga de una emergencia
- [ ] Cerrar una emergencia deja sus datos en solo lectura, sin borrarlos

### RF-CAT-006 · Configurar pesos del motor
**Actor:** Administrador · **Prioridad:** DEBERÍA

**Criterios de aceptación:**
- [ ] Los cuatro pesos —criticidad, urgencia, proximidad, magnitud— son editables
- [ ] Se valida que sumen 1
- [ ] Cambiarlos no altera sugerencias ya aprobadas
- [ ] Vista previa del efecto sobre el ranking actual antes de guardar
