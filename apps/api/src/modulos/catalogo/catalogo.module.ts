import { Module } from '@nestjs/common';
import { CanastaService } from './canasta.service';
import { CatalogoController } from './catalogo.controller';
import { CodigosBarrasController } from './codigos-barras.controller';
import { CodigosBarrasService } from './codigos-barras.service';
import { CategoriasService } from './categorias.service';
import { CategoriaDao } from './dao/categoria.dao';
import { CodigoBarrasDao } from './dao/codigo-barras.dao';
import { EmergenciasService } from './emergencias.service';

@Module({
  controllers: [CatalogoController, CodigosBarrasController],
  providers: [
    CategoriaDao,
    CodigoBarrasDao,
    CategoriasService,
    CanastaService,
    EmergenciasService,
    CodigosBarrasService,
  ],
  exports: [CategoriaDao, CodigoBarrasDao, CategoriasService, CanastaService],
})
export class CatalogoModule {}
