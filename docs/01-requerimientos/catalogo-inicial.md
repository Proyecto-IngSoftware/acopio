---
title: "Catálogo inicial de categorías"
type: requerimientos
tags: [requerimientos, catalogo]
estado: vigente
modulo: catalogo
bloque: 0
actualizado: 2026-10-06
---

# Catálogo inicial de categorías

Respuesta a [P-003](pendientes.md) y canasta estándar de [P-001](pendientes.md),
registradas en [#20](https://github.com/Proyecto-IngSoftware/acopio/issues/20). Es el
contenido del *seed* del primer arranque ([despliegue](../06-operacion/despliegue.md#primer-arranque)).
Las cifras de la canasta se validaron en la fuente el 2026-10-06; ver
[Verificar antes del seed](#verificar-antes-del-seed) y
[I-006](../00-contexto/investigaciones.md#i-006--cantidades-por-persona-para-la-canasta-estándar).

## Criterios

- **39 categorías**, dentro del rango de 25 a 40 de [RF-CAT-001](funcionales/catalogo.md#rf-cat-001--gestionar-categorías).
- Una categoría agrupa lo que **se reemplaza entre sí** para quien lo recibe. Arroz y pasta
  son distintas porque la canasta las cuenta distinto; champú y desodorante van juntos
  porque nadie calcula su déficit.
- **Unidad base fija** (`LITRO`, `KILOGRAMO`, `UNIDAD`). Lo que se dona en presentaciones
  —una bolsa de 500 g, un paquete de 10 toallas— se convierte con
  `codigo_barras.contenido` ([RF-CAT-004](funcionales/catalogo.md#rf-cat-004--mapear-códigos-de-barras)).
- **Perecedero** = vida útil corta (menos de seis meses) o necesita frío. Solo esas
  categorías exigen fecha de vencimiento al registrar la entrada (RF-INV-001).

## Categorías

| # | Grupo | Categoría | Unidad base | Perecedero | Sinónimos de búsqueda |
|--:|---|---|---|:-:|---|
| 1 | Agua y bebidas | Agua potable | LITRO | No | agua, botella, bolsa de agua, garrafa, botellon |
| 2 | Agua y bebidas | Leche líquida | LITRO | Sí | leche, leche larga vida, uht, caja de leche |
| 3 | Alimentos | Arroz | KILOGRAMO | No | arroz, aroz |
| 4 | Alimentos | Granos secos | KILOGRAMO | No | frijol, frijoles, lenteja, garbanzo, arveja seca |
| 5 | Alimentos | Pasta | KILOGRAMO | No | pasta, espagueti, macarron, fideo |
| 6 | Alimentos | Harinas | KILOGRAMO | No | harina, harina para arepa, harina de maiz, harina de trigo, avena |
| 7 | Alimentos | Aceite | LITRO | No | aceite, aceite vegetal |
| 8 | Alimentos | Azúcar y panela | KILOGRAMO | No | azucar, panela |
| 9 | Alimentos | Sal | KILOGRAMO | No | sal |
| 10 | Alimentos | Enlatados | KILOGRAMO | No | atun, sardinas, salchichas, lata, enlatado |
| 11 | Alimentos | Leche en polvo | KILOGRAMO | No | leche en polvo, bienestarina |
| 12 | Alimentos | Listos para consumir | KILOGRAMO | No | galletas, cereal, granola, snack, bocadillo |
| 13 | Alimentos | Alimentos frescos | KILOGRAMO | Sí | fruta, verdura, pan, huevos, papa, platano |
| 14 | Aseo personal | Jabón de baño | UNIDAD | No | jabon, jabon de tocador, barra de jabon |
| 15 | Aseo personal | Crema dental | UNIDAD | No | crema dental, pasta de dientes, dentifrico |
| 16 | Aseo personal | Cepillo de dientes | UNIDAD | No | cepillo, cepillo dental |
| 17 | Aseo personal | Papel higiénico | UNIDAD | No | papel higienico, rollo, papel |
| 18 | Aseo personal | Toallas higiénicas | UNIDAD | No | toallas higienicas, toalla sanitaria, protectores, copa menstrual |
| 19 | Aseo personal | Otros de aseo personal | UNIDAD | No | desodorante, champu, shampoo, afeitadora, peinilla |
| 20 | Aseo del hogar | Detergente para ropa | KILOGRAMO | No | detergente, jabon en polvo, jabon de ropa, jabon en barra de ropa |
| 21 | Aseo del hogar | Limpiadores y desinfectantes | LITRO | No | cloro, blanqueador, limpiador, desinfectante, jabon liquido |
| 22 | Salud | Sales de rehidratación oral | UNIDAD | No | suero oral, sales de rehidratacion, suero |
| 23 | Salud | Primeros auxilios | UNIDAD | No | gasa, curas, alcohol, esparadrapo, venda, botiquin |
| 24 | Salud | Tapabocas | UNIDAD | No | tapabocas, mascarilla, cubrebocas |
| 25 | Salud | Repelente | UNIDAD | No | repelente, antimosquitos |
| 26 | Bebé | Pañales de bebé | UNIDAD | No | pañal, panal, pañales, etapa |
| 27 | Bebé | Toallitas húmedas | UNIDAD | No | toallitas, pañitos humedos, pañitos |
| 28 | Bebé | Alimento infantil | KILOGRAMO | No | compota, colado, cereal infantil |
| 29 | Adulto mayor | Pañales de adulto | UNIDAD | No | pañal adulto, panal adulto, incontinencia |
| 30 | Ropa y abrigo | Cobijas y sábanas | UNIDAD | No | cobija, manta, frazada, sabana |
| 31 | Ropa y abrigo | Colchonetas y hamacas | UNIDAD | No | colchoneta, colchon, hamaca, estera |
| 32 | Ropa y abrigo | Toldillos | UNIDAD | No | toldillo, mosquitero |
| 33 | Ropa y abrigo | Ropa | KILOGRAMO | No | ropa, prendas, camisa, pantalon, ropa interior |
| 34 | Ropa y abrigo | Calzado | UNIDAD | No | zapatos, botas, tenis, chanclas, par |
| 35 | Animales | Alimento para animales | KILOGRAMO | No | concentrado, comida para perro, comida para gato, purina |
| 36 | Herramientas | Utensilios de cocina | UNIDAD | No | olla, sarten, plato, vaso, cubiertos, kit de cocina |
| 37 | Herramientas | Recipientes para agua | UNIDAD | No | balde, bidon, caneca, galon, recipiente |
| 38 | Herramientas | Plásticos, lonas y carpas | UNIDAD | No | plastico, lona, carpa, polisombra, teja |
| 39 | Herramientas | Linternas y herramientas manuales | UNIDAD | No | linterna, pilas, pala, pica, machete, carretilla |

**Unidad en las categorías por paquete.** En *Toallas higiénicas*, *Toallitas
húmedas*, *Pañales* y *Papel higiénico*, la unidad es la pieza suelta (una toalla, un
pañal, un rollo). El paquete se convierte con el código de barras. Sin código, el
operador escribe la cantidad de piezas.

## Qué no entra al catálogo

| Qué | Por qué |
|---|---|
| **Medicamentos** | Su manejo está regulado y exige personal autorizado. Un acopio ciudadano no debe recibirlos. Primeros auxilios y sales de rehidratación sí entran |
| **Fórmula infantil** | Esfera y la OMS (Código Internacional de Comercialización de Sucedáneos de la Leche Materna) piden no distribuirla como donación general. Si una entidad la pide, se registra por su propio canal |
| **Comida preparada** | No se almacena en un acopio. Se canaliza por ollas comunitarias |
| **Dinero** | Fuera de alcance del producto ([fuera-de-alcance](../00-contexto/fuera-de-alcance.md)) |

## Canasta estándar

**Solo 10 de las 39 categorías llevan canasta.** Las demás no tienen un estándar por
persona y día que se pueda defender. Según [RF-CAT-003](funcionales/catalogo.md#rf-cat-003--definir-la-canasta-estándar),
quedan fuera del cálculo automático: su necesidad llega por el reporte del Receptor
([P-015](pendientes.md)). La mayoría de las categorías no necesita un número.

La versión vigente es la 2, del 2026-10-06. Sale de la validación de
[I-006](../00-contexto/investigaciones.md#i-006--cantidades-por-persona-para-la-canasta-estándar),
que corrigió la mezcla de alimentos de la versión 1 (2026-09-28). La canasta es
versionada: el *seed* carga las dos y la 1 queda en el historial de cada categoría.

| Categoría | Por persona y día | v1 | Fuente (`canasta_estandar.fuente`) |
|---|--:|--:|---|
| Agua potable | 15 L | 15 L | Esfera 2018, norma 2.1 de abastecimiento de agua, p. 121-122 y apéndice 3, p. 164 |
| Arroz | 0,20 kg | 0,25 kg | Ración de 2.100 kcal con 17 % de grasa (Esfera 2018, norma 6.1); cálculo propio |
| Harinas | 0,10 kg | 0,10 kg | Ídem |
| Pasta | 0,10 kg | 0,10 kg | Ídem |
| Granos secos | 0,08 kg | 0,05 kg | Ídem |
| Aceite | 0,04 L | 0,03 L | Ídem |
| Azúcar y panela | 0,02 kg | 0,02 kg | Ídem |
| Sal | 0,005 kg | 0,005 kg | Ídem |
| Jabón de baño | 0,067 unidades | igual | Esfera 2018, norma 1.2 de promoción de la higiene, p. 114: 250 g por persona al mes, en barras de 125 g |
| Detergente para ropa | 0,0067 kg | igual | Esfera 2018, norma 1.2, p. 114: 200 g de jabón de colada por persona al mes |

Las páginas son las impresas de la edición en español de Esfera 2018.

Los 15 L de agua cubren beber, cocinar e higiene. Para beber son 2,5 a 3 L; el resto es
agua de uso doméstico. Esfera dice que el valor es un mínimo que depende del contexto,
nunca un máximo. El jabón y el detergente se fijan por mes, así que un reparto de menos
de un mes se prorratea. Las barras de 125 g son una decisión de empaque del proyecto.

### Cómo se llega a las 2.100 kcal

Esfera (norma 6.1, p. 222-223, y apéndice 6, p. 259) fija la energía, 2.100 kcal por
persona al día, con 10 a 12 % de la energía en proteína y 17 % en grasa. No fija gramos
por alimento. La distribución es del proyecto, con los productos del kit alimentario de
la UNGRD: arroz, harina para arepa, pasta, fríjol, aceite, azúcar, panela y sal.

| Alimento | g/día | kcal por 100 g (TCAC 2015) | kcal |
|---|--:|--:|--:|
| Arroz blanco crudo (fila 11) | 200 | 349 | 698 |
| Harina de maíz (fila 43) | 100 | 365 | 365 |
| Pasta (fila 91) | 100 | 354 | 354 |
| Fríjol rojo (fila 948) | 80 | 336 | 269 |
| Aceite (0,04 L × 0,92 g/mL ≈ 36,8 g; filas 374-379) | 36,8 | 900 | 331 |
| Azúcar (fila 688, 397) y panela (fila 721, 371), mitad y mitad | 20 | 384 | 77 |
| Sal | 5 | 0 | 0 |
| **Total** | | | **≈ 2.094** |

Con esta mezcla la grasa queda cerca del 18 % de la energía y la proteína cerca del
10 %, en el borde bajo de Esfera. Son cálculos propios con valores aproximados de
grasa y proteína. La v1 llevaba 450 g de cereal, 50 g de granos y 0,03 L de aceite:
sumaba la energía, pero la grasa quedaba en 13-15 %. Las raciones de ACNUR y PMA que
se pudieron citar usan unos 400 g de cereal y 60-80 g de legumbres.

Para los grupos vulnerables (gestantes, lactantes, menores de 7 años y adultos
mayores) la UNGRD prevé Bienestarina del ICBF como complemento. No entra en la canasta.

Si el equipo consigue una ración oficial por persona, se carga como versión nueva con
esa fuente. La «ración diaria sugerida» del manual de la UNGRD (2013, p. 75) no sirve
para eso. Suma 1.960 kcal porque cuenta todos los productos del mercado, incluidos
lácteos y atún.

## Verificar antes del seed

- [x] **Kilocalorías por alimento**: confirmadas con la Tabla de Composición de
      Alimentos Colombianos del ICBF (TCAC 2015); la tabla de arriba cita cada fila.
- [x] **Jabón y detergente**: confirmados en Esfera 2018, norma 1.2, p. 114.
- [x] **Kit alimentario de la UNGRD**: confirmado en el manual de 2013, p. 70.
- [ ] **Revisión de sinónimos**: que Brayan pruebe la entrada rápida (C04) con 10
      productos reales.

## Fuentes

- Manual Esfera 2018 (español), las páginas citadas — <https://emergency.unhcr.org/sites/default/files/Esfera%20Manuel%20%282018%29.pdf>
- Manual Esfera 2018 (inglés) — <https://spherestandards.org/wp-content/uploads/Sphere-Handbook-2018-EN.pdf>
- ICBF, *Tabla de Composición de Alimentos Colombianos* (2015) —
  <https://www.minsalud.gov.co/sites/rid/Lists/BibliotecaDigital/RIDE/INEC/IETS/tabla-de-composicion-alimentos-colombianos-2015.pdf>
- USDA FoodData Central, aceite de soya (FDC 171411), para la densidad del aceite —
  <https://fdc.nal.usda.gov/fdc-app.html#/food-details/171411/nutrients>
- UNGRD, *Estandarización de ayuda humanitaria de Colombia* (2013) —
  <https://portal.gestiondelriesgo.gov.co/Documents/Manuales/Manual_de_Estandarizacion_AHE_de_Colombia.pdf>
- UNGRD, adquisición de productos del kit alimentario de emergencia —
  <https://portal.gestiondelriesgo.gov.co/Paginas/Adquisicion-productos-Kit-Alimentario-de-Emergencia.aspx>
