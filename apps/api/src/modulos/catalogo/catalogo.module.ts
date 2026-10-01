import { Module } from '@nestjs/common';
import { CanastaService } from './canasta.service';
import { CatalogoController } from './catalogo.controller';
import { CodigosBarrasController } from './codigos-barras.controller';
import { CodigosBarrasService } from './codigos-barras.service';
import { CategoriasService } from './categorias.service';
import { EmergenciasService } from './emergencias.service';

@Module({
  controllers: [CatalogoController, CodigosBarrasController],
  providers: [CategoriasService, CanastaService, EmergenciasService, CodigosBarrasService],
  exports: [CategoriasService, CanastaService],
})
export class CatalogoModule {}
