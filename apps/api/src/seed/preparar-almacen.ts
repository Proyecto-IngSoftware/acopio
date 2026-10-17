import { bytesDeCapacidad, prepararAlmacen } from './almacen';

/** `node dist/seed/preparar-almacen.js`, desde arrancar.sh con PREPARAR_ALMACEN_AL_ARRANCAR. */
async function principal(): Promise<void> {
  const v = process.env;
  const faltan = ['GARAGE_ADMIN_TOKEN', 'S3_ACCESS_KEY', 'S3_SECRET_KEY', 'S3_BUCKET'].filter(
    (n) => !v[n],
  );
  if (faltan.length) throw new Error(`Faltan variables para preparar Garage: ${faltan.join(', ')}`);

  const pasos = await prepararAlmacen({
    adminUrl: v.GARAGE_ADMIN_URL || 'http://storage:3903',
    adminToken: v.GARAGE_ADMIN_TOKEN!,
    llave: v.S3_ACCESS_KEY!,
    secreto: v.S3_SECRET_KEY!,
    bucket: v.S3_BUCKET!,
    capacidad: bytesDeCapacidad(v.GARAGE_CAPACIDAD || '10G'),
  });
  for (const paso of pasos) console.log(`almacén: ${paso}`);
}

principal().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
