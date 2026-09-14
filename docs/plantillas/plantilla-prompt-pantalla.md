---
title: "XNN · Nombre de la pantalla"
type: prompt
tags: [diseno, ui, prompt]
estado: vigente
actualizado: 2026-08-20
---

# XNN · Nombre de la pantalla

**Ruta:** `/ruta` · **Acceso:** público | rol

**Objetivo:** una frase. Qué logra el usuario aquí.

---

## Prompt

Construye ⟨descripción⟩.

### Estructura

Orden de jerarquía, de arriba abajo. Diagramas ASCII cuando la disposición no se
entienda con palabras.

### Interacciones

Qué puede hacer el usuario y qué pasa después.

### Estados

**Los cuatro son obligatorios.** Una pantalla sin estado vacío definido lo improvisa,
y lo improvisado sale mal.

- **Vacío:** qué significa y qué hacer, con el botón al lado
- **Carga:** esqueleto con la forma del contenido, nunca un giro centrado
- **Error:** qué pasó y qué hacer, en lenguaje llano
- **Offline:** si aplica, indicador permanente con operaciones en cola

### Datos

```
GET  /api/...
POST /api/...
```

### Móvil

Qué cambia bajo 640 px. **Es la vista principal, no la adaptación.**

### Lo que NO debe tener

Lista explícita. Ahorra más tiempo que la lista de lo que sí.

---

## Cómo usar esta plantilla

1. Pega primero [_base.md](../03-diseno/prompts-lovable/_base.md) en Lovable — una
   vez por proyecto
2. Copia esta plantilla a `docs/03-diseno/prompts-lovable/` con el ID de la pantalla
3. Registra el archivo en
   [prompts-lovable/README.md](../03-diseno/prompts-lovable/README.md)
4. Tras generar en Lovable, sustituye las llamadas a Supabase por llamadas a nuestra
   API; conserva solo lo que toca `supabase.auth`
