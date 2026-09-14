---
title: "Prompt base — pegar una vez por proyecto"
type: prompt
tags: [diseno, ui, prompt]
estado: vigente
actualizado: 2026-08-20
---

# Prompt base — pegar una vez por proyecto

---

Estoy construyendo **Acopio**, una plataforma de coordinación logística para
respuesta a desastres en Colombia, tras el terremoto de 2026.

Tiene dos superficies: un **home público** que es una vitrina de la causa, y una
**consola interna autenticada** donde ocurre la operación real (inventario de
centros de acopio, comprobantes de donación, y reparto hacia zonas afectadas).

## Contexto de uso — determina todas las decisiones visuales

La consola se usa **de pie, con una mano ocupada, con guantes, bajo sol directo,
con el celular al 12 % de batería y señal intermitente**, a veces con una fila de
gente esperando.

**Móvil primero, sin excepción.** El escritorio es la adaptación.

## Stack

React + Vite + TypeScript + Tailwind + shadcn/ui. Español de Colombia en toda la
interfaz.

## Paleta — el color semántico está reservado

El sistema comunica estado de existencias con un semáforo. Por eso **la marca no
puede ser roja ni verde**: si el botón primario fuera verde, el verde dejaría de
significar «hay suficiente».

```css
/* Marca — teal profundo */
--marca-900: #0A4F4F;
--marca-700: #0F6E6E;   /* primario */
--marca-500: #14A0A0;
--marca-100: #C7E8E8;
--marca-50:  #E6F4F4;

/* Neutros — gris cálido, NO azulado */
--neutro-900: #1C1917;
--neutro-600: #57534E;
--neutro-400: #A8A29E;
--neutro-200: #E7E5E4;
--neutro-100: #F5F5F4;
--neutro-50:  #FAFAF9;

/* Semáforo — RESERVADOS, no usar para nada más */
--estado-critico:  #DC2626;   /* escaso   · ícono ▼ · «Escaso» */
--estado-atencion: #D97706;   /* poco     · ícono ! · «Poco» */
--estado-ok:       #16A34A;   /* en rango · ícono ✓ · «Bien» */
--estado-saturado: #7C3AED;   /* de sobra · ícono ▲ · «De sobra» */
```

**El color nunca va solo.** Todo estado lleva ícono y texto además del color.

## Tipografía

Inter, familia única.

- **16 px es el piso** para cualquier dato operativo. 14 px solo para texto
  secundario, 12 px solo para etiquetas y marcas de antigüedad.
- **Cifras tabulares** en toda cantidad: `font-variant-numeric: tabular-nums`.
- **La unidad va junto a la cifra**, en peso menor: `1.240 L`, nunca `1240`.
- Formato colombiano: punto de miles, coma decimal. `1.240,5 L`.
- Títulos en 700. Nunca pesos 200 ni 300: bajo sol desaparecen.

## Reglas visuales innegociables

1. **Área táctil mínima de 48 × 48 px.** Botón primario de ancho completo y 56 px
   de alto.
2. **Sin sombras difusas ni degradados.** Bajo sol directo desaparecen. Los límites
   se marcan con **borde de 1 px** en `--neutro-200`. Se permite sombra sutil solo
   en hojas inferiores y menús flotantes.
3. **Todo dato operativo lleva su antigüedad al lado**: `1.240 L · hace 8 min`,
   nunca `1.240 L` a secas. Si supera 6 horas, se marca en ámbar; si supera un día,
   en rojo con la leyenda «dato viejo».
4. **Navegación inferior fija** en la consola, cuatro destinos máximo. Nunca menú
   hamburguesa.
5. **Acciones primarias en la mitad inferior** de la pantalla, al alcance del pulgar.
6. **Hoja inferior deslizable** para acciones secundarias, no modal centrado.
7. **Contraste AAA** en datos operativos.
8. Radio: 12 px en tarjetas, 10 px en botones y campos.

## Tono

Serio, claro y rápido. Ni alegría de startup ni solemnidad de funeral.

**Cero ilustración.** Fotografía real de la operación, o nada. Ninguna foto de
archivo de gente sonriendo con cajas.

El texto de interfaz es directo: *«No traigan más agua»*, no *«Recepción
temporalmente suspendida para esta categoría»*.

## Densidad

- **Home:** densidad baja, espaciado amplio, jerarquía brutal. Convence y orienta.
- **Consola:** densidad alta, espaciado ajustado, nunca bajo 16 px. Opera rápido.

## Estados obligatorios

Toda pantalla con datos define **vacío, carga, error y offline**. Nunca una
pantalla en blanco.

- **Vacío:** qué significa y qué hacer, con el botón al lado.
- **Carga:** esqueleto con la forma del contenido, nunca un giro centrado.
- **Error:** qué pasó y qué hacer, en lenguaje llano.
- **Offline:** indicador permanente con el número de operaciones en cola.

## Accesibilidad

Navegación completa por teclado, etiquetas ARIA, el color nunca como único
portador de significado, y `prefers-reduced-motion` respetado.

---

Confirma que entendiste estas reglas. Te iré pasando las pantallas una por una.
