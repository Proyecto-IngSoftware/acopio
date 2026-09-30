---
title: "Sistema de diseño"
type: diseno
tags: [diseno]
estado: vigente
actualizado: 2026-09-30
---

# Sistema de diseño

**Móvil primero, sin excusas.** La consola se diseña para un teléfono en la mano de
alguien que está descargando un camión. El escritorio es la adaptación, no al revés.

---

## 1. Contexto de uso — de aquí sale todo lo demás

El operador de acopio usa el sistema **de pie, con una mano ocupada, con guantes,
bajo sol directo, con el celular al 12 % y señal intermitente**, a veces con una
fila de gente esperando.

Ninguna decisión visual de este documento es estética. Todas salen de esa frase.

| Condición | Consecuencia de diseño |
|---|---|
| Una sola mano | Acciones primarias en la mitad inferior de la pantalla |
| Con guantes | Área táctil mínima de 48 × 48 px, sin excepción |
| Bajo sol | Contraste AAA en el texto, cero degradados |
| Batería baja | Fondo claro, sin animación decorativa, sin video |
| Señal intermitente | Estado offline siempre visible, nunca un error genérico |
| Con prisa | Un dato por línea, jerarquía brutal, cero adorno |

---

## 2. Color

La paleta sale del tema «Acopio Field Command» del proyecto de Stitch
([ADR-0013](../02-arquitectura/adr/ADR-0013-estetica-desde-stitch.md)). Los tokens
llevan los mismos nombres que en Stitch.

### La regla que manda sobre todas

**Los colores de estado significan estado.** El verde de éxito, el ámbar y el rojo de
error no decoran botones, enlaces ni fondos. El rojo coral de la marca se usa solo
para lo que no se debe traer y para acciones destructivas: en los dos casos dice
«detente». Viene de [ADR-0006](../02-arquitectura/adr/ADR-0006-color-semantico-reservado.md),
ajustado por ADR-0013.

### Tokens

```css
/* Marca */
--primary:                   #003730;  /* franja oscura, botones de mayor peso */
--primary-container:         #085046;  /* color de marca, acción principal */
--on-primary:                #ffffff;
--primary-fixed:             #b0efe1;  /* fondos suaves de marca */
--primary-fixed-dim:         #95d2c5;  /* texto secundario sobre la franja */
--on-primary-fixed:          #00201b;
--surface-tint:              #2a685d;

/* Superficies y texto */
--background:                #faf8ff;
--surface:                   #faf8ff;
--surface-container-lowest:  #ffffff;  /* tarjetas */
--surface-container-low:     #f2f3ff;  /* filas dentro de una tarjeta */
--surface-container:         #eaedff;
--surface-container-high:    #e2e7ff;  /* avisos, botones terciarios */
--surface-container-highest: #dae2fd;
--on-surface:                #131b2e;  /* texto principal */
--on-surface-variant:        #3f4946;  /* texto secundario */
--outline:                   #707976;
--outline-variant:           #bfc9c5;  /* bordes */
--inverse-surface:           #283044;

/* Detente: no traer y acciones destructivas */
--secondary:                 #b51d04;
--secondary-container:       #d9381e;
--on-secondary:              #ffffff;
--secondary-fixed:           #ffdad3;
--on-secondary-fixed-variant:#8f1100;

/* Estados */
--error:                     #ba1a1a;
--error-container:           #ffdad6;
--on-error-container:        #93000a;
--tertiary-container:        #6e3900;
--tertiary-fixed:            #ffdcc3;
--exito:                     #15803d;  /* del texto del tema de Stitch */
--exito-container:           #f0fdf4;
```

### Escala de estados (propuesta por aprobar)

La Portada de Stitch pinta «Crítico» y «Urgente» con el mismo rojo, y no se
distinguen. La propuesta los separa por intensidad dentro del mismo rojo, y además por
ícono y texto:

| Estado | Condición | Aspecto | Ícono |
|---|---|---|---|
| Crítico | Agotado, o bajo la mitad del mínimo | Relleno `--error` `#ba1a1a`, texto blanco | `error` |
| Urgente | Bajo el mínimo | Fondo `--error-container` `#ffdad6`, texto `--on-error-container` `#93000a` | `priority_high` |
| Moderado | Por debajo de 1,25 veces el mínimo | Fondo `--tertiary-fixed` `#ffdcc3`, texto `--tertiary-container` `#6e3900` | `schedule` |
| Suficiente | En rango | Fondo `--exito-container` `#f0fdf4`, texto `--exito` `#15803d` | `check_circle` |
| Saturado | Sobre el máximo | Relleno `--secondary-container` `#d9381e`, texto blanco | `inventory` |
| No recibir | Interruptor del acopio o categoría vetada | Relleno `--secondary-container`, texto blanco, nombre tachado | `block` |

