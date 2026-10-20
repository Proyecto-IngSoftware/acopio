import { render, screen, within } from '@testing-library/react';
import { clienteFalso, envolver, responderJson, responderSegun } from './pruebas/utilidades';
import { violacionesGraves } from './pruebas/accesibilidad';
import { Rutas } from './rutas';

// La ruta / consulta la API
beforeEach(() => responderJson([]));

it('la barra inferior tiene los cinco destinos del portal', () => {
  render(envolver(<Rutas />));
  const barra = screen.getByRole('navigation', { name: 'Secciones' });
  expect(within(barra).getAllByRole('link')).toHaveLength(5);
  for (const nombre of ['Inicio', 'Mapa', 'Causas', 'Voluntariado', 'Más']) {
    expect(within(barra).getByRole('link', { name: nombre })).toBeInTheDocument();
  }
});

it('marca la sección actual', () => {
  render(envolver(<Rutas />, '/mapa'));
  expect(screen.getByRole('link', { name: 'Mapa' })).toHaveAttribute('aria-current', 'page');
});

it('la ficha de un acopio deja marcado «Mapa»', () => {
  render(envolver(<Rutas />, '/acopios/x1'));
  expect(screen.getByRole('link', { name: 'Mapa' })).toHaveAttribute('aria-current', 'page');
});

it('la cabecera lleva a Entrar', async () => {
  render(envolver(<Rutas />));
  expect(await screen.findByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/entrar');
});

it('/mapa abre el mapa de acopios', async () => {
  render(envolver(<Rutas />, '/mapa'));
  expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Mapa de acopios');
});

it('/causas abre el directorio de causas', async () => {
  responderSegun({ 'GET /api/causas': [] });
  render(envolver(<Rutas />, '/causas'));
  expect(await screen.findByRole('heading', { level: 1, name: 'Causas' })).toBeInTheDocument();
});

it('/voluntariado abre el listado de jornadas', async () => {
  responderSegun({ 'GET /api/turnos/jornadas': [] });
  render(envolver(<Rutas />, '/voluntariado'));
  expect(
    await screen.findByRole('heading', { level: 1, name: 'Voluntariado' }),
  ).toBeInTheDocument();
});

it.each(['/proximamente'])('%s muestra «Próximamente» con un enlace de vuelta', (ruta) => {
  render(envolver(<Rutas />, ruta));
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Próximamente');
  expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/');
});

it.each([
  ['/consola/acopios/x1/salida', 'Registrar salida'],
  ['/consola/acopios/x1/conteo', 'Conteo físico'],
  ['/consola/turnos', 'Turnos'],
])('%s abre su pantalla para el Operador', async (ruta, titulo) => {
  const operador = { id: 'o', username: 'o', nombre: 'Daniela', rol: 'OPERADOR' as const };
  render(envolver(<Rutas />, ruta, clienteFalso(operador)));
  expect(await screen.findByRole('heading', { level: 1, name: titulo })).toBeInTheDocument();
});

it('una ruta que no existe lo dice y ofrece volver', () => {
  render(envolver(<Rutas />, '/no-existe'));
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('No encontramos esta página');
  expect(screen.getByRole('link', { name: 'Volver al inicio' })).toBeInTheDocument();
});

it('el marco no tiene violaciones graves de accesibilidad', async () => {
  const { container } = render(envolver(<Rutas />, '/mapa'));
  expect(await violacionesGraves(container)).toEqual([]);
});

it('/consola/sin-sincronizar abre la lista de entradas guardadas en el teléfono', async () => {
  const operadora = {
    id: 'u1',
    username: 'd.mendez',
    nombre: 'Daniela Méndez',
    rol: 'OPERADOR' as const,
  };
  render(envolver(<Rutas />, '/consola/sin-sincronizar', clienteFalso(operadora)));
  expect(await screen.findByRole('heading', { name: 'Sin sincronizar' })).toBeInTheDocument();
});

describe('rutas del Donador', () => {
  const donador = {
    id: 'd1',
    username: 'ana@correo.co',
    nombre: 'Ana Ruiz',
    rol: 'DONADOR' as const,
  };

  it.each([
    ['/donador', 'Crea tu cuenta de donador'],
    ['/seguimiento', 'Seguir una donación'],
    ['/seguimiento/ACO-2026-7KQ4M', 'Seguir una donación'],
    ['/privacidad', 'Cómo usamos tus datos'],
  ])('%s carga su pantalla dentro del portal', async (ruta, titulo) => {
    render(envolver(<Rutas />, ruta));
    expect(await screen.findByRole('heading', { level: 1, name: titulo })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Secciones' })).toBeInTheDocument();
  });

  it('/donador/confirmar/abc carga su pantalla dentro del portal', async () => {
    const cliente = clienteFalso();
    cliente.validarEnlace.mockResolvedValue({ nombre: 'Ana Ruiz', correo: 'ana@correo.co' });
    render(envolver(<Rutas />, '/donador/confirmar/abc', cliente));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Elige tu contraseña' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Secciones' })).toBeInTheDocument();
  });

  it('/donar con un Donador en sesión carga Preparar', async () => {
    render(envolver(<Rutas />, '/donar', clienteFalso(donador)));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Preparar donación' }),
    ).toBeInTheDocument();
  });

  it('/donar sin sesión lleva a la única pantalla de entrada', async () => {
    render(envolver(<Rutas />, '/donar'));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Entrar a Acopio' }),
    ).toBeInTheDocument();
  });

  it('/consola/bitacora con un Donador cae en el rechazo de RequiereRol', async () => {
    render(envolver(<Rutas />, '/consola/bitacora', clienteFalso(donador)));
    expect(await screen.findByRole('heading', { name: 'No tienes acceso' })).toBeInTheDocument();
  });
});

