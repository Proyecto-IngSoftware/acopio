import { Module } from '@nestjs/common';
import { CanastaService } from './canasta.service';
import { CatalogoController } from './catalogo.controller';
import { CodigosBarrasController } from './codigos-barras.controller';
import { CodigosBarrasService } from './codigos-barras.service';
import { CategoriasService } from './categorias.service';
import { CanastaDao } from './dao/canasta.dao';
import { EmergenciaDao } from './dao/emergencia.dao';
import { CategoriaDao } from './dao/categoria.dao';
import { CodigoBarrasDao } from './dao/codigo-barras.dao';
import { PresentacionDao } from './dao/presentacion.dao';
import { PresentacionesController } from './presentaciones.controller';
import { PresentacionesService } from './presentaciones.service';
import { EmergenciasService } from './emergencias.service';

@Module({
  controllers: [CatalogoController, CodigosBarrasController, PresentacionesController],
  providers: [
    CategoriaDao,
    CodigoBarrasDao,
    PresentacionDao,
    CanastaDao,
    EmergenciaDao,
    CategoriasService,
    CanastaService,
    EmergenciasService,
    CodigosBarrasService,
    PresentacionesService,
  ],
  exports: [
    CategoriaDao,
    CodigoBarrasDao,
    CategoriasService,
    CanastaService,
    PresentacionesService,
    CodigosBarrasService,
  ],
})
export class CatalogoModule {}
