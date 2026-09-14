---
title: "Sistema de diseño"
type: diseno
tags: [diseno]
estado: vigente
actualizado: 2026-08-20
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
| Bajo sol | Contraste AAA, bordes en vez de sombras, cero degradados |
| Batería baja | Fondo claro, sin animación decorativa, sin video |
| Señal intermitente | Estado offline siempre visible, nunca un error genérico |
| Con prisa | Un dato por línea, jerarquía brutal, cero adorno |

---

## 2. Color

### La regla que manda sobre todas

**El color semántico está reservado.** Ver
[ADR-0006](../02-arquitectura/adr/ADR-0006-color-semantico-reservado.md).

Si el botón primario fuera verde, el verde dejaría de significar «hay suficiente».
Por eso la marca es teal, no roja ni verde.

### Tokens

```css
/* Marca */
--marca-900: #0A4F4F;
--marca-700: #0F6E6E;   /* primario */
--marca-500: #14A0A0;
--marca-100: #C7E8E8;
--marca-50:  #E6F4F4;

/* Neutros — gris cálido, no azulado */
--neutro-900: #1C1917;  /* texto principal */
--neutro-700: #44403C;
--neutro-600: #57534E;  /* texto secundario */
--neutro-400: #A8A29E;  /* deshabilitado */
--neutro-200: #E7E5E4;  /* bordes */
--neutro-100: #F5F5F4;  /* fondo de tarjeta */
--neutro-50:  #FAFAF9;  /* lienzo */
--blanco:     #FFFFFF;

/* Semáforo — RESERVADOS */
--estado-critico:    #DC2626;  /* escaso, bajo el mínimo */
--estado-atencion:   #D97706;  /* cerca del mínimo */
--estado-ok:         #16A34A;  /* en rango */
--estado-saturado:   #7C3AED;  /* sobre el máximo, no recibir */

/* Fondos de estado, para tarjetas y filas */
--fondo-critico:  #FEF2F2;
--fondo-atencion: #FFFBEB;
--fondo-ok:       #F0FDF4;
--fondo-saturado: #F5F3FF;
```

### Uso del semáforo

| Estado | Condición | Color | Ícono | Texto |
|---|---|---|---|---|
| Crítico | `saldo < minimo` | rojo | ▼ | Escaso |
| Atención | `saldo < minimo × 1.25` | ámbar | ! | Poco |
| Suficiente | en rango | verde | ✓ | Bien |
| Saturado | `saldo > maximo` | morado | ▲ | De sobra |
| No recibir | interruptor activo | morado | ✕ | No recibir |

**El color nunca va solo.** Siempre ícono y texto además del color. Alrededor del
8 % de los hombres tiene alguna deficiencia en la visión del rojo y el verde; aquí
leer mal el estado significa mandar agua al lugar equivocado.

---

## 3. Tipografía

**Inter.** Sin alternativa, sin segunda familia. Una familia bien usada se ve más
intencional que dos combinadas.

```css
--fuente: 'Inter', system-ui, sans-serif;

--texto-xs:   12px;  /* solo etiquetas y antigüedad */
--texto-sm:   14px;  /* solo texto secundario */
--texto-base: 16px;  /* PISO para todo dato operativo */
--texto-lg:   18px;
--texto-xl:   22px;
--texto-2xl:  28px;
--texto-3xl:  36px;  /* cifras grandes de tablero */

--peso-normal: 400;
--peso-medio:  500;
--peso-fuerte: 700;
```

### Reglas

- **16 px es el piso para cualquier dato operativo.** 14 px solo para texto
  secundario, 12 px solo para etiquetas y marcas de antigüedad.
- **Cifras tabulares siempre** en cantidades: `font-variant-numeric: tabular-nums`.
  Sin esto, las columnas de números bailan y el ojo no puede compararlas.
- **La unidad va siempre junto a la cifra**, en peso menor:
  `1.240 L`, nunca `1240`.
- Formato colombiano: punto de miles, coma decimal. `1.240,5 L`.
- Títulos en 700. Nada de 300 ni 200: bajo sol desaparecen.

---

## 4. Espaciado, radio y borde

```css
--esp-1: 4px;   --esp-4: 16px;   --esp-8: 32px;
--esp-2: 8px;   --esp-5: 20px;   --esp-10: 40px;
--esp-3: 12px;  --esp-6: 24px;   --esp-12: 48px;

--radio-sm: 8px;    /* etiquetas */
--radio-md: 10px;   /* botones, campos */
--radio-lg: 12px;   /* tarjetas */
--radio-full: 999px;

--borde: 1px solid var(--neutro-200);
--borde-fuerte: 2px solid var(--neutro-900);
```

**Sin sombras difusas.** Bajo sol directo desaparecen y no separan nada. Los
límites se marcan con borde de 1 px de alto contraste. Se permite una sombra sutil
únicamente en elementos flotantes sobre contenido: hoja inferior y menú desplegable.

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

**Barra inferior fija en la consola**, cuatro destinos máximo. Nunca menú
hamburguesa: exige dos toques y está en la esquina superior, la más lejana del
pulgar.

```
┌──────────────────────────────────────┐
│  Acopio Norte ▾            👤        │  ← contexto activo + perfil
├──────────────────────────────────────┤
│                                      │
│           contenido                  │
│                                      │
├──────────────────────────────────────┤
│  📦        ➕        📋        ⋯     │  ← inventario · entrada · pend. · más
└──────────────────────────────────────┘
```

El botón central de entrada rápida es más grande que el resto. Es la acción que
justifica que la aplicación exista.

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

Base de componentes: shadcn/ui, que es lo que Lovable genera, con los tokens de
este documento sobrescritos en la configuración de Tailwind.
