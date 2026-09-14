---
title: "P01 · Portada pública"
type: prompt
tags: [diseno, ui, prompt]
estado: vigente
actualizado: 2026-08-20
---

# P01 · Portada pública

**Ruta:** `/` · **Acceso:** público

**Objetivo:** que alguien que llega por un enlace de WhatsApp entienda en cinco
segundos qué pasa y qué puede hacer.

---

## Prompt

Construye la portada pública.

### Estructura, en orden

**1 · Barra superior**
Logotipo a la izquierda. A la derecha, un enlace discreto *«Entrar»* hacia la
consola. Sin menú de navegación: esta página tiene una sola dirección, hacia abajo.

**2 · Hero**
- Nombre de la emergencia y una **frase de estado, no un eslogan**:
  *«Terremoto de 2026 · 14 zonas afectadas, 9 aún sin cobertura suficiente»*
- Fondo: fotografía real de la operación en blanco y negro con superposición
  `--neutro-900` al 60 %, o color plano `--marca-900` si no hay foto. **Nunca
  ilustración ni foto de archivo.**
- Texto en blanco, título en 36 px y peso 700

**3 · Cifras vivas** — inmediatamente bajo el hero, superponiéndose ligeramente

Cuatro tarjetas en fila, dos por fila en móvil:

```
┌─────────────────┐
│  1.240          │
│  toneladas      │
│  movilizadas    │
│  hace 12 min    │  ← antigüedad, obligatoria
└─────────────────┘
```

Cifras en 36 px, tabulares. Etiqueta en 14 px. **Antigüedad en 12 px, siempre
presente.** Las cuatro: toneladas movilizadas, acopios activos, zonas atendidas,
cupos abiertos.

**4 · Tres acciones** — el corazón de la página

Tres tarjetas del **mismo peso visual**. Ninguna destaca sobre las otras: son tres
formas igual de válidas de ayudar.

| | Título | Texto | Destino |
|---|---|---|---|
| 💳 | Donar dinero | Te llevamos al sitio oficial de la entidad que administra cada causa | `/causas` |
| 📦 | Donar en especie | Mira qué hace falta antes de comprar, y a qué acopio llevarlo | `/mapa` |
| 🤝 | Ser voluntario | Reserva un cupo en una jornada. Sin cuenta, solo tu correo | `/jornadas` |

En móvil se apilan verticalmente, cada una de 120 px de alto mínimo.

**5 · Aviso permanente**

Franja de `--marca-50` con borde superior, texto en `--marca-900`:

> **Esta plataforma no recibe dinero.** Te mostramos el paso a paso y te llevamos
> al sitio oficial de cada entidad.

No es letra pequeña. Es una declaración de identidad y va en 16 px.

**6 · Carrusel de entidades verificadas**

- Título: *«Entidades verificadas»*
- Tarjetas desplazables horizontalmente: logotipo, nombre, sello con **la fecha de
  verificación** — *«Verificada el 12 de agosto de 2026»*
- **Solo entidades con sello vigente.** Sin sello, no aparece
- Desplazamiento con arrastre en móvil, con flechas en escritorio
- Cada tarjeta lleva a la ficha de la entidad

**7 · Noticias** — hasta tres entradas, con fecha e imagen opcional

**8 · Pie**
Enlaces a política de tratamiento de datos, términos y contacto. Repetir el aviso
de no recepción de dinero, esta vez en 14 px.

### Estados

- **Carga:** esqueletos con la forma de las tarjetas de cifras y de acciones. El
  hero se pinta de inmediato, sin depender de datos.
- **Sin cifras disponibles:** oculta la sección entera. **No muestres ceros**: un
  cero se lee como «no ha llegado nada», que es un mensaje muy distinto de «no
  tenemos el dato».
- **Sin entidades verificadas:** oculta el carrusel.
- **Sin noticias:** oculta la sección.

### Datos

```
GET /api/publico/metricas      cifras vivas, con marca de tiempo
GET /api/publico/entidades     solo verificadas y vigentes
GET /api/publico/noticias      publicadas, máximo 3
GET /api/publico/emergencia    nombre y frase de estado
```

### Rendimiento y difusión

- **Menos de 3 s hasta contenido útil en 3G.** El hero no depende de JavaScript
  para leerse.
- Imagen del hero en WebP con alternativa, y `loading="lazy"` en todo lo demás.
- **Metadatos Open Graph correctos**: título, descripción e imagen de vista previa.
  El criterio de aceptación real es que **al pegar el enlace en WhatsApp aparezca
  la tarjeta completa** — ese es el canal de difusión que importa aquí, más que la
  indexación en buscadores.

### Tono

Serio y directo. Los números hablan solos, no hace falta adjetivarlos. Nada de
signos de exclamación ni de lenguaje motivacional.
