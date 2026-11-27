"""Gráfico del codo a partir de una corrida escalonada de scripts/carga-acopio.mjs.

Uso: python3 scripts/codo-carga.py <puntos.ndjson.gz> <escalones.json> <carpeta-de-salida>

Cada tramo cuyo objetivo repite el del tramo anterior es una meseta. Por meseta calcula el
rendimiento logrado, la latencia p50, p95 y p99, las fallas HTTP y las iteraciones que k6 no
pudo lanzar, y escribe codo.csv y codo.png.
"""

import csv
import gzip
import json
import sys
from datetime import datetime
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

ACENTO = "#0F6E6E"  # --accent de los diagramas de arquitectura
GRIS = "#5B6662"  # --muted
FONDO = "#F7F8F7"


def segundos(marca: str) -> float:
    return datetime.fromisoformat(marca.replace("Z", "+00:00")).timestamp()


def duracion(texto: str) -> float:
    return float(texto.rstrip("s"))


def percentil(valores: list[float], p: float) -> float:
    orden = sorted(valores)
    if not orden:
        return float("nan")
    i = (len(orden) - 1) * p
    bajo = int(i)
    alto = min(bajo + 1, len(orden) - 1)
    return orden[bajo] + (orden[alto] - orden[bajo]) * (i - bajo)


def main(puntos: Path, escalones_json: Path, salida: Path) -> None:
    escalones = json.loads(escalones_json.read_text())
    duraciones, peticiones, fallas, descartes = [], [], [], []
    with gzip.open(puntos, "rt") as f:
        for linea in f:
            p = json.loads(linea)
            if p.get("type") != "Point" or p["data"]["tags"].get("scenario") != "carga":
                continue
            t, v, m = segundos(p["data"]["time"]), p["data"]["value"], p["metric"]
            if m == "http_req_duration":
                duraciones.append((t, v))
            elif m == "http_reqs":
                peticiones.append(t)
            elif m == "http_req_failed" and v:
                fallas.append(t)
            elif m == "dropped_iterations":
                descartes.append((t, v))
    t0 = min(peticiones)

    filas, inicio, anterior = [], 0.0, None
    for e in escalones:
        fin = inicio + duracion(e["duration"])
        if e["target"] == anterior:
            a, b = t0 + inicio, t0 + fin
            lat = [v for t, v in duraciones if a <= t < b]
            filas.append(
                {
                    "ofrecidas_por_s": e["target"],
                    "logradas_por_s": round(sum(a <= t < b for t in peticiones) / (b - a), 1),
                    "p50_ms": round(percentil(lat, 0.50), 1),
                    "p95_ms": round(percentil(lat, 0.95), 1),
                    "p99_ms": round(percentil(lat, 0.99), 1),
                    "fallas_http": sum(a <= t < b for t in fallas),
                    "iteraciones_descartadas": int(sum(v for t, v in descartes if a <= t < b)),
                }
            )
        anterior, inicio = e["target"], fin

    salida.mkdir(parents=True, exist_ok=True)
    with open(salida / "codo.csv", "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(filas[0]))
        w.writeheader()
        w.writerows(filas)

    x = [f["ofrecidas_por_s"] for f in filas]
    fig, (lat_ax, ren_ax) = plt.subplots(1, 2, figsize=(11, 4.2), facecolor=FONDO)
    for ax in (lat_ax, ren_ax):
        ax.set_facecolor(FONDO)
        ax.grid(color="#D5DBD9", linewidth=0.6)
        ax.spines[["top", "right"]].set_visible(False)
        ax.set_xlabel("Carga ofrecida (peticiones por segundo)")

    lat_ax.plot(x, [f["p95_ms"] for f in filas], color=ACENTO, linewidth=2, marker="o", markersize=6, label="p95")
    lat_ax.plot(x, [f["p50_ms"] for f in filas], color=GRIS, linewidth=2, marker="s", markersize=5, label="p50")
    lat_ax.set_yscale("log")
    lat_ax.set_ylabel("Latencia (ms, escala log)")
    lat_ax.set_title("Latencia por escalón", loc="left", fontsize=11)
    lat_ax.legend(frameon=False)

    ren_ax.plot(x, x, color=GRIS, linewidth=1, linestyle="--", label="ideal: logradas = ofrecidas")
    ren_ax.plot(x, [f["logradas_por_s"] for f in filas], color=ACENTO, linewidth=2, marker="o", markersize=6, label="logradas")
    ren_ax.set_ylabel("Peticiones atendidas por segundo")
    ren_ax.set_title("Rendimiento por escalón", loc="left", fontsize=11)
    ren_ax.legend(frameon=False)

    fig.tight_layout()
    fig.savefig(salida / "codo.png", dpi=200, facecolor=FONDO)
    for f in filas:
        print(f)


if __name__ == "__main__":
    main(Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]))
