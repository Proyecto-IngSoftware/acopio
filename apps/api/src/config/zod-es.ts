import { z } from 'zod';

// Mensajes de validación en español (RNF-12). Se importa antes que cualquier esquema.
z.config(z.locales.es());
