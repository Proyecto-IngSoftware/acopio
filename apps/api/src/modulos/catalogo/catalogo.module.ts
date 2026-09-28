import { Module } from '@nestjs/common';
import { CanastaService } from './canasta.service';
import { CatalogoController } from './catalogo.controller';
import { CategoriasService } from './categorias.service';
import { EmergenciasService } from './emergencias.service';

@Module({
  controllers: [CatalogoController],
  providers: [CategoriasService, CanastaService, EmergenciasService],
  exports: [CategoriasService, CanastaService],
})
export class CatalogoModule {}
