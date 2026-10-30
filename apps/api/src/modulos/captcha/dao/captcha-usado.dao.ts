import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../comun/prisma/prisma.service';

/** Las pruebas de ALTCHA ya usadas (ADR-0024). */
@Injectable()
export class CaptchaUsadoDao {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Marca el nonce de un reto como usado y devuelve false si ya lo estaba. La llave primaria
   * hace el chequeo atómico, así que dos peticiones con la misma prueba no pasan las dos,
   * aunque lleguen a instancias distintas.
   */
  async marcar(nonce: string, expiraEn: Date): Promise<boolean> {
    const filas = await this.prisma.$executeRaw`
      INSERT INTO captcha_usado (nonce, expira_en) VALUES (${nonce}, ${expiraEn})
      ON CONFLICT (nonce) DO NOTHING`;
    return filas === 1;
  }

  /** Una prueba vencida ya no se acepta, así que no hace falta recordarla. */
  borrarVencidas() {
    return this.prisma.captchaUsado.deleteMany({ where: { expira_en: { lt: new Date() } } });
  }
}
