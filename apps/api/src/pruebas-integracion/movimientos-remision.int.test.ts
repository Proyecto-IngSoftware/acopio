import {
  ACOPIO_A,
  ADMIN,
  ZONA_A,
  crearAppPrueba,
  unico,
  type AppPrueba,
} from '../../test/app-prueba';
import type { UsuarioAutenticado } from '../comun/autorizacion/usuario-autenticado';
import { Transacciones } from '../comun/prisma/transacciones';
import { MovimientosService } from '../modulos/inventario/movimientos.service';

/** Los movimientos que pide una remisión (M-01, M-07): traslado, cancelación y recepción. */
describe('movimientos de una remisión', () => {
  let a: AppPrueba;
  let mov: MovimientosService;
  let tx: Transacciones;
  let admin: UsuarioAutenticado;
  let cat: string;
  let remisionId: string;
  const codigo = 'R-2026-TRSL2';

  beforeAll(async () => {
    a = await crearAppPrueba();
    mov = a.app.get(MovimientosService);
    tx = a.app.get(Transacciones);
    const u = await a.prisma.usuario.findFirstOrThrow({ where: { username: ADMIN.username } });
    admin = { id: u.id, username: u.username, nombre: u.nombre, rol: 'ADMIN' };
    cat = (
      await a.prisma.categoria.create({
        data: { nombre: unico('Traslado '), grupo: 'ALIMENTOS', unidad_base: 'KILOGRAMO' },
      })
    ).id;
    await a.prisma.movimiento.create({
      data: {
        acopio_id: ACOPIO_A,
        categoria_id: cat,
        tipo: 'ENTRADA',
        signo: 1,
        cantidad: 30,
        usuario_id: admin.id,
        ocurrido_en: new Date(),
      },
    });
    await a.prisma.remision.deleteMany({ where: { codigo } }).catch(() => undefined);
    remisionId = (
      await a.prisma.remision.create({
        data: {
          codigo,
          acopio_origen_id: ACOPIO_A,
          zona_destino_id: ZONA_A,
          qr_token: unico('qr'),
          creada_por: admin.id,
        },
      })
    ).id;
  });
  afterAll(() => a.cerrar());

  const saldo = async () =>
    Number(
      (
        await a.prisma.saldo.findUnique({
          where: { acopio_id_categoria_id: { acopio_id: ACOPIO_A, categoria_id: cat } },
        })
      )?.cantidad ?? 0,
    );

  it('la salida de traslado baja el saldo y lleva la remisión', async () => {
    const r = await tx.ejecutar((t) =>
      mov.salidaTrasladoEnTransaccion(t, admin, ACOPIO_A, {
        categoriaId: cat,
        cantidad: 12,
        remisionId,
        codigo,
      }),
    );
    expect(r.saldo).toBe(18);
    expect(r.fila.motivo_salida).toBe('TRASLADO');
    expect(r.fila.remision_id).toBe(remisionId);
    expect(r.fila.nota).toBe(`Remisión ${codigo}`);
  });

  it('no deja sacar más que el saldo', async () => {
    await expect(
      tx.ejecutar((t) =>
        mov.salidaTrasladoEnTransaccion(t, admin, ACOPIO_A, {
          categoriaId: cat,
          cantidad: 1000,
          remisionId,
          codigo,
        }),
      ),
    ).rejects.toMatchObject({ codigo: 'SALDO_INSUFICIENTE', estado: 409 });
    expect(await saldo()).toBe(18);
  });

  it('el ajuste de la cancelación devuelve el saldo con su motivo', async () => {
    const r = await tx.ejecutar((t) =>
      mov.ajusteCancelacionEnTransaccion(t, admin, ACOPIO_A, {
        categoriaId: cat,
        cantidad: 12,
        remisionId,
        codigo,
      }),
    );
    expect(r.fila).toMatchObject({ tipo: 'AJUSTE', signo: 1, remision_id: remisionId });
    expect(r.fila.motivo).toBe(`Cancelación de la remisión ${codigo}`);
    expect(await saldo()).toBe(30);
  });

  it('la recepción en zona no toca el saldo de ningún acopio', async () => {
    const antes = await saldo();
    const r = await tx.ejecutar((t) =>
      mov.registrarRecepcion(t, admin, ZONA_A, {
        categoriaId: cat,
        cantidad: 12,
        remisionId,
        ocurridoEn: new Date(),
      }),
    );
    expect(r.acopio_id).toBeNull();
    expect(r.zona_id).toBe(ZONA_A);
    expect(r.tipo).toBe('RECEPCION');
    expect(await saldo()).toBe(antes);
  });

  it('una categoría archivada con una remisión en camino se sigue recibiendo', async () => {
    await a.prisma.categoria.update({ where: { id: cat }, data: { archivada: true } });
    try {
      const r = await tx.ejecutar((t) =>
        mov.registrarRecepcion(t, admin, ZONA_A, {
          categoriaId: cat,
          cantidad: 1,
          remisionId,
          ocurridoEn: new Date(),
        }),
      );
      expect(r.tipo).toBe('RECEPCION');
    } finally {
      await a.prisma.categoria.update({ where: { id: cat }, data: { archivada: false } });
    }
  });
});
