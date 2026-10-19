/** Un punto de acopio tal como lo publica una fuente externa (RF-RED-011). */
export interface PuntoFuente {
  fuenteId: string;
  nombre: string;
  direccion: string;
  lat: number;
  lng: number;
  /** El estado en el texto de la fuente: `abierto`, `cerrado`, `lleno`, `sin_info`… */
  estado: string;
  horario: string | null;
  necesidades: { nivel: string; texto: string }[];
  contacto: Record<string, string>;
  actualizadoEn: Date | null;
  verificado: boolean;
}

/** Otra plataforma que coordina ayuda, de la página de herramientas de la fuente. */
export interface PlataformaFuente {
  nombre: string;
  categoria: string;
  descripcion: string;
  url: string;
  orden: number;
}

export interface LecturaFuente {
  puntos: PuntoFuente[];
  plataformas: PlataformaFuente[];
}
