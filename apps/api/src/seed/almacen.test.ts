import { bytesDeCapacidad, prepararAlmacen, type ConfigAlmacen } from './almacen';

const CONFIG: ConfigAlmacen = {
  adminUrl: 'http://storage:3903',
  adminToken: 'token-admin',
  llave: 'GK0123456789abcdef01234567',
  secreto: 'f'.repeat(64),
  bucket: 'comprobantes',
  capacidad: 10_000_000_000,
};

interface Rol {
  id: string;
  zone: string;
  capacity: number;
  tags: string[];
}

/** Garage de mentira: guarda el estado como la API de administración v2. */
function garageFalso(inicial?: {
  roles?: Rol[];
  llaves?: Record<string, string>;
  buckets?: string[];
}) {
  const estado = {
    version: inicial?.roles?.length ? 1 : 0,
    roles: inicial?.roles ?? [],
    preparados: [] as Rol[],
    llaves: { ...(inicial?.llaves ?? {}) },
    buckets: Object.fromEntries((inicial?.buckets ?? []).map((b) => [b, `id-${b}`])),
    permisos: [] as string[],
    escrituras: [] as string[],
    tokens: new Set<string>(),
  };
  const responder = (status: number, cuerpo: unknown) =>
    new Response(JSON.stringify(cuerpo), { status });

  const fetchFalso = async (url: string | URL, init?: RequestInit): Promise<Response> => {
    const u = new URL(String(url));
    const ruta = u.pathname.replace('/v2/', '');
    const auth = new Headers(init?.headers).get('authorization') ?? '';
    estado.tokens.add(auth);
    if (auth !== `Bearer ${CONFIG.adminToken}`) return responder(403, { code: 'Forbidden' });
    const cuerpo = init?.body ? JSON.parse(String(init.body)) : undefined;
    if ((init?.method ?? 'GET') === 'POST') estado.escrituras.push(ruta);
    switch (ruta) {
      case 'GetClusterStatus':
        return responder(200, { nodes: [{ id: 'nodo-1', isUp: true }] });
      case 'GetClusterLayout':
        return responder(200, { version: estado.version, roles: estado.roles });
      case 'UpdateClusterLayout':
        estado.preparados = cuerpo.roles;
        return responder(200, {});
      case 'ApplyClusterLayout':
        if (cuerpo.version !== estado.version + 1) return responder(400, { code: 'version' });
        estado.version = cuerpo.version;
        estado.roles = estado.preparados;
        return responder(200, {});
      case 'GetKeyInfo': {
        const secreto = estado.llaves[u.searchParams.get('id')!];
        if (!secreto) return responder(404, { code: 'NoSuchAccessKey' });
        const ver = u.searchParams.get('showSecretKey') === 'true';
        return responder(200, {
          accessKeyId: u.searchParams.get('id'),
          ...(ver && { secretAccessKey: secreto }),
        });
      }
      case 'ImportKey':
        estado.llaves[cuerpo.accessKeyId] = cuerpo.secretAccessKey;
        return responder(200, {});
      case 'GetBucketInfo': {
        const id = estado.buckets[u.searchParams.get('globalAlias')!];
        if (!id) return responder(404, { code: 'NoSuchBucket' });
        return responder(200, { id });
      }
      case 'CreateBucket':
        estado.buckets[cuerpo.globalAlias] = `id-${cuerpo.globalAlias}`;
        return responder(200, { id: `id-${cuerpo.globalAlias}` });
      case 'AllowBucketKey':
        estado.permisos.push(
          `${cuerpo.bucketId}:${cuerpo.accessKeyId}:${cuerpo.permissions.read}:${cuerpo.permissions.write}:${cuerpo.permissions.owner}`,
        );
        return responder(200, {});
      default:
        return responder(404, { code: 'NoSuchEndpoint' });
    }
  };
  return { estado, fetchFalso: fetchFalso as typeof fetch };
}

describe('prepararAlmacen', () => {
  it('en un Garage nuevo asigna la capacidad, importa la llave, crea el bucket y le da permisos', async () => {
    const { estado, fetchFalso } = garageFalso();
    const pasos = await prepararAlmacen(CONFIG, fetchFalso);

    expect(estado.roles).toEqual([
      { id: 'nodo-1', zone: 'local', capacity: 10_000_000_000, tags: [] },
    ]);
    expect(estado.version).toBe(1);
    expect(estado.llaves[CONFIG.llave]).toBe(CONFIG.secreto);
    expect(estado.buckets.comprobantes).toBe('id-comprobantes');
    expect(estado.permisos).toEqual([`id-comprobantes:${CONFIG.llave}:true:true:false`]);
    expect(pasos).toEqual([
      'capacidad del nodo asignada',
      'llave de la API importada',
      'bucket comprobantes creado',
      'permisos de lectura y escritura para la llave de la API',
    ]);
  });

  it('en un Garage ya preparado solo vuelve a dar los permisos', async () => {
    const { estado, fetchFalso } = garageFalso({
      roles: [{ id: 'nodo-1', zone: 'local', capacity: 1, tags: [] }],
      llaves: { [CONFIG.llave]: CONFIG.secreto },
      buckets: ['comprobantes'],
    });
    const pasos = await prepararAlmacen(CONFIG, fetchFalso);

    expect(estado.escrituras).toEqual(['AllowBucketKey']);
    expect(pasos).toEqual([
      'capacidad del nodo: ya asignada',
      'llave de la API: ya existía',
      'bucket comprobantes: ya existía',
      'permisos de lectura y escritura para la llave de la API',
    ]);
  });

  it('si la llave existe con otro secreto, falla diciendo cuál y no toca nada más', async () => {
    const { estado, fetchFalso } = garageFalso({
      roles: [{ id: 'nodo-1', zone: 'local', capacity: 1, tags: [] }],
      llaves: { [CONFIG.llave]: 'otro-secreto' },
    });
    await expect(prepararAlmacen(CONFIG, fetchFalso)).rejects.toThrow(
      `La llave ${CONFIG.llave} ya existe en Garage con otro secreto`,
    );
    expect(estado.escrituras).toEqual([]);
  });

  it('manda el token de administración en cada petición', async () => {
    const { estado, fetchFalso } = garageFalso();
    await prepararAlmacen(CONFIG, fetchFalso);
    expect([...estado.tokens]).toEqual([`Bearer ${CONFIG.adminToken}`]);
  });

  it('un token equivocado falla con el código y la ruta', async () => {
    const { fetchFalso } = garageFalso();
    await expect(prepararAlmacen({ ...CONFIG, adminToken: 'malo' }, fetchFalso)).rejects.toThrow(
      'Garage respondió 403 a GetClusterStatus',
    );
  });
});

describe('bytesDeCapacidad', () => {
  it.each([
    ['10G', 10_000_000_000],
    ['500M', 500_000_000],
    ['1T', 1_000_000_000_000],
    ['2048', 2048],
  ])('%s son %d bytes, como los cuenta Garage', (texto, bytes) => {
    expect(bytesDeCapacidad(texto)).toBe(bytes);
  });

  it('rechaza un valor que no entiende', () => {
    expect(() => bytesDeCapacidad('diez gigas')).toThrow('GARAGE_CAPACIDAD');
  });
});
