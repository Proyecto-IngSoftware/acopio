/**
 * Prepara Garage por su API de administración (v2): capacidad del nodo, llave de la API y
 * bucket privado. Hace lo mismo que infra/garage/iniciar.sh sin `docker compose exec`, así
 * corre desde el contenedor de la API al arrancar (arrancar.sh), también donde no hay SSH.
 * Idempotente: lo que ya existe no se toca.
 */
export interface ConfigAlmacen {
  adminUrl: string;
  adminToken: string;
  llave: string;
  secreto: string;
  bucket: string;
  /** En bytes, como los cuenta Garage */
  capacidad: number;
}

const UNIDADES: Record<string, number> = { '': 1, K: 1e3, M: 1e6, G: 1e9, T: 1e12 };

/** «10G» → 10 000 000 000. Garage usa potencias de 1000. */
export function bytesDeCapacidad(texto: string): number {
  const m = /^(\d+)([KMGT]?)$/i.exec(texto.trim());
  const [, cifra = '', unidad = ''] = m ?? [];
  const factor = UNIDADES[unidad.toUpperCase()];
  if (!m || factor === undefined) {
    throw new Error(`GARAGE_CAPACIDAD no se entiende: «${texto}». Ejemplo: 10G`);
  }
  return Number(cifra) * factor;
}

export async function prepararAlmacen(
  config: ConfigAlmacen,
  pedir: typeof fetch = fetch,
): Promise<string[]> {
  async function garage<T>(
    ruta: string,
    opciones: { cuerpo?: unknown; ausente?: string } = {},
  ): Promise<T | null> {
    const r = await pedir(`${config.adminUrl}/v2/${ruta}`, {
      method: opciones.cuerpo === undefined ? 'GET' : 'POST',
      headers: {
        authorization: `Bearer ${config.adminToken}`,
        'content-type': 'application/json',
      },
      body: opciones.cuerpo === undefined ? undefined : JSON.stringify(opciones.cuerpo),
    });
    const texto = await r.text();
    if (r.status === 404 && opciones.ausente && texto.includes(opciones.ausente)) return null;
    if (!r.ok) {
      throw new Error(
        `Garage respondió ${r.status} a ${ruta.split('?')[0]}: ${texto.slice(0, 200)}`,
      );
    }
    return (texto ? JSON.parse(texto) : {}) as T;
  }

  const pasos: string[] = [];

  const estado = await garage<{ nodes: { id: string }[] }>('GetClusterStatus');
  const nodo = estado?.nodes[0]?.id;
  if (!nodo) throw new Error('Garage no informó ningún nodo');
  const layout = await garage<{ version: number; roles: { id: string }[] }>('GetClusterLayout');
  if (layout!.roles.some((r) => r.id === nodo)) {
    pasos.push('capacidad del nodo: ya asignada');
  } else {
    await garage('UpdateClusterLayout', {
      cuerpo: { roles: [{ id: nodo, zone: 'local', capacity: config.capacidad, tags: [] }] },
    });
    await garage('ApplyClusterLayout', { cuerpo: { version: layout!.version + 1 } });
    pasos.push('capacidad del nodo asignada');
  }

  const llave = await garage<{ secretAccessKey?: string }>(
    `GetKeyInfo?id=${encodeURIComponent(config.llave)}&showSecretKey=true`,
    { ausente: 'NoSuchAccessKey' },
  );
  if (llave && llave.secretAccessKey !== config.secreto) {
    // Sin el secreto correcto la API no puede firmar: mejor fallar que cambiarlo en silencio
    throw new Error(
      `La llave ${config.llave} ya existe en Garage con otro secreto. Revisa S3_SECRET_KEY ` +
        'o borra la llave en Garage.',
    );
  }
  if (llave) {
    pasos.push('llave de la API: ya existía');
  } else {
    await garage('ImportKey', {
      cuerpo: { accessKeyId: config.llave, secretAccessKey: config.secreto, name: 'acopio-api' },
    });
    pasos.push('llave de la API importada');
  }

  let bucket = await garage<{ id: string }>(
    `GetBucketInfo?globalAlias=${encodeURIComponent(config.bucket)}`,
    { ausente: 'NoSuchBucket' },
  );
  if (bucket) {
    pasos.push(`bucket ${config.bucket}: ya existía`);
  } else {
    bucket = await garage<{ id: string }>('CreateBucket', {
      cuerpo: { globalAlias: config.bucket },
    });
    pasos.push(`bucket ${config.bucket} creado`);
  }

  // Solo la llave de la API lee y escribe. El bucket no es público ni sirve sitio web
  await garage('AllowBucketKey', {
    cuerpo: {
      bucketId: bucket!.id,
      accessKeyId: config.llave,
      permissions: { read: true, write: true, owner: false },
    },
  });
  pasos.push('permisos de lectura y escritura para la llave de la API');
  return pasos;
}
