import {
  ADMIN,
  crearAppPrueba,
  crearUsuarioActivo,
  iniciarSesion,
  type AppPrueba,
} from '../../test/app-prueba';
import { EmergenciasService } from '../modulos/catalogo/emergencias.service';

/** T11: catálogo, canasta y emergencias (RF-CAT-001, 002, 003, 005). */
describe('catálogo', () => {
  let a: AppPrueba;
  let tokenAdmin: string;
  const comoAdmin = () => ({ authorization: `Bearer ${tokenAdmin}` });

  beforeAll(async () => {
    a = await crearAppPrueba();
    tokenAdmin = await iniciarSesion(a, ADMIN.username, ADMIN.contrasena);
  });
  afterAll(() => a.cerrar());

  describe('búsqueda (RF-CAT-002)', () => {
    const buscar = (q: string) =>
      a
        .http()
        .get(`/api/categorias/buscar?q=${encodeURIComponent(q)}`)
        .set(comoAdmin())
        .expect(200);

    it.each([
      ['panal', 'Pañales de adulto'],
      ['aroz', 'Arroz'],
      ['JABON', 'Jabón de baño'],
      ['frijol', 'Granos secos'],
      ['cobija', 'Cobijas y sábanas'],
    ])('«%s» encuentra «%s»', async (q, esperado) => {
      const r = await buscar(q);
      expect((r.body as { nombre: string }[]).map((c) => c.nombre)).toContain(esperado);
    });

    it('«panal» encuentra «Pañal adulto» en los primeros resultados (criterio de RF-CAT-002)', async () => {
      const r = await buscar('panal adulto');
      expect(r.body[0].nombre).toBe('Pañales de adulto');
    });

    it('responde en menos de 100 ms con el catálogo completo', async () => {
      await buscar('calentamiento');
      const inicio = performance.now();
      await buscar('aroz');
      expect(performance.now() - inicio).toBeLessThan(100);
    });

    it('una palabra sin relación no devuelve nada', async () => {
      const r = await buscar('helicóptero');
      expect(r.body).toEqual([]);
    });
  });

  describe('categorías (RF-CAT-001)', () => {
    it('las categorías vigentes se leen sin sesión, para el filtro del mapa público', async () => {
      const r = await a.http().get('/api/categorias/vigentes').expect(200);
      const nombres = (r.body as { nombre: string; archivada: boolean }[]).map((c) => c.nombre);
      expect(nombres).toContain('Arroz');
      expect((r.body as { archivada: boolean }[]).every((c) => !c.archivada)).toBe(true);
      await a.http().get('/api/categorias').expect(401);
    });

    it('una categoría con canasta no se elimina; se archiva', async () => {
      const agua = (
        await a.prisma.categoria.findUniqueOrThrow({ where: { nombre: 'Agua potable' } })
      ).id;
      const r = await a.http().delete(`/api/categorias/${agua}`).set(comoAdmin()).expect(409);
      expect(r.body.codigo).toBe('CATEGORIA_EN_USO');
    });

    it('crear, archivar y dejar de verla en la búsqueda', async () => {
      const c = await a
        .http()
        .post('/api/categorias')
        .set(comoAdmin())
        .send({
          nombre: 'Velas',
          grupo: 'HERRAMIENTAS',
          unidadBase: 'UNIDAD',
          sinonimos: ['vela', 'cirio'],
        })
        .expect(201);
      expect(
        (await a.http().get('/api/categorias/buscar?q=cirio').set(comoAdmin())).body[0].nombre,
      ).toBe('Velas');
      await a.http().post(`/api/categorias/${c.body.id}/archivar`).set(comoAdmin()).expect(201);
      expect((await a.http().get('/api/categorias/buscar?q=cirio').set(comoAdmin())).body).toEqual(
        [],
      );
    });

    it('la unidad base no se puede cambiar', async () => {
      const agua = (
        await a.prisma.categoria.findUniqueOrThrow({ where: { nombre: 'Agua potable' } })
      ).id;
      const r = await a
        .http()
        .patch(`/api/categorias/${agua}`)
        .set(comoAdmin())
        .send({ unidadBase: 'KILOGRAMO' })
        .expect(200);
      expect(r.body.unidadBase).toBe('LITRO');
    });
  });

  describe('canasta (RF-CAT-003)', () => {
    it('la vigente tiene 10 categorías y cada una cita su fuente', async () => {
      const r = await a.http().get('/api/canasta').set(comoAdmin()).expect(200);
      expect(r.body).toHaveLength(10);
      for (const fila of r.body) expect(fila.fuente.length).toBeGreaterThan(10);
      expect(
        r.body.find((f: { categoria: string }) => f.categoria === 'Agua potable')
          .cantidadPersonaDia,
      ).toBe(15);
    });

    it('una versión nueva no reescribe la anterior', async () => {
      const agua = (
        await a.prisma.categoria.findUniqueOrThrow({ where: { nombre: 'Agua potable' } })
      ).id;
      await a
        .http()
        .post(`/api/categorias/${agua}/canasta`)
        .set(comoAdmin())
        .send({
          cantidadPersonaDia: 20,
          fuente: 'Prueba: norma ampliada',
          vigenteDesde: '2099-01-01',
        })
        .expect(201);
      const historial = await a
        .http()
        .get(`/api/categorias/${agua}/canasta`)
        .set(comoAdmin())
        .expect(200);
      expect(
        historial.body.map((h: { cantidadPersonaDia: number }) => h.cantidadPersonaDia),
      ).toEqual([20, 15]);
      // Hoy sigue vigente la de 15
      const vigente = await a.http().get('/api/canasta').set(comoAdmin());
      expect(
        vigente.body.find((f: { categoria: string }) => f.categoria === 'Agua potable')
          .cantidadPersonaDia,
      ).toBe(15);
    });

    it('sin fuente no se acepta', async () => {
      const agua = (
        await a.prisma.categoria.findUniqueOrThrow({ where: { nombre: 'Agua potable' } })
      ).id;
      await a
        .http()
        .post(`/api/categorias/${agua}/canasta`)
        .set(comoAdmin())
        .send({ cantidadPersonaDia: 3, fuente: '' })
        .expect(400);
    });
  });

  describe('emergencias (RF-CAT-005)', () => {
    it('al pasar destacada_hasta pasa sola a EN_SEGUIMIENTO; extenderla la devuelve a ACTIVA', async () => {
      const r = await a
        .http()
        .post('/api/emergencias')
        .set(comoAdmin())
        .send({
          nombre: 'Inundación de prueba',
          tipo: 'inundación',
          inicio: '2026-09-01',
          destacadaHasta: '2099-12-31',
        })
        .expect(201);
      expect(r.body.estado).toBe('ACTIVA');
      await a.prisma.emergencia.update({
        where: { id: r.body.id },
        data: { destacada_hasta: new Date('2026-09-02') },
      });
      expect(await a.app.get(EmergenciasService).pasarASeguimiento()).toBeGreaterThanOrEqual(1);
      expect(
        (await a.prisma.emergencia.findUniqueOrThrow({ where: { id: r.body.id } })).estado,
      ).toBe('EN_SEGUIMIENTO');
      const extendida = await a
        .http()
        .patch(`/api/emergencias/${r.body.id}`)
        .set(comoAdmin())
        .send({ destacadaHasta: '2099-12-31' })
        .expect(200);
      expect(extendida.body.estado).toBe('ACTIVA');
    });

    it('cerrarla exige motivo y la deja en solo lectura', async () => {
      const r = await a
        .http()
        .post('/api/emergencias')
        .set(comoAdmin())
        .send({
          nombre: 'Sismo de prueba',
          tipo: 'sismo',
          inicio: '2026-09-01',
          destacadaHasta: '2099-12-31',
        })
        .expect(201);
      await a
        .http()
        .post(`/api/emergencias/${r.body.id}/cerrar`)
        .set(comoAdmin())
        .send({ motivo: 'corto' })
        .expect(400);
      const cerrada = await a
        .http()
        .post(`/api/emergencias/${r.body.id}/cerrar`)
        .set(comoAdmin())
        .send({ motivo: 'Se atendió por completo la zona' })
        .expect(201);
      expect(cerrada.body).toMatchObject({
        estado: 'CERRADA',
        motivoCierre: 'Se atendió por completo la zona',
      });
      await a
        .http()
        .patch(`/api/emergencias/${r.body.id}`)
        .set(comoAdmin())
        .send({ nombre: 'Otro' })
        .expect(409);
    });

    it('las activas van primero', async () => {
      const r = await a.http().get('/api/emergencias').set(comoAdmin()).expect(200);
      const estados = (r.body as { estado: string }[]).map((e) => e.estado);
      expect(estados.indexOf('ACTIVA')).toBeLessThan(estados.lastIndexOf('CERRADA'));
    });

    it('cualquiera las lee sin sesión; crear sigue siendo del administrador', async () => {
      await a.http().get('/api/emergencias').expect(200);

      const nueva = {
        nombre: 'Sin permiso',
        tipo: 'sismo',
        inicio: '2026-09-01',
        destacadaHasta: '2099-12-31',
      };
      await a.http().post('/api/emergencias').send(nueva).expect(401);

      const operador = await crearUsuarioActivo(a, tokenAdmin, { rol: 'OPERADOR' });
      await a
        .http()
        .post('/api/emergencias')
        .set('authorization', `Bearer ${operador.token}`)
        .send(nueva)
        .expect(403);
    });
  });
});
