import { leerRecordado, olvidarUsuario, recordarUsuario } from './recordada';

const operadora = {
  id: 'u1',
  username: 'd.mendez',
  nombre: 'Daniela Méndez',
  rol: 'OPERADOR' as const,
};

describe('último usuario recordado (O-05)', () => {
  it('sin nada guardado no hay usuario', () => {
    expect(leerRecordado()).toBeNull();
  });

  it('recuerda nombre, usuario y rol, y lo olvida al salir', () => {
    recordarUsuario(operadora);
    expect(leerRecordado()).toEqual(operadora);

    olvidarUsuario();
    expect(leerRecordado()).toBeNull();
  });

  it('nunca guarda nada más que esos campos, aunque lleguen otros', () => {
    recordarUsuario({ ...operadora, token: 'secreto' } as typeof operadora);

    const guardado = Object.values(localStorage).join(' ');
    expect(guardado).not.toContain('secreto');
    expect(leerRecordado()).toEqual(operadora);
  });

  it('un valor dañado en el almacenamiento cuenta como ninguno', () => {
    localStorage.setItem('acopio.ultimo-usuario', '{no es json');
    expect(leerRecordado()).toBeNull();
  });
});
