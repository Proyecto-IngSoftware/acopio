---
title: "C04 · Entrada rápida de inventario"
type: prompt
tags: [diseno, ui, prompt]
estado: vigente
actualizado: 2026-08-20
---

# C04 · Entrada rápida de inventario

**Ruta:** `/consola/entrada` · **Acceso:** Operador, Admin

> **Es la pantalla más importante del sistema.** Si registrar es tedioso, el
> operador no lo hace, y sin dato el sistema entero queda ciego. Todo lo demás
> depende de que esta pantalla sea rápida.

**Objetivo:** registrar una entrada de mercancía en **menos de 10 segundos**, de
pie, con una mano, con guantes.

---

## Prompt

Construye la pantalla de entrada rápida de inventario.

### Estructura

Pantalla completa, sin desplazamiento vertical en un teléfono de 360 × 640 px. Tres
zonas verticales:

**Zona superior — contexto (fija, ~64 px)**
- Conmutador de ubicación activa: `Acopio Norte ▾`
- A la derecha, indicador de sincronización: `✓ En línea` o `⏳ 3 sin enviar`

**Zona media — selección de categoría**

Dos vías al mismo alcance, nunca una escondida detrás de la otra:

1. Botón grande **«Escanear»** con ícono de código de barras, 72 px de alto, ancho
   completo, en color de marca.
2. Campo de búsqueda debajo: *«o busca por nombre…»*, 56 px de alto.
   - Resultados al teclear, tolerante a tildes y a errores de tipeo:
     «panal» encuentra «Pañal adulto», «aroz» encuentra «Arroz»
   - Máximo 6 resultados, cada uno de 56 px, mostrando nombre, unidad y saldo actual
   - Bajo el campo, fila desplazable horizontal con las **6 categorías más usadas
     en esta ubicación**, como atajos

**Zona inferior — cantidad (aparece al elegir categoría)**

- Nombre de la categoría elegida, en 22 px y peso 700, con una `✕` para cambiarla
- **Campo numérico de 64 px de alto y texto de 28 px**, teclado numérico nativo
  (`inputmode="decimal"`), con la unidad dentro del campo a la derecha, atenuada
- Botones `−` y `+` de 56 px a cada lado
- Si la categoría es perecedera: selector de fecha de vencimiento, obligatorio
- Botón primario **«Registrar»**: ancho completo, 56 px, fijo al fondo

### Confirmación

Al registrar, no navegues a otra pantalla. Muestra en el mismo lugar, durante 2
segundos:

```
✓ Registrado
Agua embotellada  +200 L
Saldo ahora: 1.440,0 L
```

Y vuelve a dejar el foco listo para la siguiente entrada. **El operador
normalmente registra varias cosas seguidas**; obligarlo a volver atrás rompe el
ritmo.

### Advertencia de «no recibir»

Si la categoría elegida está marcada como *no recibir* en esta ubicación, muestra
un aviso en morado sobre el campo de cantidad:

> ⚠ Este acopio marcó «no recibir» esta categoría. Puedes registrarla igual si ya
> llegó físicamente.

**Advierte, no bloquea.** La donación ya está en la puerta.

### Estados

- **Sin categoría elegida:** la zona inferior no existe. La pantalla se ve vacía y
  tranquila, con el botón de escanear dominando.
- **Escaneando:** cámara a pantalla completa con recuadro guía y un botón
  **«Entrada manual»** siempre visible, del mismo tamaño que el disparador.
- **Código desconocido:** hoja inferior con *«No conocemos este código. ¿A qué
  categoría corresponde?»* y el buscador. Al elegir, queda aprendido.
- **Offline:** franja ámbar fija arriba: `Sin conexión · 3 movimientos en cola`.
  La pantalla funciona idéntica; solo cambia el texto de confirmación a
  *«Guardado. Se enviará al recuperar señal.»*
- **Error del servidor:** el movimiento no se pierde; pasa a la cola y se avisa.

### Datos

```
GET  /api/categorias/buscar?q=&ubicacion=      búsqueda tolerante
GET  /api/categorias/frecuentes?ubicacion=     los 6 atajos
GET  /api/codigos-barras/:ean                  resolución de escaneo
POST /api/movimientos                          registro
```

Sin conexión, `POST` se encola en IndexedDB con `ocurrido_en` local y se reenvía en
orden al recuperar señal.

### Móvil y escritorio

Está diseñada para móvil. En escritorio, limita el ancho a 480 px y céntrala. **No
la reorganices en columnas**: la disposición vertical es la correcta y la que el
operador ya conoce del teléfono.

### Lo que NO debe tener

- Ningún campo opcional visible por defecto
- Ningún paso de confirmación intermedio
- Ningún menú desplegable para la categoría: buscador y atajos, nada más
- Ninguna animación de más de 200 ms
