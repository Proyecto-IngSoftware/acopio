/* global __ENV */
import { check } from 'k6';
import { scenario } from 'k6/execution';
import http from 'k6/http';

const base = __ENV.ACOPIO_CARGA_URL?.replace(/\/$/, '');
const objetivo = __ENV.ACOPIO_CARGA_MODO ?? 'lecturas';
const destinos = JSON.parse(__ENV.ACOPIO_CARGA_DESTINOS ?? '[]');
const cursorHistorial = __ENV.ACOPIO_CARGA_CURSOR;
const modoEscritura = ['repartidas', 'mismo-par', 'con-motor'].includes(objetivo);

if (!base || !['lecturas', 'repartidas', 'mismo-par', 'con-motor'].includes(objetivo)) {
  throw new Error('Configura ACOPIO_CARGA_URL y un modo válido de carga');
}
if (destinos.length === 0 || (objetivo === 'repartidas' && destinos.length < 2)) {
  throw new Error('Configura al menos un destino sintético, o dos para escrituras repartidas');
}
if (modoEscritura && __ENV.ACOPIO_CARGA_DATOS_SINTETICOS !== 'si') {
  throw new Error('Las escrituras requieren ACOPIO_CARGA_DATOS_SINTETICOS=si');
}

const escalones = JSON.parse(
  __ENV.ACOPIO_CARGA_ESCALONES ??
    JSON.stringify([
      { duration: '10s', target: 1 },
      { duration: '20s', target: 3 },
      { duration: '30s', target: 5 },
    ]),
);

export const options = {
  discardResponseBodies: true,
  summaryTrendStats: ['count', 'p(50)', 'p(95)', 'p(99)'],
  thresholds: {
    checks: ['rate==1'],
    dropped_iterations: ['count==0'],
    'http_req_duration{name:saldos}': ['p(95)<200'],
    ...(modoEscritura && { 'http_req_duration{name:entrada}': ['p(95)<500'] }),
  },
  scenarios: {
    carga: {
      executor: 'ramping-arrival-rate',
      startRate: 1,
      timeUnit: '1s',
      preAllocatedVUs: 8,
      maxVUs: 40,
      stages: escalones,
    },
    ...(objetivo === 'con-motor' && {
      motor: {
        executor: 'per-vu-iterations',
        vus: 1,
        iterations: 1,
        startTime: '10s',
        exec: 'motor',
      },
    }),
  },
};

function sesion(usuario, contrasena) {
  const r = http.post(`${base}/api/auth/sesion`, JSON.stringify({ usuario, contrasena }), {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'sesion' },
  });
  if (r.status !== 200 || !r.cookies.acopio_sesion?.[0]?.value) {
    throw new Error(`No se pudo iniciar sesión para la carga (HTTP ${r.status})`);
  }
  return r.cookies.acopio_sesion[0].value;
}

export function setup() {
  const cuentas = [{ usuario: __ENV.ACOPIO_CARGA_USUARIO, contrasena: __ENV.ACOPIO_CARGA_CLAVE }];
  if (modoEscritura) {
    for (const destino of objetivo === 'mismo-par' ? destinos.slice(0, 1) : destinos) {
      const cuenta = {
        usuario: destino.usuario,
        contrasena: __ENV[destino.variableClave],
      };
      if (!cuentas.some((c) => c.usuario === cuenta.usuario)) cuentas.push(cuenta);
    }
  }
  return Object.fromEntries(
    cuentas.map(({ usuario, contrasena }) => [usuario, sesion(usuario, contrasena)]),
  );
}

function pedir(nombre, ruta, { token, cuerpo, estado = 200 } = {}) {
  const params = {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    tags: { name: nombre },
  };
  let r;
  if (cuerpo !== undefined) {
    params.headers['Content-Type'] = 'application/json';
    r = http.post(`${base}/api${ruta}`, JSON.stringify(cuerpo), params);
  } else {
    r = http.get(`${base}/api${ruta}`, params);
  }
  check(r, { [`${nombre} HTTP ${estado}`]: (res) => res.status === estado });
}

export function motor(tokens) {
  pedir('recalcular', '/sugerencias/recalcular', {
    token: tokens[__ENV.ACOPIO_CARGA_USUARIO],
    cuerpo: {},
  });
}

export default function carga(tokens) {
  const lectura = tokens[__ENV.ACOPIO_CARGA_USUARIO];
  const iteracion = scenario.iterationInTest;
  const destino = destinos[0];
  const acopio = `/acopios/${destino.acopio}`;
  const operaciones = [
    () => pedir('balance', '/publico/balance'),
    () => pedir('necesidades', '/publico/necesidades'),
    () => pedir('acopios', '/acopios'),
    () => pedir('zonas-necesidad', '/publico/zonas-necesidad'),
    () => pedir('saldos', `${acopio}/saldos`, { token: lectura }),
    () =>
      pedir('historial', `${acopio}/movimientos?categoriaId=${destino.categoria}`, {
        token: lectura,
      }),
  ];
  if (cursorHistorial) {
    operaciones.push(() =>
      pedir(
        'historial-profundo',
        `${acopio}/movimientos?categoriaId=${destino.categoria}&cursor=${encodeURIComponent(cursorHistorial)}`,
        { token: lectura },
      ),
    );
  }
  if (modoEscritura && iteracion % 2 === 1) {
    const salida =
      objetivo === 'mismo-par' ? destino : destinos[Math.floor(iteracion / 2) % destinos.length];
    pedir('entrada', `/acopios/${salida.acopio}/entradas`, {
      token: tokens[salida.usuario],
      cuerpo: { categoriaId: salida.categoria, cantidad: 1, venceEn: salida.venceEn },
      estado: 201,
    });
    return;
  }
  const vuelta = modoEscritura ? iteracion / 2 : iteracion;
  operaciones[vuelta % operaciones.length]();
}
