import { Injectable } from '@nestjs/common';
import type { UsuarioAutenticado } from '../../comun/autorizacion/usuario-autenticado';
import type {
  RefUbicacion,
  VerificadorUbicaciones,
} from '../../comun/ubicaciones/verificador-ubicaciones';
import { AlcanceService } from '../identidad/autenticacion/alcance.service';
import { AcopioDao } from './dao/acopio.dao';
import { ZonaDao } from './dao/zona.dao';

export interface UbicacionVista {
  tipo: 'ACOPIO' | 'ZONA';
  id: string;
  nombre: string;
  municipio: string;
  estado: string;
}

/** Acopios y zonas vistos como ubicaciones asignables. Implementa el puerto de identidad. */
@Injectable()
export class UbicacionesService implements VerificadorUbicaciones {
  constructor(
    private readonly acopios: AcopioDao,
    private readonly zonas: ZonaDao,
    private readonly alcance: AlcanceService,
  ) {}

  async nombres(refs: RefUbicacion[]): Promise<(string | null)[]> {
    const ids = (tipo: RefUbicacion['tipo']) =>
      refs.filter((r) => r.tipo === tipo).map((r) => r.ubicacionId);
    const [acopios, zonas] = await Promise.all([
      this.acopios.nombres(ids('ACOPIO')),
      this.zonas.nombres(ids('ZONA')),
    ]);
    const clave = (tipo: string, id: string) => `${tipo}:${id}`;
    const nombre = new Map([
      ...acopios.map((u) => [clave('ACOPIO', u.id), u.nombre] as const),
      ...zonas.map((u) => [clave('ZONA', u.id), u.nombre] as const),
    ]);
    return refs.map((r) => nombre.get(clave(r.tipo, r.ubicacionId)) ?? null);
  }

  /** Acopios y zonas cuyo nombre contiene `q`, sin importar mayúsculas. Sin `q`, todos. */
  async buscar(q?: string): Promise<UbicacionVista[]> {
    const filtro = q ? { nombre: { contains: q.trim(), mode: 'insensitive' as const } } : {};
    const [acopios, zonas] = await Promise.all([
      this.acopios.buscar(filtro),
      this.zonas.buscar(filtro),
    ]);
    return [
      ...acopios.map((x) => ({
        tipo: 'ACOPIO' as const,
        id: x.id,
        nombre: x.nombre,
        municipio: x.municipio,
        estado: x.estado,
      })),
      ...zonas.map((x) => ({
        tipo: 'ZONA' as const,
        id: x.id,
        nombre: x.nombre,
        municipio: x.municipio,
        estado: x.estado,
      })),
    ];
  }

  /** Las del usuario, para el selector de la cabecera. El Administrador no tiene selector. */
  async mias(usuario: UsuarioAutenticado): Promise<UbicacionVista[]> {
    const [acopios, zonas] = await Promise.all([
      this.alcance.idsAsignados(usuario, 'ACOPIO'),
      this.alcance.idsAsignados(usuario, 'ZONA'),
    ]);
    if (acopios === null || zonas === null) return [];
    const todas = await this.buscar();
    return todas.filter((u) => (u.tipo === 'ACOPIO' ? acopios : zonas).includes(u.id));
  }
}
