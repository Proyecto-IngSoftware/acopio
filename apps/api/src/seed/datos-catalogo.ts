// Generado a partir de docs/01-requerimientos/catalogo-inicial.md (P-003).
// Si cambia el catálogo, se cambia allá primero.

import type { GrupoCategoria, UnidadBase } from '../generado/prisma/enums';

export interface CategoriaSemilla {
  nombre: string;
  grupo: GrupoCategoria;
  unidadBase: UnidadBase;
  perecedero: boolean;
  sinonimos: string[];
}

export const CATEGORIAS: CategoriaSemilla[] = [
  {
    nombre: 'Agua potable',
    grupo: 'AGUA_Y_BEBIDAS',
    unidadBase: 'LITRO',
    perecedero: false,
    sinonimos: ['agua', 'botella', 'bolsa de agua', 'garrafa', 'botellon'],
  },
  {
    nombre: 'Leche líquida',
    grupo: 'AGUA_Y_BEBIDAS',
    unidadBase: 'LITRO',
    perecedero: true,
    sinonimos: ['leche', 'leche larga vida', 'uht', 'caja de leche'],
  },
  {
    nombre: 'Arroz',
    grupo: 'ALIMENTOS',
    unidadBase: 'KILOGRAMO',
    perecedero: false,
    sinonimos: ['arroz', 'aroz'],
  },
  {
    nombre: 'Granos secos',
    grupo: 'ALIMENTOS',
    unidadBase: 'KILOGRAMO',
    perecedero: false,
    sinonimos: ['frijol', 'frijoles', 'lenteja', 'garbanzo', 'arveja seca'],
  },
  {
    nombre: 'Pasta',
    grupo: 'ALIMENTOS',
    unidadBase: 'KILOGRAMO',
    perecedero: false,
    sinonimos: ['pasta', 'espagueti', 'macarron', 'fideo'],
  },
  {
    nombre: 'Harinas',
    grupo: 'ALIMENTOS',
    unidadBase: 'KILOGRAMO',
    perecedero: false,
    sinonimos: ['harina', 'harina para arepa', 'harina de maiz', 'harina de trigo', 'avena'],
  },
  {
    nombre: 'Aceite',
    grupo: 'ALIMENTOS',
    unidadBase: 'LITRO',
    perecedero: false,
    sinonimos: ['aceite', 'aceite vegetal'],
  },
  {
    nombre: 'Azúcar y panela',
    grupo: 'ALIMENTOS',
    unidadBase: 'KILOGRAMO',
    perecedero: false,
    sinonimos: ['azucar', 'panela'],
  },
  {
    nombre: 'Sal',
    grupo: 'ALIMENTOS',
    unidadBase: 'KILOGRAMO',
    perecedero: false,
    sinonimos: ['sal'],
  },
  {
    nombre: 'Enlatados',
    grupo: 'ALIMENTOS',
    unidadBase: 'KILOGRAMO',
    perecedero: false,
    sinonimos: ['atun', 'sardinas', 'salchichas', 'lata', 'enlatado'],
  },
  {
    nombre: 'Leche en polvo',
    grupo: 'ALIMENTOS',
    unidadBase: 'KILOGRAMO',
    perecedero: false,
    sinonimos: ['leche en polvo', 'bienestarina'],
  },
  {
    nombre: 'Listos para consumir',
    grupo: 'ALIMENTOS',
    unidadBase: 'KILOGRAMO',
    perecedero: false,
    sinonimos: ['galletas', 'cereal', 'granola', 'snack', 'bocadillo'],
  },
  {
    nombre: 'Alimentos frescos',
    grupo: 'ALIMENTOS',
    unidadBase: 'KILOGRAMO',
    perecedero: true,
    sinonimos: ['fruta', 'verdura', 'pan', 'huevos', 'papa', 'platano'],
  },
  {
    nombre: 'Jabón de baño',
    grupo: 'ASEO_PERSONAL',
    unidadBase: 'UNIDAD',
    perecedero: false,
    sinonimos: ['jabon', 'jabon de tocador', 'barra de jabon'],
  },
  {
    nombre: 'Crema dental',
    grupo: 'ASEO_PERSONAL',
    unidadBase: 'UNIDAD',
    perecedero: false,
    sinonimos: ['crema dental', 'pasta de dientes', 'dentifrico'],
  },
  {
    nombre: 'Cepillo de dientes',
    grupo: 'ASEO_PERSONAL',
    unidadBase: 'UNIDAD',
    perecedero: false,
    sinonimos: ['cepillo', 'cepillo dental'],
  },
  {
    nombre: 'Papel higiénico',
    grupo: 'ASEO_PERSONAL',
    unidadBase: 'UNIDAD',
    perecedero: false,
    sinonimos: ['papel higienico', 'rollo', 'papel'],
  },
  {
    nombre: 'Toallas higiénicas',
    grupo: 'ASEO_PERSONAL',
    unidadBase: 'UNIDAD',
    perecedero: false,
    sinonimos: ['toallas higienicas', 'toalla sanitaria', 'protectores', 'copa menstrual'],
  },
  {
    nombre: 'Otros de aseo personal',
    grupo: 'ASEO_PERSONAL',
    unidadBase: 'UNIDAD',
    perecedero: false,
    sinonimos: ['desodorante', 'champu', 'shampoo', 'afeitadora', 'peinilla'],
  },
  {
    nombre: 'Detergente para ropa',
    grupo: 'ASEO_DEL_HOGAR',
    unidadBase: 'KILOGRAMO',
    perecedero: false,
    sinonimos: ['detergente', 'jabon en polvo', 'jabon de ropa', 'jabon en barra de ropa'],
  },
  {
    nombre: 'Limpiadores y desinfectantes',
    grupo: 'ASEO_DEL_HOGAR',
    unidadBase: 'LITRO',
    perecedero: false,
    sinonimos: ['cloro', 'blanqueador', 'limpiador', 'desinfectante', 'jabon liquido'],
  },
  {
    nombre: 'Sales de rehidratación oral',
    grupo: 'SALUD',
    unidadBase: 'UNIDAD',
    perecedero: false,
    sinonimos: ['suero oral', 'sales de rehidratacion', 'suero'],
  },
  {
    nombre: 'Primeros auxilios',
    grupo: 'SALUD',
    unidadBase: 'UNIDAD',
    perecedero: false,
    sinonimos: ['gasa', 'curas', 'alcohol', 'esparadrapo', 'venda', 'botiquin'],
  },
  {
    nombre: 'Tapabocas',
    grupo: 'SALUD',
    unidadBase: 'UNIDAD',
    perecedero: false,
    sinonimos: ['tapabocas', 'mascarilla', 'cubrebocas'],
  },
  {
    nombre: 'Repelente',
    grupo: 'SALUD',
    unidadBase: 'UNIDAD',
    perecedero: false,
    sinonimos: ['repelente', 'antimosquitos'],
  },
  {
    nombre: 'Pañales de bebé',
    grupo: 'BEBE',
    unidadBase: 'UNIDAD',
    perecedero: false,
    sinonimos: ['pañal', 'panal', 'pañales', 'etapa'],
  },
  {
    nombre: 'Toallitas húmedas',
    grupo: 'BEBE',
    unidadBase: 'UNIDAD',
    perecedero: false,
    sinonimos: ['toallitas', 'pañitos humedos', 'pañitos'],
  },
  {
    nombre: 'Alimento infantil',
    grupo: 'BEBE',
    unidadBase: 'KILOGRAMO',
    perecedero: false,
    sinonimos: ['compota', 'colado', 'cereal infantil'],
  },
  {
    nombre: 'Pañales de adulto',
    grupo: 'ADULTO_MAYOR',
    unidadBase: 'UNIDAD',
    perecedero: false,
    sinonimos: ['pañal adulto', 'panal adulto', 'incontinencia'],
  },
  {
    nombre: 'Cobijas y sábanas',
    grupo: 'ROPA_Y_ABRIGO',
    unidadBase: 'UNIDAD',
    perecedero: false,
    sinonimos: ['cobija', 'manta', 'frazada', 'sabana'],
  },
  {
    nombre: 'Colchonetas y hamacas',
    grupo: 'ROPA_Y_ABRIGO',
    unidadBase: 'UNIDAD',
    perecedero: false,
    sinonimos: ['colchoneta', 'colchon', 'hamaca', 'estera'],
  },
  {
    nombre: 'Toldillos',
    grupo: 'ROPA_Y_ABRIGO',
    unidadBase: 'UNIDAD',
    perecedero: false,
    sinonimos: ['toldillo', 'mosquitero'],
  },
  {
    nombre: 'Ropa',
    grupo: 'ROPA_Y_ABRIGO',
    unidadBase: 'KILOGRAMO',
    perecedero: false,
    sinonimos: ['ropa', 'prendas', 'camisa', 'pantalon', 'ropa interior'],
  },
  {
    nombre: 'Calzado',
    grupo: 'ROPA_Y_ABRIGO',
    unidadBase: 'UNIDAD',
    perecedero: false,
    sinonimos: ['zapatos', 'botas', 'tenis', 'chanclas', 'par'],
  },
  {
    nombre: 'Alimento para animales',
    grupo: 'ANIMALES',
    unidadBase: 'KILOGRAMO',
    perecedero: false,
    sinonimos: ['concentrado', 'comida para perro', 'comida para gato', 'purina'],
  },
  {
    nombre: 'Utensilios de cocina',
    grupo: 'HERRAMIENTAS',
    unidadBase: 'UNIDAD',
    perecedero: false,
    sinonimos: ['olla', 'sarten', 'plato', 'vaso', 'cubiertos', 'kit de cocina'],
  },
  {
    nombre: 'Recipientes para agua',
    grupo: 'HERRAMIENTAS',
    unidadBase: 'UNIDAD',
    perecedero: false,
    sinonimos: ['balde', 'bidon', 'caneca', 'galon', 'recipiente'],
  },
  {
    nombre: 'Plásticos, lonas y carpas',
    grupo: 'HERRAMIENTAS',
    unidadBase: 'UNIDAD',
    perecedero: false,
    sinonimos: ['plastico', 'lona', 'carpa', 'polisombra', 'teja'],
  },
  {
    nombre: 'Linternas y herramientas manuales',
    grupo: 'HERRAMIENTAS',
    unidadBase: 'UNIDAD',
    perecedero: false,
    sinonimos: ['linterna', 'pilas', 'pala', 'pica', 'machete', 'carretilla'],
  },
];