describe('rutas de comprobantes (Bloque 3, ciclo 2)', () => {
  const persona = (rol: 'OPERADOR' | 'AUDITOR' | 'ADMIN') => ({
    id: 'u1',
    username: 'j.quintero',
    nombre: 'Joseph Quintero',
    rol,
  });

  it.each([
    ['/consola/acopios/x1/recibir', 'OPERADOR', 'Recibir por folio'],
    ['/consola/comprobantes', 'AUDITOR', 'Comprobantes'],
    ['/consola/comprobantes', 'ADMIN', 'Comprobantes'],
    ['/consola/comprobantes/ACO-2026-7KQ4M', 'AUDITOR', 'ACO-2026-7KQ4M'],
  ] as const)('%s abre su pantalla para %s', async (ruta, rol, titulo) => {
    render(envolver(<Rutas />, ruta, clienteFalso(persona(rol))));
    expect(await screen.findByRole('heading', { level: 1, name: titulo })).toBeInTheDocument();
  });

  it.each([
    ['/consola/acopios/x1/recibir', 'AUDITOR'],
    ['/consola/comprobantes', 'OPERADOR'],
    ['/consola/comprobantes/ACO-2026-7KQ4M', 'OPERADOR'],
  ] as const)('%s rechaza a %s', async (ruta, rol) => {
    render(envolver(<Rutas />, ruta, clienteFalso(persona(rol))));
    expect(await screen.findByRole('heading', { name: 'No tienes acceso' })).toBeInTheDocument();
  });
});

describe('rutas del motor (Bloque 4, ciclo 1)', () => {
  const persona = (rol: 'OPERADOR' | 'RECEPTOR' | 'ADMIN') => ({
    id: 'u1',
    username: 'j.quintero',
    nombre: 'Joseph Quintero',
    rol,
  });

  it.each([
    ['/consola/zonas/z1', 'ADMIN', 'Ficha de zona'],
    ['/consola/zonas/z1', 'RECEPTOR', 'Ficha de zona'],
    ['/consola/motor', 'ADMIN', 'Motor de sugerencias'],
    ['/consola/motor/pesos', 'ADMIN', 'Pesos'],
    ['/consola/motor/descartes', 'ADMIN', 'Descartes'],
  ] as const)('%s abre su pantalla para %s', async (ruta, rol, titulo) => {
    render(envolver(<Rutas />, ruta, clienteFalso(persona(rol))));
    expect(await screen.findByRole('heading', { level: 1, name: titulo })).toBeInTheDocument();
  });

  it.each([
    ['/consola/zonas/z1', 'OPERADOR'],
    ['/consola/motor', 'OPERADOR'],
    ['/consola/motor', 'RECEPTOR'],
    ['/consola/motor/pesos', 'RECEPTOR'],
    ['/consola/motor/descartes', 'OPERADOR'],
  ] as const)('%s rechaza a %s', async (ruta, rol) => {
    render(envolver(<Rutas />, ruta, clienteFalso(persona(rol))));
    expect(await screen.findByRole('heading', { name: 'No tienes acceso' })).toBeInTheDocument();
  });
});

