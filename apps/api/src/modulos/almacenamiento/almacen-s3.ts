import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Inject, Injectable } from '@nestjs/common';
import { ENTORNO, type Entorno } from '../../config/entorno';
import type { Almacen } from './almacen';

/** Garage por su API compatible con S3. El bucket es privado: solo URLs firmadas. */
@Injectable()
export class AlmacenS3 implements Almacen {
  private readonly cliente: S3Client;
  private readonly bucket: string;

  constructor(@Inject(ENTORNO) entorno: Entorno) {
    this.bucket = entorno.S3_BUCKET;
    this.cliente = new S3Client({
      endpoint: entorno.S3_ENDPOINT,
      region: entorno.S3_REGION,
      forcePathStyle: true,
      credentials: { accessKeyId: entorno.S3_ACCESS_KEY, secretAccessKey: entorno.S3_SECRET_KEY },
    });
  }

  async guardar(clave: string, datos: Buffer, tipo: string) {
    await this.cliente.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: clave, Body: datos, ContentType: tipo }),
    );
  }

  urlFirmada(clave: string, segundos: number) {
    return getSignedUrl(this.cliente, new GetObjectCommand({ Bucket: this.bucket, Key: clave }), {
      expiresIn: segundos,
    });
  }

  async borrar(clave: string) {
    await this.cliente.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: clave }));
  }
}
