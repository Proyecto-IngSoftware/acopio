import { fabricarProveedorIdentidad } from './fabrica-proveedor';
import type { ProveedorIdentidad } from './proveedor-identidad';

const local = { nombre: 'local' } as unknown as ProveedorIdentidad;
const supabase = { nombre: 'supabase' } as unknown as ProveedorIdentidad;

describe('fabricarProveedorIdentidad', () => {
  it('entrega el adaptador local con AUTH_PROVEEDOR=local', () => {
    expect(fabricarProveedorIdentidad({ AUTH_PROVEEDOR: 'local' }, local, supabase)).toBe(local);
  });

  it('entrega el de Supabase con AUTH_PROVEEDOR=supabase', () => {
    expect(fabricarProveedorIdentidad({ AUTH_PROVEEDOR: 'supabase' }, local, supabase)).toBe(
      supabase,
    );
  });
});
