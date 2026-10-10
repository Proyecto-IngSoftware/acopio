import { Global, Module } from '@nestjs/common';
import { ENTORNO } from '../../config/entorno';
import { UsuarioDao } from './dao/usuario.dao';
import { AlcanceService } from './autenticacion/alcance.service';
import { AutenticacionGuard } from './autenticacion/autenticacion.guard';
import { VerificadorToken } from './autenticacion/verificador-token';
import { DonadorController } from './donador/donador.controller';
import { DonadorService } from './donador/donador.service';
import { InvitacionesController } from './invitaciones/invitaciones.controller';
import { InvitacionesService } from './invitaciones/invitaciones.service';
import { fabricarProveedorIdentidad } from './proveedor/fabrica-proveedor';
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
  controllers: [SesionController, DonadorController, InvitacionesController, UsuariosController],
  providers: [
    UsuarioDao,
    ProveedorLocal,
    ProveedorSupabase,
    {
      provide: PROVEEDOR_IDENTIDAD,
      inject: [ENTORNO, ProveedorLocal, ProveedorSupabase],
      useFactory: fabricarProveedorIdentidad,
    },
    VerificadorToken,
    AlcanceService,
    SesionService,
    DonadorService,
    InvitacionesService,
    UsuariosService,
    AutenticacionGuard,
  ],
  exports: [UsuarioDao, AlcanceService, AutenticacionGuard, PROVEEDOR_IDENTIDAD],
})
export class IdentidadModule {}
