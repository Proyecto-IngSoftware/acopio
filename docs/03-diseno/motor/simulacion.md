---
title: "Simulación del motor"
type: informe
tags: [motor, simulador, rf-mot-010]
estado: vigente
actualizado: 2026-10-10
---

# Simulación del motor

Informe que escribe `apps/api/src/scripts/simular.ts` (RF-MOT-010, M-08). La misma
semilla da siempre los mismos números. Para regenerarlo:

```bash
bun run --filter @acopio/api simular -- --semilla 42
```

## Escenario

Semilla 42: 50 zonas, 20 acopios,
40 categorías y 30 días. Cada día llegan entradas al
azar a los acopios, la mitad de las categorías es perecedera con vencimientos de 2 a 20
días, y la oferta total ronda la demanda. Cada estrategia reparte el mismo escenario; lo
que pasa su fecha en un acopio se cuenta como vencido.

## Resultado

| Estrategia | Cobertura promedio | Desviación de la cobertura entre zonas | Vencido sobre lo que entró |
|---|---|---|---|
| Motor (pesos por defecto) | 97,5 % | 0,0280 | 0,0 % |
| Partes iguales | 97,4 % | 0,0326 | 0,6 % |
| Al más cercano | 96,2 % | 0,0517 | 0,2 % |

Una desviación menor quiere decir que las zonas quedan atendidas de forma más pareja.
