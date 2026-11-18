import { parentPort, workerData } from 'node:worker_threads';
import { emparejar } from '@acopio/shared';

const { entrada, pesos, cantidadMinima } = workerData as {
  entrada: Parameters<typeof emparejar>[0];
  pesos: Parameters<typeof emparejar>[1];
  cantidadMinima: Parameters<typeof emparejar>[2];
};
parentPort!.postMessage(emparejar(entrada, pesos, cantidadMinima));