const RACION =
  'Ración de 2.100 kcal por persona al día (Manual Esfera 2018) repartida con los alimentos del kit alimentario de la UNGRD; cálculo propio';
/** Hasta que se complete la lista de verificación de #20. */
const POR_VERIFICAR = ' · Por verificar en la fuente (#20)';

export interface CanastaSemilla {
  categoria: string;
  cantidadPersonaDia: number;
  fuente: string;
}

/** Primera versión de la canasta (P-001). Solo 10 categorías tienen un valor defendible. */
export const CANASTA: CanastaSemilla[] = [
  {
    categoria: 'Agua potable',
    cantidadPersonaDia: 15,
    fuente: 'Manual Esfera 2018, abastecimiento de agua, norma 2.1',
  },
  { categoria: 'Arroz', cantidadPersonaDia: 0.25, fuente: RACION + POR_VERIFICAR },
  { categoria: 'Harinas', cantidadPersonaDia: 0.1, fuente: RACION + POR_VERIFICAR },
  { categoria: 'Pasta', cantidadPersonaDia: 0.1, fuente: RACION + POR_VERIFICAR },
  { categoria: 'Granos secos', cantidadPersonaDia: 0.05, fuente: RACION + POR_VERIFICAR },
  { categoria: 'Aceite', cantidadPersonaDia: 0.03, fuente: RACION + POR_VERIFICAR },
  { categoria: 'Azúcar y panela', cantidadPersonaDia: 0.02, fuente: RACION + POR_VERIFICAR },
  { categoria: 'Sal', cantidadPersonaDia: 0.005, fuente: RACION + POR_VERIFICAR },
  {
    categoria: 'Jabón de baño',
    cantidadPersonaDia: 0.067,
    fuente:
      'Manual Esfera 2018: 250 g de jabón de baño por persona al mes, en barras de 125 g' +
      POR_VERIFICAR,
  },
  {
    categoria: 'Detergente para ropa',
    cantidadPersonaDia: 0.0067,
    fuente: 'Manual Esfera 2018: 200 g de jabón de lavar por persona al mes' + POR_VERIFICAR,
  },
];

/** Fecha de la primera versión de la canasta. */
export const CANASTA_VIGENTE_DESDE = new Date('2026-09-28T00:00:00Z');
