---
title: "ADR-0012 · Almacenamiento de objetos con Garage"
type: adr
tags: [arquitectura, adr, operacion]
estado: vigente
adr: 12
decision: aceptada
actualizado: 2026-09-28
---

# ADR-0012 · Almacenamiento de objetos con Garage

**Fecha:** 2026-09-28 · **Estado:** aceptada · **Modifica:** la fila «Almacenamiento
de archivos» de [ADR-0008](ADR-0008-arquitectura-stack-inicial.md)

## Contexto

ADR-0008 eligió MinIO para guardar facturas, evidencias de remisión, documentos de
verificación y logotipos. Entre 2025 y 2026 MinIO dejó de ser una opción libre y
mantenida ([P-027](../../01-requerimientos/pendientes.md)):

- Mayo de 2025: la edición comunitaria perdió la consola de administración
- Octubre de 2025: dejó de publicar binarios e imágenes de Docker
- Diciembre de 2025: pasó a mantenimiento, y en 2026 el repositorio se archivó

La empresa empuja hacia su edición comercial. Una pieza sin parches de seguridad no
puede guardar facturas con nombre, cédula y dirección (Ley 1581).

Lo que Acopio necesita del almacenamiento no cambió: buckets privados, acceso solo
por URL firmada de vida corta, archivos pequeños y pocos, un servidor de pruebas
compartido con la base y la API, los datos en nuestro servidor y la API de S3 para
poder cambiar de pieza sin reescribir.

## Decisión

**El almacenamiento de objetos es [Garage](https://garagehq.deuxfleurs.fr), en un
solo nodo, dentro del mismo Docker Compose.**

- Imagen `dxflrs/garage:v2.4.1`, configuración en `infra/garage/garage.toml`, secretos
  por variables de entorno
- Un bucket privado, `comprobantes`, con una sola llave con permiso de lectura y
  escritura: la de la API. `bun run almacenamiento:iniciar` lo prepara y es idempotente
- **El módulo `almacenamiento` se escribe contra la API de S3** con el SDK de AWS, sin
  nada propio de Garage. Cambiar de servidor es cambiar `S3_ENDPOINT` y las llaves
- Sigue sin exponerse: el navegador nunca habla con Garage. Todo archivo pasa por la
  API, que verifica el permiso y entrega una URL firmada de vida corta

**Verificado el 2026-09-28** contra Garage v2.4.1 con el SDK de AWS: la llave de la
API sube y lee; la URL firmada vigente responde 200; sin firma, 403; con otra llave,
403; con la URL vencida, 400.

## Alternativas consideradas

**SeaweedFS** (Apache 2.0). La más madura: desde 2012 y adoptada por Kubeflow en
lugar de MinIO. Tiene reglas de ciclo de vida más completas. Descartada por ahora: su
arquitectura (maestro, volúmenes, filer) resuelve escala que Acopio no tiene. **Es el
plan B** si la política de retención ([P-006](../../01-requerimientos/pendientes.md))
exige reglas que Garage no cubre; como la API habla S3, el cambio es de
configuración.

**RustFS** (Apache 2.0). Diseñada para reemplazar a MinIO, pero joven y con huecos de
compatibilidad. Descartada para datos personales mientras madura.

**Seguir con la copia congelada de MinIO en quay.io, o con un fork comunitario.**
Descartada: sin mantenimiento, o dependiente de una sola persona.

**Guardar los archivos en el disco, detrás de la API.** Un contenedor menos y el
respaldo es copiar un volumen. Descartada: pierde la API de S3 y con ella la
portabilidad que ADR-0008 pedía.

**Servicio en la nube** (Cloudflare R2, Backblaze B2, Supabase Storage). Descartada:
las facturas quedarían fuera del país y fuera de nuestro control, y contradice
[ADR-0001](ADR-0001-supabase-solo-auth.md), que deja Supabase solo para autenticación.

## Consecuencias

### A favor
- Software libre y mantenido, en producción en su propia organización desde 2020
- Liviano: un binario sin dependencias, desde 1 GB de RAM
- Cubre lo que se usa: buckets privados, URL firmadas y expiración de objetos
- La API queda atada a S3, no a un producto

### En contra
- **Garage no tiene versionado de objetos ni bloqueo contra borrado** (WORM), y sus
  reglas de ciclo de vida se limitan a la expiración. Si la retención de P-006 pide
  más, se pasa a SeaweedFS
- Licencia AGPLv3. No afecta: se usa sin modificarla, como servicio aparte
- **Una sola copia de los datos** (`replication_factor = 1`). La pérdida del disco la
  cubre el respaldo diario, que ahora se hace con `rclone` por la API de S3
- La primera vez hay que inicializarlo: asignar capacidad al nodo, importar la llave y
  crear el bucket. Lo hace el script, una vez por entorno
- Escucha solo en IPv4: las redes de Docker por defecto no traen IPv6, y Garage no
  arranca si intenta escuchar en `[::]`

### Efecto sobre otras decisiones
- ADR-0008: cambia solo la fila de almacenamiento. El resto sigue igual
- ADR-0001: donde dice «MinIO (contenedor) — todos los archivos», léase Garage
- Cierra [P-027](../../01-requerimientos/pendientes.md)
