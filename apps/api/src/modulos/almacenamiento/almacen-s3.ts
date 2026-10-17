import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Inject, Injectable } from '@nestjs/common';
import { ENTORNO, type Entorno } from '../../config/entorno';
import type { Almacen } from './almacen';

/** Garage por su API compatible con S3. El bucket es privado: la API sirve los bytes (ADR-0017). */
@Injectable()
export class AlmacenS3 implements Almacen {
  private readonly cliente: S3Client;
  private readonly bucket: string;

  constructor(@Inject(ENTORNO) entorno: Entorno) {
    this.bucket = entorno.S3_BUCKET;
    this.cliente = new S3Client({
      region: entorno.S3_REGION,
      forcePathStyle: true,
      credentials: { accessKeyId: entorno.S3_ACCESS_KEY, secretAccessKey: entorno.S3_SECRET_KEY },
      endpoint: entorno.S3_ENDPOINT,
    });
  }

  async guardar(clave: string, datos: Buffer, tipo: string) {
    await this.cliente.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: clave, Body: datos, ContentType: tipo }),
    );
  }

  async borrar(clave: string) {
    await this.cliente.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: clave }));
  }

  async leer(clave: string) {
    const r = await this.cliente.send(new GetObjectCommand({ Bucket: this.bucket, Key: clave }));
    return {
      datos: Buffer.from(await r.Body!.transformToByteArray()),
      tipo: r.ContentType ?? 'application/octet-stream',
    };
  }
}
