import { z } from 'zod';

const esquema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    API_PUERTO: z.coerce.number().int().positive().default(3000),
    APP_URL: z.url(),

    DATABASE_URL: z.string().min(1),

    AUTH_PROVEEDOR: z.enum(['local', 'supabase']),
    SUPABASE_JWKS_URL: z.url(),
    AUTH_LLAVES_DIR: z.string().default('./.llaves'),
    SUPABASE_URL: z.string().optional(),
    SUPABASE_ANON_KEY: z.string().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

    SMTP_HOST: z.string().min(1),
    SMTP_PORT: z.coerce.number().int().positive(),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    SMTP_SEGURO: z.stringbool().default(false),
    CORREO_REMITENTE: z.string().min(1),
    // Geocodificación de direcciones (RF-RED-002)
    NOMINATIM_URL: z.url().default('https://nominatim.openstreetmap.org'),
    // Custodia (Bloque 3, C-10)
    PREPARADA_VIGENCIA_DIAS: z.coerce.number().int().positive().default(7),
    PREPARADAS_MAXIMO: z.coerce.number().int().positive().default(5),
    FACTURA_RETENCION_MESES: z.coerce.number().int().positive().default(12),
    // Almacenamiento de objetos (ADR-0012)
    S3_ENDPOINT: z.url(),
    // Host por el que el navegador alcanza el almacenamiento; firma las URL. Sin él, S3_ENDPOINT.
    S3_URL_PUBLICA: z.url().optional(),
    S3_REGION: z.string().min(1),
    S3_BUCKET: z.string().min(1),
    S3_ACCESS_KEY: z.string().min(1),
    S3_SECRET_KEY: z.string().min(1),
  })
  // P-025: el login local nunca llega a producción
  .refine((e) => !(e.NODE_ENV === 'production' && e.AUTH_PROVEEDOR === 'local'), {
    message: 'AUTH_PROVEEDOR=local no está permitido con NODE_ENV=production',
    path: ['AUTH_PROVEEDOR'],
  })
  .refine(
    (e) =>
      e.AUTH_PROVEEDOR === 'local' ||
      (e.SUPABASE_URL && e.SUPABASE_ANON_KEY && e.SUPABASE_SERVICE_ROLE_KEY),
    {
      message:
        'AUTH_PROVEEDOR=supabase exige SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY',
      path: ['AUTH_PROVEEDOR'],
    },
  );

export type Entorno = z.infer<typeof esquema>;

/** Valida el entorno al arrancar. Un error aquí detiene la API con un mensaje claro. */
export function leerEntorno(fuente: NodeJS.ProcessEnv = process.env): Entorno {
  const resultado = esquema.safeParse(fuente);
  if (!resultado.success) {
    const detalle = resultado.error.issues
      .map((i) => `  - ${i.path.join('.') || '(entorno)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Variables de entorno inválidas:\n${detalle}`);
  }
  return resultado.data;
}

export const ENTORNO = Symbol('ENTORNO');