Crítico lleva relleno sólido y Urgente solo un fondo tenue: la diferencia se ve aunque
se lea en escala de grises. Las condiciones cambian las de la escala anterior, que tenía
un solo nivel bajo el mínimo; cuando se apruebe, `packages/shared` las implementa.

**El color nunca va solo.** Siempre ícono y texto además del color.

---

## 3. Tipografía

**Inter**, una sola familia, con la escala del tema de Stitch:

| Token | Tamaño / interlínea | Peso | Uso |
|---|---|---|---|
| `display-hero-mobile` | 32 / 40 px | 700 | Cifra o titular principal en móvil |
| `headline-lg-mobile` | 26 / 34 px | 700 | Título de la franja de emergencia |
| `headline-md` | 24 / 32 px | 600 | Títulos de pantalla |
| `headline-sm` | 20 / 28 px | 600 | Títulos de sección |
| `body-lg` | 18 / 28 px | 400 | Texto destacado |
| `body-md` | 16 / 24 px | 400 | Texto corriente y datos |
| `body-sm` | 14 / 20 px | 400 | Texto secundario |
| `label-md` | 14 / 20 px | 600 | Etiquetas de botones y filas |
| `label-caps` | 12 / 16 px, espaciado 0,06em | 700 | Rótulos cortos en mayúsculas |
| `label-metric` | 20 / 24 px | 700 | Cifras de tablero |

### Reglas

- **16 px es el piso para cualquier dato operativo.** 14 px para texto secundario y
  etiquetas; 12 px solo en `label-caps`.
- `label-caps` se usa para rótulos cortos (estados, «Emergencia activa»), nunca para
  frases.
- **Cifras tabulares siempre** en cantidades: `font-variant-numeric: tabular-nums`.
- **La unidad va siempre junto a la cifra**, en peso menor: `1.240 L`, nunca `1240`.
- Formato colombiano: punto de miles, coma decimal. `1.240,5 L`.
- Nada de pesos 300 ni 200.

---

## 4. Espaciado, radio y sombra

```css
--space-xs: 4px;   --space-md: 16px;   --space-xl: 40px;
--space-sm: 8px;   --space-lg: 24px;   --margin:   16px;

--radius:      2px;
--radius-lg:   4px;    /* etiquetas de estado */
--radius-xl:   8px;    /* tarjetas, botones, filas */
--radius-full: 12px;   /* píldoras */
```

Los nombres siguen la configuración de Tailwind que exporta Stitch, donde `rounded-xl`
vale 8 px.

**Sombras cortas y de poco alcance** para separar tarjetas del fondo (`shadow-sm` en
filas, `shadow-md` en tarjetas principales). La cabecera y la barra inferior llevan
fondo translúcido con desenfoque. Sin degradados.

---

## 5. Componentes

### Botón

| Variante | Uso | Alto |
|---|---|---|
| Primario | Acción principal, uno por pantalla | 56 px, ancho completo en móvil |
| Secundario | Acción alterna, borde sin relleno | 48 px |
| Fantasma | Terciaria, solo texto | 48 px |
| Peligro | Destructiva, fondo `--estado-critico` | 48 px |

Estado de carga con texto: *«Guardando…»*, no solo un giro. El operador necesita
saber qué está pasando, no que algo pasa.

### Campo numérico

El más importante del sistema. Se usa en C04, decenas de veces al día.

- Teclado numérico nativo: `inputmode="decimal"`
- Alto de 64 px, texto de 28 px
- Unidad visible dentro del campo, a la derecha, atenuada
- Botones `−` y `+` de 56 px a cada lado para ajuste fino
- Selección automática del contenido al enfocar

### Tarjeta de categoría

```
┌────────────────────────────────────────┐
│ ✓  Agua embotellada                    │
│                                        │
│    1.240,0 L            hace 8 min     │
│    ▔▔▔▔▔▔▔▔▔                          │
│    mín 800 · máx 2.000                 │
└────────────────────────────────────────┘
  borde izquierdo de 4 px con el color del estado
```

