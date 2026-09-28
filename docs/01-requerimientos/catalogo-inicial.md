---
title: "Catálogo inicial de categorías"
type: requerimientos
tags: [requerimientos, catalogo]
estado: vigente
modulo: catalogo
bloque: 0
actualizado: 2026-09-28
---

# Catálogo inicial de categorías

Respuesta a [P-003](pendientes.md) y primera versión de la canasta de
[P-001](pendientes.md), acordadas el 2026-09-28 y registradas en
[#20](https://github.com/Proyecto-IngSoftware/acopio/issues/20). Es el contenido del
*seed* del primer arranque ([despliegue](../06-operacion/despliegue.md#primer-arranque)).
Las cifras de la canasta se confirman en la fuente antes del *seed*; ver
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

## Canasta estándar — primera versión

**Solo 10 de las 39 categorías llevan canasta.** Las demás no tienen un estándar por
persona y día que se pueda defender. Según [RF-CAT-003](funcionales/catalogo.md#rf-cat-003--definir-la-canasta-estándar),
quedan fuera del cálculo automático: su necesidad llega por el reporte del Receptor
([P-015](pendientes.md)). Así, que no exista un número para todo deja de ser un
problema, porque la mayoría de las categorías no lo necesita.

| Categoría | Por persona y día | Fuente (`canasta_estandar.fuente`) |
|---|--:|---|
| Agua potable | 15 L | Manual Esfera 2018, abastecimiento de agua, norma 2.1 |
| Arroz | 0,25 kg | Ración de 2.100 kcal (Esfera 2018), con alimentos del kit alimentario de la UNGRD; cálculo propio |
| Harinas | 0,10 kg | Ídem |
| Pasta | 0,10 kg | Ídem |
| Granos secos | 0,05 kg | Ídem |
| Aceite | 0,03 L | Ídem |
| Azúcar y panela | 0,02 kg | Ídem |
| Sal | 0,005 kg | Ídem |
| Jabón de baño | 0,067 unidades | Esfera 2018: 250 g de jabón de baño por persona al mes, en barras de 125 g |
| Detergente para ropa | 0,0067 kg | Esfera 2018: 200 g de jabón de lavar por persona al mes |

### Cómo se llega a las 2.100 kcal

Esfera fija la energía (2.100 kcal por persona al día), no los alimentos. La
distribución la hace el proyecto con los productos del kit alimentario de la UNGRD:
arroz, harina para arepa, pasta, fríjol, aceite, azúcar y sal.

| Alimento | g/día | kcal por 100 g (aprox.) | kcal |
|---|--:|--:|--:|
| Cereales (arroz, harinas, pasta) | 450 | 357 | 1.607 |
| Granos secos | 50 | 340 | 170 |
| Aceite (0,03 L ≈ 27,6 g) | 27,6 | 884 | 244 |
| Azúcar y panela | 20 | 387 | 77 |
| Sal | 5 | 0 | 0 |
| **Total** | | | **≈ 2.098** |

Es una sola distribución defendible, no la única correcta. La canasta es versionada y
editable por el Administrador. Si el equipo consigue una ración oficial de la UNGRD por
persona, se carga como versión nueva con esa fuente.

## Verificar antes del seed

- [ ] **Kilocalorías por alimento**: son aproximadas. Confirmarlas con la Tabla de
      Composición de Alimentos Colombianos del ICBF y citarla en `fuente`.
- [ ] **Jabón y detergente**: confirmar los 250 g y 200 g al mes en el capítulo de
      artículos de higiene del Manual Esfera 2018.
- [ ] **Kit alimentario de la UNGRD**: confirmar la lista de productos en el
      *Manual de estandarización de la ayuda humanitaria de Colombia* (UNGRD, 2013).
- [ ] **Revisión de sinónimos**: que Brayan pruebe la entrada rápida (C04) con 10
      productos reales.

## Fuentes

- Manual Esfera 2018 (inglés) — <https://spherestandards.org/wp-content/uploads/Sphere-Handbook-2018-EN.pdf>
- UNGRD, *Estandarización de ayuda humanitaria de Colombia* (2013) —
  <https://portal.gestiondelriesgo.gov.co/Documents/Manuales/Manual_de_Estandarizacion_AHE_de_Colombia.pdf>
- UNGRD, adquisición de productos del kit alimentario de emergencia —
  <https://portal.gestiondelriesgo.gov.co/Paginas/Adquisicion-productos-Kit-Alimentario-de-Emergencia.aspx>