describe('rutas de remisiones (Bloque 4, ciclo 2)', () => {
  const persona = (rol: 'OPERADOR' | 'RECEPTOR' | 'ADMIN') => ({
    id: 'u1',
    username: 'j.quintero',
    nombre: 'Joseph Quintero',
    rol,
  });

  it.each([
    ['/consola/remisiones', 'ADMIN', 'Remisiones'],
    ['/consola/remisiones', 'OPERADOR', 'Remisiones'],
    ['/consola/remisiones/nueva', 'OPERADOR', 'Nueva remisión'],
    ['/consola/remisiones/R-2026-K4P7Q', 'OPERADOR', 'R-2026-K4P7Q'],
    ['/consola/remisiones/R-2026-K4P7Q/documento', 'ADMIN', 'Remisión R-2026-K4P7Q'],
  ] as const)('%s abre su pantalla para %s', async (ruta, rol, titulo) => {
    render(envolver(<Rutas />, ruta, clienteFalso(persona(rol))));
    expect(await screen.findByRole('heading', { level: 1, name: titulo })).toBeInTheDocument();
  });

  it('el documento se abre sin la barra del portal', async () => {
    render(
      envolver(
        <Rutas />,
        '/consola/remisiones/R-2026-K4P7Q/documento',
        clienteFalso(persona('OPERADOR')),
      ),
    );
    await screen.findByRole('heading', { level: 1, name: 'Remisión R-2026-K4P7Q' });
    expect(screen.queryByRole('navigation', { name: 'Secciones' })).not.toBeInTheDocument();
  });

  it.each([
    ['/consola/remisiones', 'RECEPTOR'],
    ['/consola/remisiones/R-2026-K4P7Q/documento', 'RECEPTOR'],
  ] as const)('%s rechaza a %s', async (ruta, rol) => {
    render(envolver(<Rutas />, ruta, clienteFalso(persona(rol))));
    expect(await screen.findByRole('heading', { name: 'No tienes acceso' })).toBeInTheDocument();
  });
});

describe('margen lateral de la consola', () => {
  const admin = { id: 'a', username: 'admin', nombre: 'Ana', rol: 'ADMIN' as const };
  const operador = { id: 'o', username: 'o', nombre: 'Daniela', rol: 'OPERADOR' as const };
  const receptor = { id: 'r', username: 'r', nombre: 'Alejandra', rol: 'RECEPTOR' as const };
  // Una pantalla sin px-margin queda pegada al borde del teléfono; con dos, el margen se duplica
  it.each([
    ['/consola/acopios', admin],
    ['/consola/acopios/nuevo', admin],
    ['/consola/entidades', admin],
    ['/consola/zonas', admin],
    ['/consola/usuarios', admin],
    ['/consola/catalogo', admin],
    ['/consola/motor', admin],
    ['/consola/motor/pesos', admin],
    ['/consola/motor/descartes', admin],
    ['/consola/remisiones', admin],
    ['/consola/remisiones/nueva', admin],
    ['/consola/zonas/z1', admin],
    ['/consola/zonas/z1/reportar', admin],
    ['/consola/acopios/x1/operacion', admin],
    ['/consola/acopios/x1/no-recibir', admin],
    ['/consola/acopios/x1/inventario', admin],
    ['/consola/acopios/x1/salida', operador],
    ['/consola/remisiones/R-1', operador],
    ['/consola/recepciones', receptor],
    ['/consola/recepciones/R-1', receptor],
  ] as const)('%s deja margen a los lados', async (ruta, usuario) => {
    render(envolver(<Rutas />, ruta, clienteFalso(usuario)));
    const titulo = await screen.findByRole('heading', { level: 1 });
    const margenes: Element[] = [];
    for (let e: Element | null = titulo; e; e = e.parentElement) {
      if (e.classList.contains('px-margin')) margenes.push(e);
    }
    expect(margenes).toHaveLength(1);
  });
});

it('/plataformas lleva a la sección de otras plataformas en Causas', async () => {
  responderSegun({ 'GET /api/causas': [], 'GET /api/publico/plataformas': [] });
  render(envolver(<Rutas />, '/plataformas'));
  expect(await screen.findByRole('heading', { level: 1, name: 'Causas' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Causas' })).toHaveAttribute('aria-current', 'page');
});
