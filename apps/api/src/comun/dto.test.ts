import { z } from 'zod';
import { crearDto } from './dto';

type Propiedad = Record<string, unknown> & { properties?: Record<string, Propiedad> };

describe('crearDto', () => {
  const Dto = crearDto(
    z.object({
      texto: z.string().nullable(),
      numero: z.number().nullable(),
      estado: z.enum(['A', 'B']).nullable(),
      objeto: z.object({ a: z.string() }).nullable(),
      lista: z.array(z.string()),
      obligatorio: z.string(),
    }),
  );
  const meta = (
    Dto as unknown as { _OPENAPI_METADATA_FACTORY(): Record<string, Propiedad> }
  )._OPENAPI_METADATA_FACTORY();

  it('un texto que admite nulo sale como texto con nullable', () => {
    expect(meta.texto).toMatchObject({ type: 'string', nullable: true });
  });

  it('un número y un enum que admiten nulo también', () => {
    expect(meta.numero).toMatchObject({ type: 'number', nullable: true });
    expect(meta.estado).toMatchObject({ type: 'string', nullable: true, enum: ['A', 'B'] });
  });

  it('un objeto que admite nulo conserva sus propiedades y suma nullable', () => {
    expect(meta.objeto).toMatchObject({ type: 'object', nullable: true });
    expect(meta.objeto!.properties!.a).toMatchObject({ type: 'string' });
  });

  it('un objeto que admite nulo sigue obligatorio en el padre y conserva sus obligatorios', () => {
    expect(meta.objeto).toMatchObject({ selfRequired: true, required: ['a'] });
    expect(meta.objeto!['x-nestjs_zod-self-required']).toBe(true);
  });

  it('un arreglo de verdad sigue siendo arreglo y lo demás no cambia', () => {
    expect(meta.lista).toMatchObject({ type: 'array', items: { type: 'string' } });
    expect(meta.obligatorio).toMatchObject({ type: 'string' });
    expect(meta.obligatorio!.nullable).toBeUndefined();
  });
});
