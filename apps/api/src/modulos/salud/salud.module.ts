import { Module } from '@nestjs/common';
import { SaludController } from './salud.controller';
import { SaludDao } from './salud.dao';

@Module({ controllers: [SaludController], providers: [SaludDao] })
export class SaludModule {}
