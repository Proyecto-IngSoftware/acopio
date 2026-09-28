import { Global, Module } from '@nestjs/common';
import { ENTORNO, type Entorno } from '../../config/entorno';
import { AlcanceService } from './autenticacion/alcance.service';
import { AutenticacionGuard } from './autenticacion/autenticacion.guard';
import { VerificadorToken } from './autenticacion/verificador-token';
import { InvitacionesController } from './invitaciones/invitaciones.controller';
import { InvitacionesService } from './invitaciones/invitaciones.service';
import { PROVEEDOR_IDENTIDAD } from './proveedor/proveedor-identidad';
import { ProveedorLocal } from './proveedor/proveedor-local';
import { ProveedorSupabase } from './proveedor/proveedor-supabase';
import { SesionController } from './sesion/sesion.controller';
import { SesionService } from './sesion/sesion.service';
import { UsuariosController } from './usuarios/usuarios.controller';
import { UsuariosService } from './usuarios/usuarios.service';

/** Autenticación, autorización, usuarios e invitaciones. Todos los módulos dependen de él. */
@Global()
@Module({
  controllers: [SesionController, InvitacionesController, UsuariosController],
  providers: [
    ProveedorLocal,
    ProveedorSupabase,
    {
      provide: PROVEEDOR_IDENTIDAD,
      inject: [ENTORNO, ProveedorLocal, ProveedorSupabase],
      useFactory: (e: Entorno, local: ProveedorLocal, supabase: ProveedorSupabase) =>
        e.AUTH_PROVEEDOR === 'local' ? local : supabase,
    },
    VerificadorToken,
    AlcanceService,
    SesionService,
    InvitacionesService,
    UsuariosService,
    AutenticacionGuard,
  ],
  exports: [AlcanceService, AutenticacionGuard, PROVEEDOR_IDENTIDAD],
})
export class IdentidadModule {}