- Ícono de estado a la izquierda del nombre
- Cifra grande, tabular, con unidad
- **Antigüedad siempre visible, arriba a la derecha**
- Barra de proporción respecto al máximo
- Toda la tarjeta es tocable y lleva al historial

### Distintivo de antigüedad

```
hace 8 min       neutro-600
hace 2 h         neutro-600
hace 7 h         ámbar + ícono de reloj
hace 2 días      rojo + «dato viejo»
```

Cumple RNF-04. **Aplica a todo dato operativo, sin excepción.** Un número sin
marca de tiempo es una afirmación que nadie puede verificar.

### Estados vacío, de carga y de error

Todo listado define los tres. Nunca una pantalla en blanco.

- **Vacío:** qué significa y qué hacer. *«Este acopio no tiene movimientos
  registrados. Registra el primero.»* con el botón al lado.
- **Carga:** esqueleto con la forma del contenido, nunca un giro centrado.
- **Error:** qué pasó y qué hacer. *«No se pudo guardar. Tu conexión falló; el
  movimiento quedó en cola y se enviará solo.»*

---

## 6. Patrones móviles

### Navegación

**Una sola barra inferior para todos**, con o sin sesión: Inicio, Mapa, Causas,
Voluntariado y Más. Nunca menú hamburguesa. Las herramientas de cada rol se abren desde
«Más». Con sesión, el inicio sigue siendo la Portada y solo cambia la cabecera. Decidido
el 2026-09-30 al normalizar los diseños de Stitch; las piezas están en
[stitch/_compartidos](stitch/_compartidos/README.md).

### Conmutador de contexto

Fijo arriba, siempre visible. Si el usuario tiene una sola ubicación asignada, no
se muestra. Con varias, es un desplegable que ocupa la primera línea.

Cambiar de contexto muestra una confirmación breve: **registrar 400 kg en el acopio
equivocado se corrige con un ajuste, no con un borrado.**

### Hoja inferior

Toda acción secundaria se abre como hoja inferior deslizable, no como modal
centrado. Está al alcance del pulgar y se cierra deslizando.

### Escáner

Pantalla completa, con recuadro guía. Botón de **entrada manual siempre visible** y
al mismo alcance que el disparador: el escáner es un atajo, jamás un requisito
(RF-INV-002).

---

## 7. Densidad por superficie

| | Home | Consola |
|---|---|---|
| Densidad | Baja | Alta |
| Tamaño de texto | Generoso | Compacto pero nunca bajo 16 px |
| Espaciado | Amplio | Ajustado |
| Objetivo | Convencer y orientar | Operar rápido |

Son dos productos distintos que comparten tokens. La portada respira; la consola
trabaja.

---

## 8. Tono e imagen

**Serio, claro y rápido.** Ni la alegría de una startup ni la solemnidad de un
funeral.

- **Cero ilustración.** Fotografía real de la operación, o nada.
- Sin fotos de archivo de gente sonriendo con cajas.
- Los números hablan por sí solos; no hace falta adjetivarlos.
- El texto de interfaz es directo: *«No traigan más agua»*, no *«Recepción
  temporalmente suspendida para esta categoría»*.

---

## 9. Accesibilidad — obligatoria

- Contraste AAA (7:1) en datos operativos, AA (4.5:1) como piso absoluto
- Navegación completa por teclado en la consola
- Etiquetas ARIA en formularios y en estados de semáforo
- **El color nunca es el único portador de significado**
- Área táctil mínima de 48 × 48 px
- El mapa tiene una vista de lista equivalente para lectores de pantalla
- Se respeta `prefers-reduced-motion`

**Verificación:** axe-core sin violaciones críticas, más un recorrido con lector de
pantalla en C03 y C04.

---

## 10. Implementación

Los tokens viven en `packages/ui-tokens` como única fuente de verdad, exportados a
la configuración de Tailwind y a variables CSS. **Ningún componente escribe un
valor hexadecimal directo.**

Los tokens de Tailwind llevan los nombres de Stitch (`bg-primary-container`,
`text-on-surface-variant`, `rounded-xl`), así el marcado que exporta Stitch se adapta
a componentes propios sin traducir colores. Los componentes son propios, en
`apps/web/src/componentes`.
