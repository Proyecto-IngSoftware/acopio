import { createZodDto } from 'nestjs-zod';
import type { ZodType } from 'zod';

type Propiedad = Record<string, unknown>;

/** La marca con la que nestjs-zod le dice a cleanupOpenApiDoc si un objeto es obligatorio. */
const SELF_REQUIRED = 'x-nestjs_zod-self-required';

/** `{ type: ['string', 'null'] }` o `{ anyOf: [X, { type: 'null' }] }` → X con nullable (#38). */
function sinNuloEnTipo(p: Propiedad): Propiedad {
  if (Array.isArray(p.type) && p.type.includes('null')) {
    const tipos = (p.type as unknown[]).filter((t) => t !== 'null');
    const enumSinNulo = Array.isArray(p.enum) ? p.enum.filter((v) => v !== null) : undefined;
    return {
      ...p,
      type: tipos.length === 1 ? tipos[0] : tipos,
      ...(enumSinNulo ? { enum: enumSinNulo } : {}),
      nullable: true,
    };
  }
  if (Array.isArray(p.anyOf)) {
    const opciones = (p.anyOf as Propiedad[]).filter((o) => o.type !== 'null');
    if (opciones.length === 1 && opciones.length < p.anyOf.length) {
      const { anyOf: _anyOf, ...resto } = p;
      const unido: Propiedad = { ...resto, ...opciones[0], nullable: true };
      // En un objeto, `required` es la lista de sus campos; si es obligatorio en el padre
      // lo dice `selfRequired`, como hace nestjs-zod con los objetos que no admiten nulo
      if (unido.type === 'object') {
        const obligatorio = p.required === true;
        unido.selfRequired = obligatorio;
        unido[SELF_REQUIRED] = obligatorio;
        if (!Array.isArray(unido.required)) delete unido.required;
      }
      return unido;
    }
  }
  return p;
}

/**
 * `createZodDto` con los nulos de primer nivel bien escritos en el contrato. nestjs-zod
 * pasa a Swagger `type: ['string', 'null']`, que Swagger lee como arreglo. Todo DTO de la
 * API se declara con esto (la regla de ESLint lo exige).
 */
export function crearDto<T extends ZodType>(esquema: T) {
  // createZodDto arma una clase nueva en cada llamada: cambiar su fábrica no toca a otras
  const Base = createZodDto(esquema);
  const conFabrica = Base as unknown as {
    _OPENAPI_METADATA_FACTORY(): Record<string, Propiedad>;
  };
  const fabricaBase = conFabrica._OPENAPI_METADATA_FACTORY.bind(Base);
  conFabrica._OPENAPI_METADATA_FACTORY = () =>
    Object.fromEntries(Object.entries(fabricaBase()).map(([k, p]) => [k, sinNuloEnTipo(p)]));
  return Base;
}
