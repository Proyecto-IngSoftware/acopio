---
title: "RF-XXX · Nombre del módulo"
type: requerimientos
tags: [requerimientos, rf]
estado: vigente
modulo: nombre-modulo
bloque: 0
actualizado: 2026-08-20
---

# RF-XXX · Nombre del módulo

**Bloque N**

Principio rector del módulo, en una frase.

---

### RF-XXX-001 · Título
**Actor:** quién · **Prioridad:** DEBE | DEBERÍA | PODRÍA
**Depende de:** RF-YYY-002

Descripción de qué hace el sistema.

**Criterios de aceptación:**
- [ ] Verificable, no interpretable
- [ ] Se comprueba mirando la pantalla o ejecutando una prueba

---

## Cómo usar esta plantilla

**Prioridades:**
- `DEBE` — sin ello el módulo no existe
- `DEBERÍA` — se recorta si el calendario aprieta
- `PODRÍA` — lo primero que cae

**Criterios de aceptación.** Un criterio que no se pueda verificar mirando la
pantalla o corriendo una prueba está mal escrito. «La interfaz debe ser intuitiva»
no es un criterio; «el recorrido completo toma menos de 10 segundos» sí lo es.

**Numeración.** Un número asignado no se reutiliza jamás, aunque el requerimiento se
elimine. Los planes, las pruebas y los commits lo citan.

Registra el archivo nuevo en
[01-requerimientos/funcionales/README.md](../01-requerimientos/funcionales/README.md).
